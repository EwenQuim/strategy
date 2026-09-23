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
				Side: game.Player, Action: map[string]any{"type": "endTurn"},
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
