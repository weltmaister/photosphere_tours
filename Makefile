# This file is licensed under the Affero General Public License version 3 or
# later. See the COPYING file.

app_name=photosphere_tours
build_directory=$(CURDIR)/build
appstore_package=$(build_directory)/artifacts/appstore/$(app_name).tar.gz

.PHONY: all
all: build

.PHONY: build
build:
	npm ci
	npm run build

.PHONY: test
test:
	npm test

.PHONY: lint
lint:
	find lib appinfo -name '*.php' -exec php -l {} \;

# Tarball for the app store and for manual installs into custom_apps/.
# Only what Nextcloud needs at runtime: no sources, tests or tooling.
.PHONY: appstore
appstore: build
	rm -rf $(build_directory)/artifacts
	mkdir -p $(build_directory)/artifacts/appstore $(build_directory)/stage/$(app_name)
	cp -r appinfo lib img COPYING README.md $(build_directory)/stage/$(app_name)/
	mkdir -p $(build_directory)/stage/$(app_name)/js
	cp js/*.js js/*.LICENSE.txt $(build_directory)/stage/$(app_name)/js/ 2>/dev/null || true
	if [ -d l10n ]; then cp -r l10n $(build_directory)/stage/$(app_name)/; fi
	tar -czf $(appstore_package) -C $(build_directory)/stage $(app_name)
	rm -rf $(build_directory)/stage
	@echo "Built $(appstore_package)"

.PHONY: clean
clean:
	rm -rf $(build_directory) js
