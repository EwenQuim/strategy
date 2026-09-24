package main

import (
	"compress/gzip"
	"context"
	"io"
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
		h.ServeHTTP(w, httptest.NewRequest(http.MethodGet, tc.path, nil))
		if got := w.Body.String(); got != tc.want {
			t.Errorf("%s: body = %q, want %q", tc.path, got, tc.want)
		}
	}
}

func TestSPAAssetCachingAndGzip(t *testing.T) {
	dir := t.TempDir()
	assets := filepath.Join(dir, "assets")
	if err := os.MkdirAll(assets, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(assets, "app-abc123.js"), []byte("code"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "index.html"), []byte("<!doctype html>app"), 0o644); err != nil {
		t.Fatal(err)
	}

	h := spa(dir)

	plain := httptest.NewRecorder()
	h.ServeHTTP(plain, httptest.NewRequest(http.MethodGet, "/assets/app-abc123.js", nil))
	if plain.Header().Get("Cache-Control") != hashedAssetCache {
		t.Errorf("hashed asset cache-control = %q, want %q", plain.Header().Get("Cache-Control"), hashedAssetCache)
	}
	if plain.Body.String() != "code" {
		t.Errorf("plain body = %q", plain.Body.String())
	}

	compressed := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/assets/app-abc123.js", nil)
	request.Header.Set("Accept-Encoding", "gzip")
	h.ServeHTTP(compressed, request)
	if compressed.Header().Get("Content-Encoding") != "gzip" {
		t.Errorf("content-encoding = %q", compressed.Header().Get("Content-Encoding"))
	}
	if compressed.Header().Get("Vary") != "Accept-Encoding" {
		t.Errorf("vary = %q", compressed.Header().Get("Vary"))
	}
	reader, err := gzip.NewReader(compressed.Body)
	if err != nil {
		t.Fatal(err)
	}
	body, err := io.ReadAll(reader)
	if err != nil {
		t.Fatal(err)
	}
	if string(body) != "code" {
		t.Errorf("gzipped body = %q", body)
	}

	fallback := httptest.NewRecorder()
	h.ServeHTTP(fallback, httptest.NewRequest(http.MethodGet, "/deep/route", nil))
	if fallback.Header().Get("Cache-Control") != "" {
		t.Errorf("fallback cache-control = %q, want none", fallback.Header().Get("Cache-Control"))
	}
	if fallback.Body.String() != "<!doctype html>app" {
		t.Errorf("fallback body = %q", fallback.Body.String())
	}
}

func TestRootRedirectsToApp(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, appBase, http.StatusFound)
	})
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/", nil))
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
