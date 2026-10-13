package handlers_test

import (
	"net/http"
	"reflect"
	"testing"
)

func TestTargetlessJumpIsStoredInPublicSnapshot(t *testing.T) {
	ts := newTestServer(t)
	_, creator := do[credentialsResponse](t, ts, http.MethodPost, "/api/games", map[string]string{"name": "Ewen"})
	code := creator.Game.Code
	do[credentialsResponse](t, ts, http.MethodPost, "/api/games/"+code+"/join", map[string]string{"name": "Bob"})
	action := map[string]any{"type": "special", "destination": map[string]any{"q": float64(3), "r": float64(0)}}
	body := map[string]any{"token": creator.Token, "version": 0, "action": action, "winner": nil}
	status, played := do[playResponse](t, ts, http.MethodPost, "/api/games/"+code+"/actions", body)
	if status != http.StatusOK || played.Version != 1 {
		t.Fatalf("targetless jump: status=%d body=%+v", status, played)
	}
	status, snapshot := do[gameResponse](t, ts, http.MethodGet, "/api/games/"+code, nil)
	if status != http.StatusOK || snapshot.Version != 1 || len(snapshot.Actions) != 1 {
		t.Fatalf("snapshot: status=%d body=%+v", status, snapshot)
	}
	want := map[string]any{"side": "player", "action": action}
	if !reflect.DeepEqual(snapshot.Actions[0], want) {
		t.Fatalf("stored action = %+v, want %+v", snapshot.Actions[0], want)
	}
}
