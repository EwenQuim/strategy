package main

import (
	"cmp"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path/filepath"
)

const appBase = "/strategy/"

func main() {
	addr := cmp.Or(os.Getenv("ADDR"), ":8080")
	dist := cmp.Or(os.Getenv("DIST"), "./dist")

	mux := http.NewServeMux()
	mux.Handle("GET /api", apiHandler())
	mux.Handle("GET /api/", apiHandler())
	mux.Handle("GET "+appBase, http.StripPrefix(appBase, spa(dist)))
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, appBase, http.StatusFound)
	})

	log.Printf("listening on %s (dist=%s)", addr, dist)
	log.Fatal(http.ListenAndServe(addr, mux))
}

// apiHandler proxies /api to the real backend when BACKEND_URL is set, and
// otherwise stands in for the not-yet-existent backend with a hello world.
func apiHandler() http.Handler {
	backend := os.Getenv("BACKEND_URL")
	if backend == "" {
		return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.Write([]byte("hello world\n"))
		})
	}
	target, err := url.Parse(backend)
	if err != nil {
		log.Fatalf("invalid BACKEND_URL %q: %v", backend, err)
	}
	return httputil.NewSingleHostReverseProxy(target)
}

// spa serves static files from dir, falling back to index.html for client-side routes.
func spa(dir string) http.Handler {
	files := http.FileServer(http.Dir(dir))
	index := filepath.Join(dir, "index.html")
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := filepath.Join(dir, filepath.Clean("/"+r.URL.Path))
		if info, err := os.Stat(path); err != nil || info.IsDir() {
			http.ServeFile(w, r, index)
			return
		}
		files.ServeHTTP(w, r)
	})
}
