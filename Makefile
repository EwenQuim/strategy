.DEFAULT_GOAL := lint

NPM := npm --prefix client
GO := go -C server
BUBBLEWRAP := npx --yes @bubblewrap/cli
WEB_MANIFEST := https://ewen.quimerch.com/strategy/manifest.webmanifest

.PHONY: onboarding installdeps dev format lint typecheck test test-integration build check docker run go-format go-lint go-test openapi sdk pvp android-init android-build android-doctor

onboarding: installdeps

installdeps:
	$(NPM) install
	$(NPM) run prepare

dev:
	$(NPM) run dev

format: go-format
	$(NPM) run format

lint: typecheck go-lint
	$(NPM) run format:check
	$(NPM) run lint

typecheck:
	$(NPM) run typecheck

go-format:
	$(GO) fmt ./...

go-lint:
	cd server && golangci-lint run

go-test:
	$(GO) test ./...

openapi:
	$(GO) run ./cmd/specgen

sdk: openapi
	$(NPM) run sdk

test:
	$(NPM) test

test-integration:
	$(NPM) run test:integration

build:
	$(NPM) run build

check:
	$(NPM) run test:ci

docker:
	docker build -t hexmate --build-arg VITE_GIT_COMMIT=$$(git rev-parse HEAD) .

pvp:
	docker compose --profile 2players up --build

android-init:
	$(BUBBLEWRAP) init --manifest $(WEB_MANIFEST)

android-build:
	$(BUBBLEWRAP) build

android-doctor:
	$(BUBBLEWRAP) doctor

run: build
	$(GO) run .
