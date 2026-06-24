.PHONY: backend-install backend-migrate backend-seed backend-run backend-reset db-bootstrap \
        compose-check ci ci-quick test test-backend test-frontend security-check \
        local-start local-stop local-status stag-deploy

VENV=backend/.venv
PYTHON=$(VENV)/bin/python
PIP=$(VENV)/bin/pip

TEST_DB_ENV=DB_HOST=localhost DB_PORT=5433 DB_NAME=npa_ecm_local DB_USER=ecmadmin DB_PASSWORD=ecmadmin \
	DJANGO_SETTINGS_MODULE=ecm_backend.settings_test TEST_DB_NAME=test_npa_ecm_db

backend-install:
	python3 -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r backend/requirements.txt
	$(PIP) install -r backend/requirements-dev.txt

backend-migrate:
	$(PYTHON) backend/manage.py migrate

backend-seed:
	$(PYTHON) backend/manage.py seed_demo_data

backend-run:
	$(PYTHON) backend/manage.py runserver 0.0.0.0:8002

backend-reset:
	rm -rf backend/.venv
	find backend -name "__pycache__" -type d -prune -exec rm -rf {} +

db-bootstrap:
	psql -U postgres -f backend/scripts/bootstrap_postgres.sql

compose-check:
	bash scripts/ci/validate-compose.sh

test-backend:
	$(TEST_DB_ENV) bash scripts/ci/run-backend-tests.sh

test-frontend:
	cd frontend && npm test

test: test-backend test-frontend

security-check:
	$(PIP) install -r backend/requirements-dev.txt 2>/dev/null || pip install -r backend/requirements-dev.txt
	$(PYTHON) -m bandit -r backend/accounts backend/common backend/correspondence backend/dms backend/ecm_backend -lll -q
	$(PYTHON) -m pip_audit -r backend/requirements.txt

ci:
	bash scripts/ci/run-local-ci.sh

ci-quick:
	bash scripts/ci/run-local-ci.sh --quick

local-start:
	scripts/local/env-manager.sh start

local-stop:
	scripts/local/env-manager.sh stop

local-status:
	scripts/local/env-manager.sh status

stag-deploy:
	scripts/staging/env-manager.sh deploy
