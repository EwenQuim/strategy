.DEFAULT_GOAL := lint

.PHONY: onboarding installdeps dev format lint typecheck test build check

onboarding: installdeps

installdeps:
	npm install
	npm run prepare

dev:
	npm run dev

format:
	npm run format

lint: typecheck
	npm run format:check
	npm run lint

typecheck:
	npm run typecheck

test:
	npm test

build:
	npm run build

check:
	npm run check
