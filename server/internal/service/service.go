package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"math/big"
	"strings"
	"time"
	"unicode/utf8"

	"hexmate/server/internal/game"
)

const codeAlphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
const tokenAlphabet = "0123456789abcdefghijklmnopqrstuvwxyz"

type Store interface {
	Create(ctx context.Context, g game.Game) error
	Game(ctx context.Context, code string) (game.Game, error)
	Join(ctx context.Context, code, name, tokenHash string) (game.Game, error)
	Append(ctx context.Context, code string, version int, action game.Action) (game.Game, error)
}

type Service struct {
	store Store
	now   func() time.Time
}

func New(store Store) *Service {
	return &Service{store: store, now: time.Now}
}

type PlayerCredentials struct {
	Token string
	Side  game.Side
	Game  game.Game
}

func (s *Service) Create(ctx context.Context, name string) (PlayerCredentials, error) {
	name, err := validName(name)
	if err != nil {
		return PlayerCredentials{}, err
	}
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
			Seed:        seed,
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
	name, err := validName(name)
	if err != nil {
		return PlayerCredentials{}, err
	}
	token, err := randomString(32, tokenAlphabet)
	if err != nil {
		return PlayerCredentials{}, err
	}
	g, err := s.store.Join(ctx, code, name, hash(token))
	if err != nil {
		return PlayerCredentials{}, err
	}
	return PlayerCredentials{Token: token, Side: game.Enemy, Game: g}, nil
}

func (s *Service) Game(ctx context.Context, code string) (game.Game, error) {
	return s.store.Game(ctx, code)
}

func (s *Service) Play(ctx context.Context, code, token string, version int, action map[string]any, winner *game.Side) (game.Game, error) {
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
	}
	if g.Version != version {
		return game.Game{}, game.ErrVersionConflict
	}
	return s.store.Append(ctx, code, version, game.Action{Side: side, Action: action, Winner: winner})
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

func validName(name string) (string, error) {
	name = strings.TrimSpace(name)
	if n := utf8.RuneCountInString(name); n < 1 || n > 20 {
		return "", errors.New("name must be 1 to 20 characters")
	}
	return name, nil
}

func randomString(n int, alphabet string) (string, error) {
	out := make([]byte, n)
	max := big.NewInt(int64(len(alphabet)))
	for i := range out {
		v, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", err
		}
		out[i] = alphabet[v.Int64()]
	}
	return string(out), nil
}
