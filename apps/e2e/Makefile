.PHONY: check test report

check:
	npx tsc --noEmit

test:
	npx playwright test $(ARGS)

report:
	npx playwright show-report
