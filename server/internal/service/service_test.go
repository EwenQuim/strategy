package service_test

import (
	"context"
	"errors"
	"path/filepath"
	"strings"
	"testing"

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

			creds, err := svc.Create(ctx, "Ewen")
			if err != nil {
				t.Fatal(err)
			}
			if creds.Side != game.Player || creds.Token == "" {
				t.Fatalf("bad creator credentials: %+v", creds)
			}
			if creds.Game.Status != game.Waiting || creds.Game.Version != 0 {
				t.Fatalf("new game status=%s version=%d", creds.Game.Status, creds.Game.Version)
			}

			endTurn := game.EngineAction{Type: game.ActionEndTurn}
			if _, err := svc.Play(ctx, creds.Game.Code, creds.Token, 0, endTurn, nil); !errors.Is(err, game.ErrNotStarted) {
				t.Fatalf("want ErrNotStarted, got %v", err)
			}

			joined, err := svc.Join(ctx, creds.Game.Code, "Bob")
			if err != nil {
				t.Fatal(err)
			}
			if joined.Side != game.Enemy || joined.Token == creds.Token {
				t.Fatalf("bad joiner credentials: %+v", joined)
			}
			if _, err := svc.Join(ctx, creds.Game.Code, "Bob 2"); !errors.Is(err, game.ErrAlreadyJoined) {
				t.Fatalf("want ErrAlreadyJoined, got %v", err)
			}

			if _, err := svc.Play(ctx, creds.Game.Code, "wrong-token", 0, endTurn, nil); !errors.Is(err, game.ErrNotParticipant) {
				t.Fatalf("want ErrNotParticipant, got %v", err)
			}

			g, err := svc.Play(ctx, creds.Game.Code, creds.Token, 0, endTurn, nil)
			if err != nil {
				t.Fatal(err)
			}
			if g.Version != 1 {
				t.Fatalf("version after play = %d", g.Version)
			}
			if _, err := svc.Play(ctx, creds.Game.Code, creds.Token, 0, endTurn, nil); !errors.Is(err, game.ErrVersionConflict) {
				t.Fatalf("want ErrVersionConflict, got %v", err)
			}

			winner := game.Enemy
			g, err = svc.Play(ctx, creds.Game.Code, joined.Token, 1, endTurn, &winner)
			if err != nil {
				t.Fatal(err)
			}
			if g.Status != game.Finished || g.Winner == nil || *g.Winner != game.Enemy {
				t.Fatalf("finished game status=%s winner=%v", g.Status, g.Winner)
			}
			if _, err := svc.Play(ctx, creds.Game.Code, creds.Token, 2, endTurn, nil); !errors.Is(err, game.ErrFinished) {
				t.Fatalf("want ErrFinished, got %v", err)
			}

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

	creds, err := svc.Create(ctx, "Ewen")
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
	if creds.Game.Seed == "" {
		t.Fatal("seed is empty")
	}
}

func TestNameValidation(t *testing.T) {
	store, cleanup := stores()["memory"](t)
	defer cleanup()
	svc := service.New(store)

	if _, err := svc.Create(context.Background(), ""); err == nil {
		t.Fatal("empty name accepted")
	}
	if _, err := svc.Create(context.Background(), "  \t"); err == nil {
		t.Fatal("blank name accepted")
	}
	if _, err := svc.Create(context.Background(), strings.Repeat("x", 21)); err == nil {
		t.Fatal("21-character name accepted")
	}
	creds, err := svc.Create(context.Background(), "  padded  ")
	if err != nil {
		t.Fatal(err)
	}
	if creds.Game.NamePlayer != "padded" {
		t.Fatalf("name not trimmed: %q", creds.Game.NamePlayer)
	}
}

func TestInvalidActions(t *testing.T) {
	store, cleanup := stores()["memory"](t)
	defer cleanup()
	ctx := context.Background()
	svc := service.New(store)
	creds, err := svc.Create(ctx, "Ewen")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Join(ctx, creds.Game.Code, "Bob"); err != nil {
		t.Fatal(err)
	}

	intPtr := func(v int) *int { return &v }
	for _, action := range []game.EngineAction{
		{Type: "jump"},
		{Type: game.ActionRestart},
		{Type: game.ActionMove},
		{Type: game.ActionMove, Q: intPtr(0)},
		{Type: game.ActionAttackAt, R: intPtr(0)},
		{Type: game.ActionAct},
		{Type: game.ActionAct, Action: new(game.AttackKind)},
	} {
		if _, err := svc.Play(ctx, creds.Game.Code, creds.Token, 0, action, nil); !errors.Is(err, game.ErrInvalidAction) {
			t.Errorf("%s: want ErrInvalidAction, got %v", action.Type, err)
		}
	}

	move := game.EngineAction{Type: game.ActionMove, Q: intPtr(0), R: intPtr(0)}
	if _, err := svc.Play(ctx, creds.Game.Code, creds.Token, 0, move, nil); err != nil {
		t.Fatalf("valid move rejected: %v", err)
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
