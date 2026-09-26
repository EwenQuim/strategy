package main

import (
	"cmp"
	"compress/gzip"
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/go-fuego/fuego"

	"hexmate/server/internal/handlers"
	"hexmate/server/internal/memory"
	"hexmate/server/internal/service"
	"hexmate/server/internal/sqlite"
)

const appBase = "/strategy/"

func main() {
	addr := cmp.Or(os.Getenv("ADDR"), ":8080")
	dist := cmp.Or(os.Getenv("DIST"), "../client/dist")
	dbPath := os.Getenv("DB_PATH")

	svc, err := newService(dbPath)
	if err != nil {
		log.Fatal(err)
	}

	s := fuego.NewServer(
		fuego.WithAddr(addr),
		fuego.WithoutStartupMessages(),
		fuego.WithEngineOptions(
			fuego.WithOpenAPIConfig(fuego.OpenAPIConfig{
				DisableDefaultServer: true,
				DisableLocalSave:     true,
				DisableSwaggerUI:     true,
				Info:                 &openapi3.Info{Title: "Hexmate online API", Version: "1.0.0"},
			}),
		),
	)
	handlers.Register(s, svc)
	s.Mux.Handle("GET "+appBase, http.StripPrefix(appBase, spa(dist)))
	s.Mux.HandleFunc("GET /.well-known/assetlinks.json", assetlinks(dist))
	s.Mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, appBase, http.StatusFound)
	})

	log.Printf("listening on %s (dist=%s, db=%s)", addr, dist, cmp.Or(dbPath, "memory"))
	log.Fatal(s.Run())
}

func newService(dbPath string) (*service.Service, error) {
	if dbPath == "" {
		return service.New(memory.New()), nil
	}
	store, err := sqlite.Open(dbPath)
	if err != nil {
		return nil, err
	}
	return service.New(store), nil
}

// assetlinks serves the Digital Asset Links statement that binds the Play Store app to this origin.
func assetlinks(dist string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join(dist, ".well-known", "assetlinks.json"))
	}
}

const hashedAssetCache = "public, max-age=2592000, immutable"

// spa serves static files from dir, falling back to index.html for client-side routes.
// Hashed build assets get a month of immutable caching and gzip compression.
func spa(dir string) http.Handler {
	files := http.FileServer(http.Dir(dir))
	index := filepath.Join(dir, "index.html")
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := filepath.Join(dir, filepath.Clean("/"+r.URL.Path))
		if info, err := os.Stat(path); err != nil || info.IsDir() {
			http.ServeFile(w, r, index)
			return
		}
		if !strings.HasPrefix(strings.TrimPrefix(r.URL.Path, "/"), "assets/") {
			files.ServeHTTP(w, r)
			return
		}
		w.Header().Set("Cache-Control", hashedAssetCache)
		if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			files.ServeHTTP(w, r)
			return
		}
		w.Header().Set("Content-Encoding", "gzip")
		w.Header().Add("Vary", "Accept-Encoding")
		if contentType := mime.TypeByExtension(filepath.Ext(path)); contentType != "" {
			w.Header().Set("Content-Type", contentType)
		}
		gz := gzip.NewWriter(w)
		defer func() { _ = gz.Close() }()
		files.ServeHTTP(gzipResponseWriter{w, gz}, r)
	})
}

type gzipResponseWriter struct {
	http.ResponseWriter
	gz *gzip.Writer
}

func (w gzipResponseWriter) Write(b []byte) (int, error) {
	return w.gz.Write(b)
}

func (w gzipResponseWriter) WriteHeader(status int) {
	w.ResponseWriter.Header().Del("Content-Length")
	w.ResponseWriter.WriteHeader(status)
}
