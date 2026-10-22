.PHONY: build check test

build:
	npm run build

check:
	npx tsc --noEmit -p tests

test:
	node --import tsx --test 'tests/**/*.test.ts'
