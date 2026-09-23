package game

import (
	"errors"
	"fmt"
)

type ActionType string

const (
	ActionMove            ActionType = "move"
	ActionAct             ActionType = "act"
	ActionAttackAt        ActionType = "attackAt"
	ActionSpecialAt       ActionType = "specialAt"
	ActionCancelTargeting ActionType = "cancelTargeting"
	ActionEndTurn         ActionType = "endTurn"

	// restart exists in the engine but a shared online game must never reset.
	ActionRestart ActionType = "restart"
)

type AttackKind string

const (
	AttackKindAttack  AttackKind = "attack"
	AttackKindSpecial AttackKind = "special"
)

// EngineAction is the wire form of the client engine's action union: every
// variant is a flat JSON object tagged by "type".
type EngineAction struct {
	Type   ActionType  `json:"type"`
	Action *AttackKind `json:"action,omitempty"`
	Q      *int        `json:"q,omitempty"`
	R      *int        `json:"r,omitempty"`
}

var ErrInvalidAction = errors.New("invalid action")

func (a EngineAction) Validate() error {
	switch a.Type {
	case ActionMove, ActionAttackAt, ActionSpecialAt:
		if a.Q == nil || a.R == nil {
			return fmt.Errorf("%w: %s requires q and r", ErrInvalidAction, a.Type)
		}
	case ActionAct:
		if a.Action == nil || (*a.Action != AttackKindAttack && *a.Action != AttackKindSpecial) {
			return fmt.Errorf("%w: act requires action attack or special", ErrInvalidAction)
		}
	case ActionCancelTargeting, ActionEndTurn:
	default:
		return fmt.Errorf("%w: unsupported action type %q", ErrInvalidAction, a.Type)
	}
	return nil
}
