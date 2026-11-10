.PHONY: install dev check test e2e format deploy

api/%:
	@$(MAKE) --no-print-directory -C apps/api $*

web/%:
	@$(MAKE) --no-print-directory -C apps/web $*

shared/%:
	@$(MAKE) --no-print-directory -C packages/shared $*

e2e/%:
	@$(MAKE) --no-print-directory -C apps/e2e $*

install:
	npm ci
	@$(MAKE) --no-print-directory shared/build
	cd apps/api && npx prisma generate
	cd apps/e2e && npx playwright install --only-shell chromium

dev: shared/build
	@$(MAKE) --no-print-directory -j2 api/dev web/dev

check:
	npx prettier --check .
	npx eslint .
	@$(MAKE) --no-print-directory shared/check api/check web/check e2e/check \
		test

test:
	@$(MAKE) --no-print-directory shared/test api/test web/test

e2e: shared/build
	@$(MAKE) --no-print-directory e2e/test

format:
	npx prettier --write .
	npx eslint . --fix

deploy: api/deploy
