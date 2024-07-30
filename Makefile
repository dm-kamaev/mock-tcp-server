publish: test_coverage build
	npm publish --access public;

test_coverage:
	npx jest --coverage

test_badge: test_coverage
	npx jest-coverage-badges

ci: lint check_ts
	make test_coverage;
	make build;

lint:
	npx eslint src/ test/;

lint_fix:
	npx eslint --fix src/ test/;

check_ts:
	npx tsc --noEmit;

test:
	npx jest;

clean_before_build:
	rm -f index.d.ts;
	rm -f index.js;
	rm -f test/*.d.ts;
	rm -f test/*.js;


build: clean_before_build lint
	npx tsc

.PHONY: test