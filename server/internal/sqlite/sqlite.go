package sqlite

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"time"

	_ "modernc.org/sqlite"

	"hexmate/server/internal/game"
)

const gamesSchema = `
CREATE TABLE IF NOT EXISTS games (
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

const actionsSchema = `
CREATE TABLE IF NOT EXISTS actions (
	game_code TEXT NOT NULL REFERENCES games(code),
	idx       INTEGER NOT NULL CHECK (idx >= 0),
	side      TEXT NOT NULL CHECK (side IN ('player', 'enemy')),
	payload   TEXT NOT NULL CHECK (payload LIKE '{%}'),
	winner    TEXT CHECK (winner IS NULL OR winner IN ('player', 'enemy')),
	PRIMARY KEY (game_code, idx)
) STRICT`

type Store struct {
	db *sql.DB
	mu sync.Mutex
}

func Open(path string) (*Store, error) {
	db, err := sql.Open("sqlite", path+"?_pragma=busy_timeout(5000)&_pragma=foreign_keys(1)")
	if err != nil {
		return nil, err
	}
	for _, schema := range []string{gamesSchema, actionsSchema} {
		if _, err := db.Exec(schema); err != nil {
			_ = db.Close()
			return nil, fmt.Errorf("create schema: %w", err)
		}
	}
	return &Store{db: db}, nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) Create(ctx context.Context, g game.Game) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	err := s.db.QueryRowContext(ctx, `SELECT 1 FROM games WHERE code = ?`, g.Code).Scan(new(int))
	if err == nil {
		return game.ErrCodeTaken
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	_, err = s.db.ExecContext(ctx,
		`INSERT INTO games (code, seed, name_player, token_player, status, version, created_at, updated_at)
		 VALUES (?, ?, ?, ?, 'waiting', 0, ?, ?)`,
		g.Code, g.Seed, g.NamePlayer, g.TokenPlayer, unix(g.CreatedAt), unix(g.UpdatedAt))
	return err
}

func (s *Store) Game(ctx context.Context, code string) (game.Game, error) {
	g, err := s.read(ctx, code)
	if err != nil {
		return game.Game{}, err
	}
	rows, err := s.db.QueryContext(ctx,
		`SELECT side, payload, winner FROM actions WHERE game_code = ? ORDER BY idx`, code)
	if err != nil {
		return game.Game{}, err
	}
	defer func() { _ = rows.Close() }()
	for rows.Next() {
		var a game.Action
		var payload string
		var winner sql.NullString
		if err := rows.Scan(&a.Side, &payload, &winner); err != nil {
			return game.Game{}, err
		}
		a.Action = map[string]any{}
		if err := json.Unmarshal([]byte(payload), &a.Action); err != nil {
			return game.Game{}, err
		}
		if winner.Valid {
			side := game.Side(winner.String)
			a.Winner = &side
		}
		g.Actions = append(g.Actions, a)
	}
	return g, rows.Err()
}

func (s *Store) Join(ctx context.Context, code, name, tokenHash string) (game.Game, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	g, err := s.read(ctx, code)
	if err != nil {
		return game.Game{}, err
	}
	if g.TokenEnemy != "" {
		return game.Game{}, game.ErrAlreadyJoined
	}
	_, err = s.db.ExecContext(ctx,
		`UPDATE games SET name_enemy = ?, token_enemy = ?, status = 'active', updated_at = ? WHERE code = ?`,
		name, tokenHash, unix(time.Now()), code)
	if err != nil {
		return game.Game{}, err
	}
	g.NameEnemy = name
	g.TokenEnemy = tokenHash
	g.Status = game.Active
	g.UpdatedAt = time.Now()
	return g, nil
}

func (s *Store) Append(ctx context.Context, code string, version int, action game.Action) (game.Game, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	g, err := s.read(ctx, code)
	if err != nil {
		return game.Game{}, err
	}
	switch g.Status {
	case game.Waiting:
		return game.Game{}, game.ErrNotStarted
	case game.Finished:
		return game.Game{}, game.ErrFinished
	}
	if g.Version != version {
		return game.Game{}, game.ErrVersionConflict
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return game.Game{}, err
	}
	defer func() { _ = tx.Rollback() }()

	var winner any
	status := g.Status
	if action.Winner != nil {
		winner = string(*action.Winner)
		status = game.Finished
	}
	payload, err := json.Marshal(action.Action)
	if err != nil {
		return game.Game{}, err
	}
	_, err = tx.ExecContext(ctx,
		`INSERT INTO actions (game_code, idx, side, payload, winner) VALUES (?, ?, ?, ?, ?)`,
		code, version, action.Side, string(payload), winner)
	if err != nil {
		return game.Game{}, err
	}
	_, err = tx.ExecContext(ctx,
		`UPDATE games SET version = version + 1, status = ?, winner = COALESCE(?, winner), updated_at = ? WHERE code = ?`,
		status, winner, unix(time.Now()), code)
	if err != nil {
		return game.Game{}, err
	}
	if err := tx.Commit(); err != nil {
		return game.Game{}, err
	}

	g.Version++
	g.Status = status
	if action.Winner != nil {
		g.Winner = action.Winner
	}
	g.UpdatedAt = time.Now()
	return g, nil
}

func (s *Store) read(ctx context.Context, code string) (game.Game, error) {
	var g game.Game
	var nameEnemy, tokenEnemy, winner sql.NullString
	var createdAt, updatedAt int64
	err := s.db.QueryRowContext(ctx,
		`SELECT code, seed, name_player, name_enemy, token_player, token_enemy, status, winner, version, created_at, updated_at
		 FROM games WHERE code = ?`, code).
		Scan(&g.Code, &g.Seed, &g.NamePlayer, &nameEnemy, &g.TokenPlayer, &tokenEnemy, &g.Status, &winner, &g.Version, &createdAt, &updatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return game.Game{}, game.ErrNotFound
	}
	if err != nil {
		return game.Game{}, err
	}
	g.NameEnemy = nameEnemy.String
	g.TokenEnemy = tokenEnemy.String
	if winner.Valid {
		side := game.Side(winner.String)
		g.Winner = &side
	}
	g.CreatedAt = time.Unix(createdAt, 0).UTC()
	g.UpdatedAt = time.Unix(updatedAt, 0).UTC()
	return g, nil
}

func unix(t time.Time) int64 { return t.Unix() }
