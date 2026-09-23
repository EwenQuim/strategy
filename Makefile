.DEFAULT_GOAL := lint

NPM := npm --prefix client
GO := go -C server

.PHONY: onboarding installdeps dev format lint typecheck test test-integration build check docker run go-format go-lint go-test openapi sdk

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

run: build
	$(GO) run .
