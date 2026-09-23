package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestAPIHelloWorld(t *testing.T) {
	w := httptest.NewRecorder()
	apiHandler().ServeHTTP(w, httptest.NewRequest("GET", "/api", nil))
	if got := w.Body.String(); got != "hello world\n" {
		t.Fatalf("body = %q", got)
	}
}

func TestSPAFallback(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "index.html"), []byte("<!doctype html>app"), 0o644)
	os.WriteFile(filepath.Join(dir, "app.js"), []byte("code"), 0o644)

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
