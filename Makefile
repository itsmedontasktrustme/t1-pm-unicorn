.PHONY: browser-tests

# Start the local Docker stack and run the Cucumber/Playwright browser tests.
browser-tests:
	docker compose up -d --build
	@i=0; until curl --silent --fail http://localhost/sign-in >/dev/null; do \
		i=$$((i + 1)); \
		if [ $$i -ge 120 ]; then docker compose ps; exit 1; fi; \
		sleep 1; \
	done
	cd bdd-tests && npm ci && npx playwright install chromium && npm test
