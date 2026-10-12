package service_test

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"hexmate/server/internal/game"
	"hexmate/server/internal/memory"
	"hexmate/server/internal/service"
	"hexmate/server/internal/sqlite"
)

func TestGameLifecycle(t *testing.T) {
	for name, newStore := range stores() {
		t.Run(name, func(t *testing.T) {
			store, cleanup := newStore(t)
			defer cleanup()
			ctx := context.Background()
			svc := service.New(store)

			creds, err := svc.Create(ctx, "Ewen", false)
			if err != nil {
				t.Fatal(err)
			}
			if creds.Side != game.Player || creds.Token == "" {
				t.Fatalf("bad creator credentials: %+v", creds)
			}
			if creds.Game.Status != game.Waiting || creds.Game.Version != 0 {
				t.Fatalf("new game status=%s version=%d", creds.Game.Status, creds.Game.Version)
			}

			updates, unsubscribe := svc.Subscribe(creds.Game.Code)
			defer unsubscribe()
			checkUpdate := func(want bool) {
				t.Helper()
				select {
				case <-updates:
					if !want {
						t.Fatal("rejected write notified subscribers")
					}
				default:
					if want {
						t.Fatal("committed write did not notify subscribers")
					}
				}
			}

			endTurn := game.EngineAction{Type: game.ActionEndTurn}
			if _, err := svc.Play(ctx, creds.Game.Code, creds.Token, 0, endTurn, nil); !errors.Is(err, game.ErrNotStarted) {
				t.Fatalf("want ErrNotStarted, got %v", err)
			}

			checkUpdate(false)

			joined, err := svc.Join(ctx, creds.Game.Code, "Bob")
			if err != nil {
				t.Fatal(err)
			}
			if joined.Side != game.Enemy || joined.Token == creds.Token {
				t.Fatalf("bad joiner credentials: %+v", joined)
			}
			checkUpdate(true)
			if _, err := svc.Join(ctx, creds.Game.Code, "Bob 2"); !errors.Is(err, game.ErrAlreadyJoined) {
				t.Fatalf("want ErrAlreadyJoined, got %v", err)
			}

			if _, err := svc.Play(ctx, creds.Game.Code, "wrong-token", 0, endTurn, nil); !errors.Is(err, game.ErrNotParticipant) {
				t.Fatalf("want ErrNotParticipant, got %v", err)
			}

			checkUpdate(false)

			g, err := svc.Play(ctx, creds.Game.Code, creds.Token, 0, endTurn, nil)
			if err != nil {
				t.Fatal(err)
			}
			if g.Version != 1 {
				t.Fatalf("version after play = %d", g.Version)
			}
			checkUpdate(true)
			if _, err := svc.Play(ctx, creds.Game.Code, creds.Token, 0, endTurn, nil); !errors.Is(err, game.ErrVersionConflict) {
				t.Fatalf("want ErrVersionConflict, got %v", err)
			}

			checkUpdate(false)

			winner := game.Enemy
			g, err = svc.Play(ctx, creds.Game.Code, joined.Token, 1, endTurn, &winner)
			if err != nil {
				t.Fatal(err)
			}
			if g.Status != game.Finished || g.Winner == nil || *g.Winner != game.Enemy {
				t.Fatalf("finished game status=%s winner=%v", g.Status, g.Winner)
			}
			checkUpdate(true)
			if _, err := svc.Play(ctx, creds.Game.Code, creds.Token, 2, endTurn, nil); !errors.Is(err, game.ErrFinished) {
				t.Fatalf("want ErrFinished, got %v", err)
			}

			checkUpdate(false)

			g, err = svc.Game(ctx, creds.Game.Code)
			if err != nil {
				t.Fatal(err)
			}
			if len(g.Actions) != 2 {
				t.Fatalf("actions = %d, want 2", len(g.Actions))
			}
			if g.NamePlayer != "Ewen" || g.NameEnemy != "Bob" {
				t.Fatalf("names = %q / %q", g.NamePlayer, g.NameEnemy)
			}
		})
	}
}

