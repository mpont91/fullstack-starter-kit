-include .env

POSTGRES_PORT ?= 5432
# The suite truncates between tests, so it gets its own database next to the
# development one, never the development one itself.
TEST_DATABASE_URL = postgresql://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@localhost:$(POSTGRES_PORT)/$(POSTGRES_DB)_test?schema=public
PSQL = docker compose exec -T db psql -U $(POSTGRES_USER) -v ON_ERROR_STOP=1

.PHONY: dev check test build down logs deploy ssh grant-admin revoke-admin \
	backup restore

dev:
	docker compose up -d --wait db
	npx prisma migrate deploy
	npx tsx watch src/index.ts

check:
	npx tsc --noEmit

test:
	docker compose up -d --wait db
	@$(PSQL) -d postgres -tAc "SELECT 1 FROM pg_database \
		WHERE datname = '$(POSTGRES_DB)_test'" | grep -q 1 \
		|| docker compose exec -T db \
			createdb -U $(POSTGRES_USER) $(POSTGRES_DB)_test
	@DATABASE_URL="$(TEST_DATABASE_URL)" npx prisma migrate deploy
	@TEST_DATABASE_URL="$(TEST_DATABASE_URL)" node --import tsx --test \
		--test-concurrency=1 'tests/**/*.test.ts'

build:
	docker compose up -d --build --force-recreate \
		$$(docker compose config --services | grep -vx db)

down:
	docker compose down

logs:
	docker compose logs -f

# One backup now, the same the server takes every night. Needs the BACKUP_*
# keys in .env.
backup:
	docker compose run --rm --build backup once

# Downloads an off-site backup (the latest daily one, or FILE=daily/… or
# weekly/…), asks for the owner's private age key and restores it into
# <POSTGRES_DB>_restore, never the live database. Needs the BACKUP_B2_* key in
# .env.
restore:
	docker compose run --rm --build backup restore $(FILE)

deploy:
	ssh $(SERVER_SSH) " \
		cd $(SERVER_PATH)/apps/api && \
		git pull && \
		docker compose run --rm --build migrate && \
		make build"

ssh:
	ssh $(SERVER_SSH) -t "cd $(SERVER_PATH) && bash"

# The only way to change a role: the app never sets one, so nobody can promote
# themselves. Runs against whichever machine's database you're on (locally, or
# on the server after `make ssh`). Prints UPDATE 1, or UPDATE 0 if no account
# has that email. The email goes in as a psql variable, never into the SQL.
grant-admin:
	@test -n "$(EMAIL)" || (echo "Usage: make api/grant-admin EMAIL=…" && exit 1)
	@echo "UPDATE \"User\" SET role = 'ADMIN' WHERE email = :'email';" \
		| $(PSQL) -d $(POSTGRES_DB) -v email="$(EMAIL)"

revoke-admin:
	@test -n "$(EMAIL)" || (echo "Usage: make api/revoke-admin EMAIL=…" && exit 1)
	@echo "UPDATE \"User\" SET role = 'USER' WHERE email = :'email';" \
		| $(PSQL) -d $(POSTGRES_DB) -v email="$(EMAIL)"
