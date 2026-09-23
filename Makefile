.DEFAULT_GOAL := lint

NPM := npm --prefix client

.PHONY: onboarding installdeps dev format lint typecheck test test-integration build check

onboarding: installdeps

installdeps:
	$(NPM) install
	$(NPM) run prepare

dev:
	$(NPM) run dev

format:
	$(NPM) run format

lint: typecheck
	$(NPM) run format:check
	$(NPM) run lint

typecheck:
	$(NPM) run typecheck

test:
	$(NPM) test

test-integration:
	$(NPM) run test:integration

build:
	$(NPM) run build

check:
	$(NPM) run test:ci
