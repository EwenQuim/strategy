package main

import (
	"cmp"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/go-fuego/fuego"

	"hexmate/server/internal/httpapi"
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
	httpapi.Register(s, svc)
	s.Mux.Handle("GET "+appBase, http.StripPrefix(appBase, spa(dist)))
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
