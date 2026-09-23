package httpapi_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-fuego/fuego"

	"hexmate/server/internal/httpapi"
	"hexmate/server/internal/memory"
	"hexmate/server/internal/service"
)

type gameResponse struct {
	Code       string           `json:"code"`
	Status     string           `json:"status"`
	Version    int              `json:"version"`
	Seed       string           `json:"seed"`
	NamePlayer string           `json:"namePlayer"`
	NameEnemy  string           `json:"nameEnemy"`
	Winner     *string          `json:"winner"`
	Actions    []map[string]any `json:"actions"`
}

type credentialsResponse struct {
	Token string       `json:"token"`
	Side  string       `json:"side"`
	Game  gameResponse `json:"game"`
}

type playResponse struct {
	Version int `json:"version"`
}

func newTestServer(t *testing.T) *httptest.Server {
	t.Helper()
	s := fuego.NewServer(fuego.WithoutStartupMessages(), fuego.WithoutLogger(), fuego.WithEngineOptions(
		fuego.WithOpenAPIConfig(fuego.OpenAPIConfig{Disabled: true}),
	))
	httpapi.Register(s, service.New(memory.New()))
	ts := httptest.NewServer(s.Mux)
	t.Cleanup(ts.Close)
	return ts
}

func do[Res any](t *testing.T, ts *httptest.Server, method, path string, body any) (int, Res) {
	t.Helper()
	var reader *bytes.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			t.Fatal(err)
		}
		reader = bytes.NewReader(data)
	} else {
		reader = bytes.NewReader(nil)
	}
	req, err := http.NewRequest(method, ts.URL+path, reader)
	if err != nil {
		t.Fatal(err)
	}
	res, err := ts.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = res.Body.Close() }()
	var out Res
	if res.StatusCode != http.StatusNoContent {
		if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
			t.Fatalf("%s %s: decode response: %v", method, path, err)
		}
	}
	return res.StatusCode, out
}

func TestOnlineGameFlow(t *testing.T) {
	ts := newTestServer(t)

	status, creator := do[credentialsResponse](t, ts, http.MethodPost, "/api/games", map[string]string{"name": " Ewen "})
	if status != http.StatusCreated || creator.Side != "player" || creator.Token == "" {
		t.Fatalf("create: status=%d body=%+v", status, creator)
	}
	if creator.Game.NamePlayer != "Ewen" || creator.Game.Status != "waiting" {
		t.Fatalf("create: game=%+v", creator.Game)
	}
	code := creator.Game.Code
	if len(code) != 6 {
		t.Fatalf("code = %q", code)
	}

	if status, _ := do[any](t, ts, http.MethodGet, "/api/games/NOPE99", nil); status != http.StatusNotFound {
		t.Fatalf("get unknown: status=%d", status)
	}
	if status, _ := do[credentialsResponse](t, ts, http.MethodPost, "/api/games/NOPE99/join", map[string]string{"name": "Bob"}); status != http.StatusNotFound {
		t.Fatalf("join unknown: status=%d", status)
	}

	status, waiting := do[gameResponse](t, ts, http.MethodGet, "/api/games/"+code, nil)
	if status != http.StatusOK || waiting.Status != "waiting" || waiting.NameEnemy != "" || waiting.Actions != nil {
		t.Fatalf("waiting game: status=%d body=%+v", status, waiting)
	}

	status, joiner := do[credentialsResponse](t, ts, http.MethodPost, fmt.Sprintf("/api/games/%s/join", code), map[string]string{"name": "Bob"})
	if status != http.StatusOK || joiner.Side != "enemy" || joiner.Token == "" {
		t.Fatalf("join: status=%d body=%+v", status, joiner)
	}
	if status, _ := do[credentialsResponse](t, ts, http.MethodPost, fmt.Sprintf("/api/games/%s/join", code), map[string]string{"name": "Bob 2"}); status != http.StatusConflict {
		t.Fatalf("double join: status=%d", status)
	}

	status, g := do[gameResponse](t, ts, http.MethodGet, "/api/games/"+code, nil)
	if status != http.StatusOK || g.Status != "active" || g.Version != 0 || g.NameEnemy != "Bob" {
		t.Fatalf("get after join: status=%d body=%+v", status, g)
	}

	endTurn := map[string]any{"type": "endTurn"}
	play := func(token string, version int, action map[string]any, winner *string) (int, playResponse) {
		body := map[string]any{"token": token, "version": version, "action": action}
		if winner != nil {
			body["winner"] = *winner
		}
		return do[playResponse](t, ts, http.MethodPost, fmt.Sprintf("/api/games/%s/actions", code), body)
	}

	if status, res := play("wrong", 0, endTurn, nil); status != http.StatusUnauthorized {
		_ = res
		t.Fatalf("play with bad token: status=%d", status)
	}
	if status, res := play(creator.Token, 0, endTurn, nil); status != http.StatusOK || res.Version != 1 {
		t.Fatalf("play: status=%d body=%+v", status, res)
	}
	if status, _ := play(creator.Token, 0, endTurn, nil); status != http.StatusConflict {
		t.Fatalf("stale version: status=%d", status)
	}

	winner := "enemy"
	if status, res := play(joiner.Token, 1, endTurn, &winner); status != http.StatusOK || res.Version != 2 {
		t.Fatalf("winning play: status=%d body=%+v", status, res)
	}
	status, g = do[gameResponse](t, ts, http.MethodGet, "/api/games/"+code, nil)
	if status != http.StatusOK || g.Status != "finished" || g.Winner == nil || *g.Winner != "enemy" || len(g.Actions) != 2 {
		t.Fatalf("get finished: status=%d body=%+v", status, g)
	}
	if status, _ := play(creator.Token, 2, endTurn, nil); status != http.StatusUnprocessableEntity {
		t.Fatalf("play after finish: status=%d", status)
	}
}

func TestCreateNameValidation(t *testing.T) {
	ts := newTestServer(t)
	for _, name := range []string{"", "   ", "0123456789012345678901"} {
		status, res := do[credentialsResponse](t, ts, http.MethodPost, "/api/games", map[string]string{"name": name})
		if status != http.StatusBadRequest {
			t.Fatalf("name %q: status=%d body=%+v", name, status, res)
		}
	}
}
