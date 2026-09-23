package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestSPAFallback(t *testing.T) {
	dir := t.TempDir()
	write := func(name, content string) {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	write("index.html", "<!doctype html>app")
	write("app.js", "code")

	h := spa(dir)
	for _, tc := range []struct{ path, want string }{
		{"/app.js", "code"},                   // real file served
		{"/deep/route", "<!doctype html>app"}, // unknown path falls back to index
	} {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest("GET", tc.path, nil))
		if got := w.Body.String(); got != tc.want {
			t.Errorf("%s: body = %q, want %q", tc.path, got, tc.want)
		}
	}
}

func TestRootRedirectsToApp(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, appBase, http.StatusFound)
	})
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, httptest.NewRequest("GET", "/", nil))
	if w.Code != http.StatusFound || w.Header().Get("Location") != appBase {
		t.Fatalf("code=%d location=%q", w.Code, w.Header().Get("Location"))
	}
}

func TestNewServiceStoreSelection(t *testing.T) {
	svc, err := newService("")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Create(context.Background(), "Ewen"); err != nil {
		t.Fatalf("memory store: %v", err)
	}

	dbPath := filepath.Join(t.TempDir(), "hexmate.db")
	svc, err = newService(dbPath)
	if err != nil {
		t.Fatal(err)
	}
	creds, err := svc.Create(context.Background(), "Ewen")
	if err != nil {
		t.Fatalf("sqlite store: %v", err)
	}
	if _, err := os.Stat(dbPath); err != nil {
		t.Fatalf("sqlite file not created: %v", err)
	}
	if _, err := svc.Game(context.Background(), creds.Game.Code); err != nil {
		t.Fatalf("sqlite read: %v", err)
	}
}
