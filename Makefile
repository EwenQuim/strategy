.DEFAULT_GOAL := lint

NPM := npm --prefix client
GO := go -C server
BUBBLEWRAP := npx --yes @bubblewrap/cli
WEB_MANIFEST := https://strategy.glenan.quimerch.com/strategy/manifest.webmanifest
ANDROID_KEYS_DIR := $(HOME)/Developer/keys/hexmate-android

.PHONY: onboarding installdeps dev format lint typecheck test test-integration build check docker run go-format go-lint go-test openapi sdk pvp bench-ai bench-napoleon bench-hannibal train-value retrain-value bench-web bench-gameplay record-campaign android-init android-build android-doctor

onboarding: installdeps

installdeps:
	$(NPM) ci
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

bench-napoleon:
	$(NPM) run bench:napoleon

bench-hannibal:
	$(NPM) run bench:hannibal

train-value:
	$(NPM) run train:value

retrain-value:
	$(NPM) run retrain:value -- $(ARGS)

record-campaign:
	$(NPM) run record:campaign -- $(ARGS)

bench-web:
	$(NPM) run bench:web

bench-gameplay:
	$(NPM) run bench:gameplay -- $(ARGS)

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
	mkdir -p $(ANDROID_KEYS_DIR)
	if [ -f android.keystore ]; then mv android.keystore $(ANDROID_KEYS_DIR)/hexmate-upload.keystore; ln -s $(ANDROID_KEYS_DIR)/hexmate-upload.keystore android.keystore; fi
	perl -0pi -e 's/("signingKey":\s*\{[^{}]*?"path":\s*)"[^"]*"/$$1"android.keystore"/' twa-manifest.json
	cp twa-manifest.json $(ANDROID_KEYS_DIR)/twa-manifest.json
	ln -s $(ANDROID_KEYS_DIR)/hexmate-upload.keystore android.keystore

android-build:
	if [ ! -f twa-manifest.json ]; then cp $(ANDROID_KEYS_DIR)/twa-manifest.json .; fi
	if [ ! -e android.keystore ]; then ln -s $(ANDROID_KEYS_DIR)/hexmate-upload.keystore android.keystore; fi
	$(BUBBLEWRAP) build

android-doctor:
	$(BUBBLEWRAP) doctor

run: build
	$(GO) run .
