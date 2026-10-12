package sqlite_test

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"hexmate/server/internal/game"
	"hexmate/server/internal/sqlite"
)

const legacyGamesSchema = `
CREATE TABLE games (
	code         TEXT PRIMARY KEY,
	seed         TEXT NOT NULL,
	name_player   TEXT NOT NULL CHECK (length(name_player) BETWEEN 1 AND 20),
	name_enemy    TEXT CHECK (name_enemy IS NULL OR length(name_enemy) BETWEEN 1 AND 20),
	token_player TEXT NOT NULL,
	token_enemy  TEXT,
	status       TEXT NOT NULL CHECK (status IN ('waiting', 'active', 'finished')),
	winner       TEXT CHECK (winner IS NULL OR winner IN ('player', 'enemy')),
	version      INTEGER NOT NULL CHECK (version >= 0),
	created_at   INTEGER NOT NULL,
	updated_at   INTEGER NOT NULL
) STRICT`

func TestLegacyDatabaseMigratesOnOpen(t *testing.T) {
	path := filepath.Join(t.TempDir(), "hexmate.db")
	db, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(legacyGamesSchema); err != nil {
		t.Fatal(err)
	}
	now := time.Now().Unix()
	if _, err := db.Exec(
		`INSERT INTO games (code, seed, name_player, token_player, status, version, created_at, updated_at)
		 VALUES ('LEGACY', 'seed', 'Ewen', 'hash', 'waiting', 0, ?, ?)`, now, now); err != nil {
		t.Fatal(err)
	}
	if err := db.Close(); err != nil {
		t.Fatal(err)
	}

	store, err := sqlite.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = store.Close() }()
	ctx := context.Background()
	legacy, err := store.Game(ctx, "LEGACY")
	if err != nil {
		t.Fatal(err)
	}
	if legacy.Public {
		t.Fatal("migrated legacy game is flagged public")
	}
	if err := store.Create(ctx, game.Game{
		Code: "PUBLC1", Seed: "s", NamePlayer: "Bob", TokenPlayer: "h", Public: true,
		Status: game.Waiting, CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}); err != nil {
		t.Fatal(err)
	}
	waiting, err := store.PublicWaiting(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(waiting) != 1 || waiting[0].Code != "PUBLC1" {
		t.Fatalf("public waiting after migration = %+v", waiting)
	}
}

func TestOpenFailsWhenMigrationCannotWrite(t *testing.T) {
	path := filepath.Join(t.TempDir(), "hexmate.db")
	db, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(legacyGamesSchema); err != nil {
		t.Fatal(err)
	}
	if err := db.Close(); err != nil {
		t.Fatal(err)
	}
	if err := os.Chmod(path, 0o444); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chmod(path, 0o600) })
	_, err = sqlite.Open(path)
	if err == nil {
		t.Fatal("want Open to fail when the database cannot be written")
	}
}

func TestGamePersistsAcrossReopen(t *testing.T) {
	path := filepath.Join(t.TempDir(), "hexmate.db")
	ctx := context.Background()
	code := "AB3F9K"

	func() {
		store, err := sqlite.Open(path)
		if err != nil {
			t.Fatal(err)
		}
		defer func() { _ = store.Close() }()
		created := game.Game{
			Code:        code,
			Seed:        "seed-1",
			NamePlayer:  "Ewen",
			TokenPlayer: "hash1",
			Status:      game.Waiting,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}
		if err := store.Create(ctx, created); err != nil {
			t.Fatal(err)
		}
		if err := store.Create(ctx, created); !errors.Is(err, game.ErrCodeTaken) {
			t.Fatalf("duplicate code: want ErrCodeTaken, got %v", err)
		}
		if _, err := store.Join(ctx, code, "Bob", "hash2"); err != nil {
			t.Fatal(err)
		}
		winner := game.Enemy
		q, r := 2, 0
		if _, err := store.Append(ctx, code, 0, game.Action{
			Side: game.Player, Action: game.EngineAction{Type: game.ActionEndTurn},
		}); err != nil {
			t.Fatal(err)
		}
		if _, err := store.Append(ctx, code, 1, game.Action{
			Side: game.Enemy, Action: game.EngineAction{Type: game.ActionAttack, Q: &q, R: &r}, Winner: &winner,
		}); err != nil {
			t.Fatal(err)
		}
	}()

	store, err := sqlite.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = store.Close() }()

	g, err := store.Game(ctx, code)
	if err != nil {
		t.Fatal(err)
	}
	if g.Status != game.Finished || g.Winner == nil || *g.Winner != game.Enemy {
		t.Fatalf("reopened game status=%s winner=%v", g.Status, g.Winner)
	}
	if g.NamePlayer != "Ewen" || g.NameEnemy != "Bob" {
		t.Fatalf("reopened names = %q / %q", g.NamePlayer, g.NameEnemy)
	}
	if g.Version != 2 || len(g.Actions) != 2 {
		t.Fatalf("reopened version=%d actions=%d", g.Version, len(g.Actions))
	}
	if g.Actions[1].Action.Type != game.ActionAttack || *g.Actions[1].Action.Q != 2 {
		t.Fatalf("action payload not round-tripped: %+v", g.Actions[1].Action)
	}
	if _, err := store.Game(ctx, "NOPE12"); !errors.Is(err, game.ErrNotFound) {
		t.Fatalf("want ErrNotFound, got %v", err)
	}
}

func TestConcurrentAppendOnlyOneVersionWins(t *testing.T) {
	store, err := sqlite.Open(filepath.Join(t.TempDir(), "hexmate.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = store.Close() }()
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
	g, err := store.Game(ctx, "CONCUR")
	if err != nil {
		t.Fatal(err)
	}
	if g.Version != 1 || len(g.Actions) != 1 {
		t.Fatalf("version=%d actions=%d, want 1 and 1", g.Version, len(g.Actions))
	}
}

func TestAppendAcrossTwoConnectionsYieldsVersionConflict(t *testing.T) {
	path := filepath.Join(t.TempDir(), "hexmate.db")
	ctx := context.Background()
	player1, err := sqlite.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = player1.Close() }()
	player2, err := sqlite.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = player2.Close() }()

	if err := player1.Create(ctx, game.Game{
		Code: "SHARE1", Seed: "seed", NamePlayer: "Ewen", TokenPlayer: "hash1",
		CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}); err != nil {
		t.Fatal(err)
	}
	if _, err := player2.Join(ctx, "SHARE1", "Bob", "hash2"); err != nil {
		t.Fatal(err)
	}
	move := game.Action{Side: game.Player, Action: game.EngineAction{Type: game.ActionEndTurn}}
	if _, err := player1.Append(ctx, "SHARE1", 0, move); err != nil {
		t.Fatal(err)
	}
	if _, err := player2.Append(ctx, "SHARE1", 0, move); !errors.Is(err, game.ErrVersionConflict) {
		t.Fatalf("stale append on second connection: want ErrVersionConflict, got %v", err)
	}
	g, err := player1.Game(ctx, "SHARE1")
	if err != nil {
		t.Fatal(err)
	}
	if g.Version != 1 || len(g.Actions) != 1 {
		t.Fatalf("version=%d actions=%d, want 1 and 1", g.Version, len(g.Actions))
	}
}

func TestPublicWaitingOnlyListsRecentGames(t *testing.T) {
	store, err := sqlite.Open(filepath.Join(t.TempDir(), "hexmate.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = store.Close() }()
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
