package main

import (
	"encoding/json"
	"log"
	"os"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/go-fuego/fuego"

	"hexmate/server/internal/httpapi"
	"hexmate/server/internal/memory"
	"hexmate/server/internal/service"
)

func main() {
	s := fuego.NewServer(
		fuego.WithoutStartupMessages(),
		fuego.WithoutLogger(),
		fuego.WithEngineOptions(
			fuego.WithOpenAPIConfig(fuego.OpenAPIConfig{
				DisableDefaultServer: true,
				DisableMessages:      true,
				DisableLocalSave:     true,
				DisableSwaggerUI:     true,
				PrettyFormatJSON:     true,
				Info: &openapi3.Info{
					Title:   "Hexmate online API",
					Version: "1.0.0",
				},
			}),
		),
	)
	httpapi.Register(s, service.New(memory.New()))
	data, err := json.MarshalIndent(s.OutputOpenAPISpec(), "", "  ")
	if err != nil {
		log.Fatal(err)
	}
	if err := os.MkdirAll("generated", 0o755); err != nil {
		log.Fatal(err)
	}
	if err := os.WriteFile("generated/openapi.json", append(data, '\n'), 0o644); err != nil {
		log.Fatal(err)
	}
}
