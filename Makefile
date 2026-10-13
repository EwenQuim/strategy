.DEFAULT_GOAL := lint

NPM := npm --prefix client
GO := go -C server

.PHONY: onboarding installdeps dev format lint typecheck test test-integration build check docker run go-format go-lint go-test openapi sdk pvp bench-ai bench-commander bench-learned train-value retrain-value value-league value-optimize value-evidence bench-web record-campaign

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

bench-ai:
	$(NPM) run bench:ai -- $(ARGS)

bench-commander:
	$(NPM) run bench:commander

bench-learned:
	$(NPM) run bench:learned

train-value:
	$(NPM) run train:value

retrain-value:
	$(NPM) run retrain:value -- $(ARGS)

value-league:
	$(NPM) run value:league -- $(ARGS)

value-optimize:
	$(NPM) run value:optimize -- $(ARGS)

value-evidence:
	$(NPM) run value:evidence -- $(ARGS)

record-campaign:
	$(NPM) run record:campaign -- $(ARGS)

bench-web:
	$(NPM) run bench:web

build:
	$(NPM) run build

check:
	$(NPM) run test:ci

docker:
	docker build -t hexmate --build-arg VITE_GIT_COMMIT=$$(git rev-parse HEAD) .

pvp:
	docker compose --profile 2players up --build

run: build
	$(GO) run .
