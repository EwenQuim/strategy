package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"math/big"
	"sync"
	"time"

	"hexmate/server/internal/game"
)

const codeAlphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
const tokenAlphabet = "0123456789abcdefghijklmnopqrstuvwxyz"

// Must stay in sync with SYMMETRIC_SEED_PREFIX in client/src/lib/engine/setup.ts.
const symmetricSeedPrefix = "sym-"

type Store interface {
	Create(ctx context.Context, g game.Game) error
	Game(ctx context.Context, code string) (game.Game, error)
	Join(ctx context.Context, code, name, tokenHash string) (game.Game, error)
	Append(ctx context.Context, code string, version int, action game.Action) (game.Game, error)
}

type Service struct {
	store       Store
	now         func() time.Time
	mu          sync.Mutex
	subscribers map[string]map[chan struct{}]struct{}
}

func New(store Store) *Service {
	return &Service{store: store, now: time.Now, subscribers: make(map[string]map[chan struct{}]struct{})}
}

type PlayerCredentials struct {
	Token string
	Side  game.Side
	Game  game.Game
}

func (s *Service) Create(ctx context.Context, name string) (PlayerCredentials, error) {
	token, err := randomString(32, tokenAlphabet)
	if err != nil {
		return PlayerCredentials{}, err
	}
	seed, err := randomString(21, tokenAlphabet)
	if err != nil {
		return PlayerCredentials{}, err
	}
	for {
		code, err := randomString(6, codeAlphabet)
		if err != nil {
			return PlayerCredentials{}, err
		}
		g := game.Game{
			Code:        code,
			Seed:        symmetricSeedPrefix + seed,
			NamePlayer:  name,
			TokenPlayer: hash(token),
			Status:      game.Waiting,
			CreatedAt:   s.now(),
			UpdatedAt:   s.now(),
		}
		err = s.store.Create(ctx, g)
		if errors.Is(err, game.ErrCodeTaken) {
			continue
		}
		if err != nil {
			return PlayerCredentials{}, err
		}
		return PlayerCredentials{Token: token, Side: game.Player, Game: g}, nil
	}
}

func (s *Service) Join(ctx context.Context, code, name string) (PlayerCredentials, error) {
	token, err := randomString(32, tokenAlphabet)
	if err != nil {
		return PlayerCredentials{}, err
	}
	g, err := s.store.Join(ctx, code, name, hash(token))
	if err != nil {
		return PlayerCredentials{}, err
	}
	s.notify(code)
	return PlayerCredentials{Token: token, Side: game.Enemy, Game: g}, nil
}

func (s *Service) Game(ctx context.Context, code string) (game.Game, error) {
	return s.store.Game(ctx, code)
}

func (s *Service) Play(ctx context.Context, code, token string, version int, action game.EngineAction, winner *game.Side) (game.Game, error) {
	g, err := s.store.Game(ctx, code)
	if err != nil {
		return game.Game{}, err
	}
	side, ok := participantSide(g, hash(token))
	if !ok {
		return game.Game{}, game.ErrNotParticipant
	}
	switch g.Status {
	case game.Waiting:
		return game.Game{}, game.ErrNotStarted
	case game.Finished:
		return game.Game{}, game.ErrFinished
	case game.Active:
	}
	if g.Version != version {
		return game.Game{}, game.ErrVersionConflict
	}
	g, err = s.store.Append(ctx, code, version, game.Action{Side: side, Action: action, Winner: winner})
	if err == nil {
		s.notify(code)
	}
	return g, err
}

func (s *Service) Subscribe(code string) (<-chan struct{}, func()) {
	s.mu.Lock()
	defer s.mu.Unlock()
	updates := make(chan struct{}, 1)
	if s.subscribers[code] == nil {
		s.subscribers[code] = make(map[chan struct{}]struct{})
	}
	s.subscribers[code][updates] = struct{}{}
	return updates, func() {
		s.mu.Lock()
		defer s.mu.Unlock()
		delete(s.subscribers[code], updates)
		if len(s.subscribers[code]) == 0 {
			delete(s.subscribers, code)
		}
	}
}

func (s *Service) notify(code string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for updates := range s.subscribers[code] {
		select {
		case updates <- struct{}{}:
		default:
		}
	}
}

func participantSide(g game.Game, tokenHash string) (game.Side, bool) {
	switch tokenHash {
	case g.TokenPlayer:
		return game.Player, true
	case g.TokenEnemy:
		return game.Enemy, true
	}
	return "", false
}

func hash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func randomString(n int, alphabet string) (string, error) {
	out := make([]byte, n)
	limit := big.NewInt(int64(len(alphabet)))
	for i := range out {
		v, err := rand.Int(rand.Reader, limit)
		if err != nil {
			return "", err
		}
		out[i] = alphabet[v.Int64()]
	}
	return string(out), nil
}
