package memory

import (
	"context"
	"sync"
	"time"

	"hexmate/server/internal/game"
)

type Store struct {
	mu    sync.RWMutex
	games map[string]game.Game
}

func New() *Store {
	return &Store{games: map[string]game.Game{}}
}

func (s *Store) Create(_ context.Context, g game.Game) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.games[g.Code]; ok {
		return game.ErrCodeTaken
	}
	s.games[g.Code] = clone(g)
	return nil
}

func (s *Store) Game(_ context.Context, code string) (game.Game, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	g, ok := s.games[code]
	if !ok {
		return game.Game{}, game.ErrNotFound
	}
	return clone(g), nil
}

func (s *Store) Join(_ context.Context, code, name, tokenHash string) (game.Game, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	g, ok := s.games[code]
	if !ok {
		return game.Game{}, game.ErrNotFound
	}
	if g.TokenEnemy != "" {
		return game.Game{}, game.ErrAlreadyJoined
	}
	g.NameEnemy = name
	g.TokenEnemy = tokenHash
	g.Status = game.Active
	g.UpdatedAt = time.Now()
	s.games[code] = clone(g)
	return clone(g), nil
}

func (s *Store) Append(_ context.Context, code string, version int, action game.Action) (game.Game, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	g, ok := s.games[code]
	if !ok {
		return game.Game{}, game.ErrNotFound
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
	g.Actions = append(cloneActions(g.Actions), action)
	g.Version++
	if action.Winner != nil {
		g.Status = game.Finished
		g.Winner = action.Winner
	}
	g.UpdatedAt = time.Now()
	s.games[code] = clone(g)
	return clone(g), nil
}

func clone(g game.Game) game.Game {
	g.Actions = cloneActions(g.Actions)
	return g
}

func cloneActions(actions []game.Action) []game.Action {
	if actions == nil {
		return nil
	}
	out := make([]game.Action, len(actions))
	copy(out, actions)
	return out
}
