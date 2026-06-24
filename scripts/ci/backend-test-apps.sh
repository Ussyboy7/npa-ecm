#!/usr/bin/env bash
# Canonical Django test app list — keep in sync with Makefile test-backend target.
set -euo pipefail

BACKEND_TEST_APPS=(
  accounts
  analytics.tests
  audit.tests
  capture.tests
  common
  correspondence.tests
  dms.tests
  forms.tests
  integrations.tests
  notifications.tests
  organization.tests
  search.tests
  support.tests
  workflow.tests
)

printf '%s\n' "${BACKEND_TEST_APPS[@]}"
