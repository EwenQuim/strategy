package game

import (
	"errors"
	"fmt"
)

type ActionType string

const (
	ActionMove    ActionType = "move"
	ActionAttack  ActionType = "attack"
	ActionSpecial ActionType = "special"
	ActionEndTurn ActionType = "endTurn"

	// restart exists in the engine but a shared online game must never reset.
	ActionRestart ActionType = "restart"
)

type Axial struct {
	Q int `json:"q"`
	R int `json:"r"`
}

// EngineAction is the wire form of the client engine's action union: every
// variant is a flat JSON object tagged by "type".
type EngineAction struct {
	Type        ActionType `json:"type"`
	Q           *int       `json:"q,omitempty"`
	R           *int       `json:"r,omitempty"`
	Target      *Axial     `json:"target,omitempty"`
	Destination *Axial     `json:"destination,omitempty"`
}

var ErrInvalidAction = errors.New("invalid action")

func (a EngineAction) Validate() error {
	switch a.Type {
	case ActionMove, ActionAttack:
		if a.Q == nil || a.R == nil {
			return fmt.Errorf("%w: %s requires q and r", ErrInvalidAction, a.Type)
		}
	case ActionSpecial:
		if a.Destination != nil && a.Target == nil {
			return fmt.Errorf("%w: special with a destination requires a target", ErrInvalidAction)
		}
	case ActionEndTurn:
	default:
		return fmt.Errorf("%w: unsupported action type %q", ErrInvalidAction, a.Type)
	}
	return nil
}
