package game

import "testing"

func TestSpecialActionAllowsOptionalTarget(t *testing.T) {
	for _, action := range []EngineAction{
		{Type: ActionSpecial},
		{Type: ActionSpecial, Target: &Axial{Q: 4, R: 0}},
		{Type: ActionSpecial, Destination: &Axial{Q: 3, R: 0}},
		{Type: ActionSpecial, Destination: &Axial{Q: 3, R: 0}, Target: &Axial{Q: 4, R: 0}},
	} {
		if err := action.Validate(); err != nil {
			t.Errorf("special %+v rejected: %v", action, err)
		}
	}
}
