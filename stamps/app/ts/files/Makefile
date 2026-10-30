SHELL=/bin/bash

.DEFAULT_GOAL := build

# Default arguments for the Makefile targets e.g make build ARGS="--flag"
ARGS ?=


########################################################################################################################
#
# Project dev targets
#
########################################################################################################################
.PHONY: build
build: node_modules 					## Build the project
	npx tsc

package-lock.json:           ## Initialize the package lock file if it doesn't exist
	npm install

node_modules: package.json package-lock.json
ifeq ($(CI), true)
	npm ci
else
	npm install
endif

.PHONY: setup
setup: clean 										## Setup the project environment
	npm install
	$(MAKE) build

.PHONY: clean
clean:													## Clean up the build artifacts
	rm -rf dist

.PHONY: start run
run: start
start: 													## Start the application in development mode
	npx tsx --watch \
		--inspect=9992 src/index.ts $(ARGS)

.PHONY: test
test: 													## Run the tests
	npx vitest run $(ARGS)

.PHONY: check
check: node_modules 										## Format, lint and type check the project
	npx biome check --write .
	npx tsc --noEmit --project .

.PHONY: help
help: 													## Render the possible targets in this Makefile along with their descriptions
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) |  awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'cat
