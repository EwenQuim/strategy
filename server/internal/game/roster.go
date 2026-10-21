package game

import (
	"fmt"
)

// The recruit kinds of the client engine; the king is owned by every army.
var recruitKinds = map[string]struct{}{
	"swordsman": {}, "archer": {}, "magician": {}, "ninja": {}, "bulwark": {},
	"bomber": {}, "hoplite": {}, "wolf": {}, "berserker": {}, "lancer": {},
}

// ValidateRoster accepts an absent roster (random army) or distinct recruit kinds.
func ValidateRoster(kinds []string) error {
	seen := make(map[string]struct{}, len(kinds))
	for _, kind := range kinds {
		if _, ok := recruitKinds[kind]; !ok {
			return fmt.Errorf("roster contains an unknown unit kind %q", kind)
		}
		if _, ok := seen[kind]; ok {
			return fmt.Errorf("roster must hold distinct units, %q twice", kind)
		}
		seen[kind] = struct{}{}
	}
	return nil
}
