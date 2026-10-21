package game

import (
	"errors"
	"time"
)

type Status string

// A public game only stays in the lobby listing while newer than this window,
// and the listing holds at most this many games.
const PublicLobbyWindow = time.Hour
const PublicLobbyLimit = 100

const (
	Waiting  Status = "waiting"
	Active   Status = "active"
	Finished Status = "finished"
)

type Side string

const (
	Player Side = "player"
	Enemy  Side = "enemy"
)

func ParseSide(value string) (Side, bool) {
	side := Side(value)
	if side == Player || side == Enemy {
		return side, true
	}
	return "", false
}

type Action struct {
	Side   Side         `json:"side"`
	Action EngineAction `json:"action"`
	Winner *Side        `json:"winner,omitempty"`
}

type Game struct {
	Code        string
	Seed        string
	NamePlayer  string
	NameEnemy   string
	TokenPlayer string
	TokenEnemy  string
	Roster      []string
	Public      bool
	Status      Status
	Winner      *Side
	Version     int
	Actions     []Action
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

var (
	ErrNotFound        = errors.New("game not found")
	ErrCodeTaken       = errors.New("game code already taken")
	ErrAlreadyJoined   = errors.New("game already has two players")
	ErrVersionConflict = errors.New("game state moved on")
	ErrNotStarted      = errors.New("game has not started")
	ErrFinished        = errors.New("game is finished")
	ErrNotParticipant  = errors.New("token is not a participant of this game")
)
