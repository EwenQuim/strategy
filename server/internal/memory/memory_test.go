package memory_test

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"hexmate/server/internal/game"
	"hexmate/server/internal/memory"
)

func TestConcurrentAppendOnlyOneVersionWins(t *testing.T) {
	store := memory.New()
	ctx := context.Background()
	if err := store.Create(ctx, game.Game{
		Code: "CONCUR", Seed: "seed", NamePlayer: "Ewen", TokenPlayer: "hash1",
		CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}); err != nil {
		t.Fatal(err)
	}
	if _, err := store.Join(ctx, "CONCUR", "Bob", "hash2"); err != nil {
		t.Fatal(err)
	}

	const racers = 8
	results := make(chan error, racers)
	start := make(chan struct{})
	var wg sync.WaitGroup
	for range racers {
		wg.Go(func() {
			<-start
			_, err := store.Append(ctx, "CONCUR", 0, game.Action{
				Side: game.Player, Action: game.EngineAction{Type: game.ActionEndTurn},
			})
			results <- err
		})
	}
	close(start)
	wg.Wait()
	close(results)

	conflicts := 0
	for err := range results {
		switch {
		case err == nil:
		case errors.Is(err, game.ErrVersionConflict):
			conflicts++
		default:
			t.Fatalf("unexpected append error: %v", err)
		}
	}
	if conflicts != racers-1 {
		t.Fatalf("conflicts = %d, want %d", conflicts, racers-1)
	}
}

func TestPublicWaitingOnlyListsRecentGames(t *testing.T) {
	store := memory.New()
	ctx := context.Background()
	now := time.Now()
	for _, g := range []game.Game{
		{Code: "FRESH1", Seed: "s", NamePlayer: "Ewen", TokenPlayer: "h1", Public: true, Status: game.Waiting, CreatedAt: now, UpdatedAt: now},
		{Code: "OLD123", Seed: "s", NamePlayer: "Bob", TokenPlayer: "h2", Public: true, Status: game.Waiting, CreatedAt: now.Add(-2 * game.PublicLobbyWindow), UpdatedAt: now},
		{Code: "PRIVA1", Seed: "s", NamePlayer: "Alice", TokenPlayer: "h3", Status: game.Waiting, CreatedAt: now, UpdatedAt: now},
	} {
		if err := store.Create(ctx, g); err != nil {
			t.Fatal(err)
		}
	}
	waiting, err := store.PublicWaiting(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(waiting) != 1 || waiting[0].Code != "FRESH1" {
		t.Fatalf("public waiting = %+v, want only FRESH1", waiting)
	}
}