func TestCredentialsAreHashedAndWellFormed(t *testing.T) {
	store, cleanup := stores()["memory"](t)
	defer cleanup()
	ctx := context.Background()
	svc := service.New(store)

	creds, err := svc.Create(ctx, "Ewen", false)
	if err != nil {
		t.Fatal(err)
	}
	g, err := svc.Game(ctx, creds.Game.Code)
	if err != nil {
		t.Fatal(err)
	}
	if g.TokenPlayer == creds.Token {
		t.Fatal("plaintext token stored")
	}
	if len(g.TokenPlayer) != 64 {
		t.Fatalf("token hash length = %d, want sha256 hex", len(g.TokenPlayer))
	}
	if len(creds.Game.Code) != 6 {
		t.Fatalf("code = %q, want 6 characters", creds.Game.Code)
	}
	for _, c := range creds.Game.Code {
		if !strings.ContainsRune("23456789ABCDEFGHJKMNPQRSTUVWXYZ", c) {
			t.Fatalf("code %q contains ambiguous character %q", creds.Game.Code, c)
		}
	}
	if !strings.HasPrefix(creds.Game.Seed, "sym-") {
		t.Fatalf("seed = %q, want sym- prefix for a fair mirrored field", creds.Game.Seed)
	}
}

func TestUnknownGame(t *testing.T) {
	store, cleanup := stores()["memory"](t)
	defer cleanup()
	ctx := context.Background()
	svc := service.New(store)

	if _, err := svc.Game(ctx, "NOPE12"); !errors.Is(err, game.ErrNotFound) {
		t.Fatalf("want ErrNotFound, got %v", err)
	}
	if _, err := svc.Join(ctx, "NOPE12", "Bob"); !errors.Is(err, game.ErrNotFound) {
		t.Fatalf("want ErrNotFound, got %v", err)
	}
}

func TestPublicWaitingListing(t *testing.T) {
	for name, newStore := range stores() {
		t.Run(name, func(t *testing.T) {
			store, cleanup := newStore(t)
			defer cleanup()
			ctx := context.Background()
			svc := service.New(store)

			private, err := svc.Create(ctx, "Ewen", false)
			if err != nil {
				t.Fatal(err)
			}
			public, err := svc.Create(ctx, "Bob", true)
			if err != nil {
				t.Fatal(err)
			}

			waiting, err := svc.PublicWaiting(ctx)
			if err != nil {
				t.Fatal(err)
			}
			if len(waiting) != 1 || waiting[0].Code != public.Game.Code || waiting[0].NamePlayer != "Bob" {
				t.Fatalf("public waiting = %+v, want only Bob's game", waiting)
			}

			if _, err := svc.Join(ctx, public.Game.Code, "Alice"); err != nil {
				t.Fatal(err)
			}
			waiting, err = svc.PublicWaiting(ctx)
			if err != nil {
				t.Fatal(err)
			}
			if len(waiting) != 0 {
				t.Fatalf("public waiting = %+v, want empty once joined", waiting)
			}

			g, err := svc.Game(ctx, private.Game.Code)
			if err != nil {
				t.Fatal(err)
			}
			if g.Public {
				t.Fatal("private game is flagged public")
			}
			g, err = svc.Game(ctx, public.Game.Code)
			if err != nil {
				t.Fatal(err)
			}
			if !g.Public {
				t.Fatal("public game is not flagged public")
			}
		})
	}
}

func TestPublicWaitingLimit(t *testing.T) {
	for name, newStore := range stores() {
		t.Run(name, func(t *testing.T) {
			store, cleanup := newStore(t)
			defer cleanup()
			ctx := context.Background()
			now := time.Now()
			const created = game.PublicLobbyLimit + 5
			for i := range created {
				g := game.Game{
					Code: fmt.Sprintf("PUB%03d", i), Seed: "s", NamePlayer: "Ewen",
					TokenPlayer: "h", Public: true, Status: game.Waiting,
					CreatedAt: now.Add(time.Duration(i) * time.Second), UpdatedAt: now,
				}
				if err := store.Create(ctx, g); err != nil {
					t.Fatal(err)
				}
			}
			waiting, err := store.PublicWaiting(ctx)
			if err != nil {
				t.Fatal(err)
			}
			if len(waiting) != game.PublicLobbyLimit {
				t.Fatalf("public waiting = %d games, want %d", len(waiting), game.PublicLobbyLimit)
			}
			for i, g := range waiting {
				if want := fmt.Sprintf("PUB%03d", created-1-i); g.Code != want {
					t.Fatalf("public waiting[%d] = %s, want %s (newest first)", i, g.Code, want)
				}
			}
		})
	}
}

func stores() map[string]func(*testing.T) (service.Store, func()) {
	return map[string]func(*testing.T) (service.Store, func()){
		"memory": func(*testing.T) (service.Store, func()) {
			return memory.New(), func() {}
		},
		"sqlite": func(t *testing.T) (service.Store, func()) {
			s, err := sqlite.Open(filepath.Join(t.TempDir(), "test.db"))
			if err != nil {
				t.Fatal(err)
			}
			return s, func() { _ = s.Close() }
		},
	}
}
