.PHONY: install dev check test format deploy

api/%:
	@$(MAKE) --no-print-directory -C apps/api $*

web/%:
	@$(MAKE) --no-print-directory -C apps/web $*

shared/%:
	@$(MAKE) --no-print-directory -C packages/shared $*

install:
	npm ci
	@$(MAKE) --no-print-directory shared/build
	cd apps/api && npx prisma generate

dev: shared/build
	@$(MAKE) --no-print-directory -j2 api/dev web/dev

check:
	npx prettier --check .
	npx eslint .
	@$(MAKE) --no-print-directory shared/check api/check web/check test

test:
	@$(MAKE) --no-print-directory shared/test api/test web/test

format:
	npx prettier --write .
	npx eslint . --fix

deploy: api/deploy
