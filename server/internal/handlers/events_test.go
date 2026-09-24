package handlers_test

import (
	"bufio"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/go-fuego/fuego"

	"hexmate/server/internal/game"
	"hexmate/server/internal/handlers"
	"hexmate/server/internal/service"
	"hexmate/server/internal/sqlite"
)

func openEvents(t *testing.T, ts *httptest.Server, code string) (*http.Response, *bufio.Reader) {
	t.Helper()
	ctx, cancel := context.WithTimeout(t.Context(), 20*time.Second)
	t.Cleanup(cancel)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, ts.URL+"/api/games/"+code+"/events", nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Last-Event-ID", "0")
	res, err := ts.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = res.Body.Close() })
	if res.StatusCode != http.StatusOK || res.Header.Get("Content-Type") != "text/event-stream" || res.Header.Get("X-Accel-Buffering") != "no" || res.Header.Get("Cache-Control") != "no-cache, no-transform" {
		t.Fatalf("stream: status=%d headers=%v", res.StatusCode, res.Header)
	}
	return res, bufio.NewReader(res.Body)
}

func readEvent(t *testing.T, reader *bufio.Reader) string {
	t.Helper()
	var event strings.Builder
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			t.Fatal(err)
		}
		if line == "\n" {
			return event.String()
		}
		event.WriteString(line)
	}
}

func readSnapshot(t *testing.T, reader *bufio.Reader) gameResponse {
	t.Helper()
	event := readEvent(t, reader)
	if !strings.HasPrefix(event, "retry: 2000\ndata: ") || strings.Contains(strings.ToLower(event), "token") {
		t.Fatalf("invalid public snapshot: %s", event)
	}
	var g gameResponse
	if err := json.Unmarshal([]byte(strings.TrimPrefix(event, "retry: 2000\ndata: ")), &g); err != nil {
		t.Fatal(err)
	}
	return g
}

func TestGameEventsAcrossInstancesAndReconnect(t *testing.T) {
	path := filepath.Join(t.TempDir(), "game.db")
	first, err := sqlite.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = first.Close() })
	second, err := sqlite.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = second.Close() })
	writer := service.New(second)
	s := fuego.NewServer(fuego.WithoutStartupMessages(), fuego.WithoutLogger(), fuego.WithEngineOptions(
		fuego.WithOpenAPIConfig(fuego.OpenAPIConfig{Disabled: true}),
	))
	handlers.Register(s, service.New(first))
	ts := httptest.NewUnstartedServer(s.Mux)
	ts.Config.WriteTimeout = 100 * time.Millisecond
	ts.Start()
	t.Cleanup(ts.Close)

	_, creator := do[credentialsResponse](t, ts, http.MethodPost, "/api/games", map[string]string{"name": "Ewen"})
	res, stream := openEvents(t, ts, creator.Game.Code)
	if g := readSnapshot(t, stream); g.Status != "waiting" || g.Version != 0 {
		t.Fatalf("initial snapshot: %+v", g)
	}
	joiner, err := writer.Join(t.Context(), creator.Game.Code, "Bob")
	if err != nil {
		t.Fatal(err)
	}
	if g := readSnapshot(t, stream); g.Status != "active" || g.NameEnemy != "Bob" || g.Version != 0 {
		t.Fatalf("join without version change: %+v", g)
	}
	if _, err := writer.Play(t.Context(), creator.Game.Code, creator.Token, 0, game.EngineAction{Type: "endTurn"}, nil); err != nil {
		t.Fatal(err)
	}
	if g := readSnapshot(t, stream); g.Version != 1 || len(g.Actions) != 1 {
		t.Fatalf("move: %+v", g)
	}
	_ = res.Body.Close()
	winner := game.Enemy
	if _, err := writer.Play(t.Context(), creator.Game.Code, joiner.Token, 1, game.EngineAction{Type: "endTurn"}, &winner); err != nil {
		t.Fatal(err)
	}
	_, stream = openEvents(t, ts, creator.Game.Code)
	if g := readSnapshot(t, stream); g.Status != "finished" || g.Version != 2 || len(g.Actions) != 2 || g.Winner == nil || *g.Winner != "enemy" {
		t.Fatalf("reconnect must include missed moves and finish: %+v", g)
	}
}

func TestGameEventsHeartbeat(t *testing.T) {
	t.Parallel()
	ts := newTestServer(t)
	_, creator := do[credentialsResponse](t, ts, http.MethodPost, "/api/games", map[string]string{"name": "Ewen"})
	_, stream := openEvents(t, ts, creator.Game.Code)
	readSnapshot(t, stream)
	if event := readEvent(t, stream); event != "event: heartbeat\ndata: {}\n" {
		t.Fatalf("idle stream: %q", event)
	}
}

func TestGameEventsNotFound(t *testing.T) {
	ts := newTestServer(t)
	res, err := ts.Client().Get(ts.URL + "/api/games/NOPE99/events")
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = res.Body.Close() }()
	if res.StatusCode != http.StatusNotFound {
		t.Fatalf("unknown game: %d", res.StatusCode)
	}
}
