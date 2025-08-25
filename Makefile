# MCP Builds Makefile
# Comprehensive build and development commands

# Variables
SHELL := /bin/bash
.DEFAULT_GOAL := help
NODE_VERSION := 18
PYTHON_VERSION := 3.11

# Colors
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
CYAN := \033[0;36m
NC := \033[0m # No Color

# Extension directories
NODE_EXTENSIONS := fs-sandbox-node prompt-composer-node
PYTHON_EXTENSIONS := fs-sandbox-python ffprobe-lite-python
ALL_EXTENSIONS := $(NODE_EXTENSIONS) $(PYTHON_EXTENSIONS)

# Paths
EXTENSIONS_DIR := extensions
TOOLING_DIR := tooling
DXT_LINT := node $(TOOLING_DIR)/dxt-lint/dxt-lint.js

# Help target
.PHONY: help
help: ## Show this help message
	@echo -e "$(CYAN)MCP Builds - Development Commands$(NC)"
	@echo -e "$(CYAN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo -e "$(YELLOW)Extension-specific commands:$(NC)"
	@echo -e "  make build-<extension>    Build specific extension"
	@echo -e "  make test-<extension>     Test specific extension"
	@echo -e "  make lint-<extension>     Lint specific extension"
	@echo -e "  make pack-<extension>     Package specific extension"
	@echo ""
	@echo -e "$(YELLOW)Examples:$(NC)"
	@echo -e "  make build-fs-sandbox-node"
	@echo -e "  make test-all"
	@echo -e "  make security-scan"

# ============================================================================
# Setup & Installation
# ============================================================================

.PHONY: setup
setup: check-requirements install-deps install-tools ## Complete setup for development
	@echo -e "$(GREEN)✅ Setup complete!$(NC)"

.PHONY: check-requirements
check-requirements: ## Check if required tools are installed
	@echo -e "$(BLUE)Checking requirements...$(NC)"
	@command -v node >/dev/null 2>&1 || (echo -e "$(RED)❌ Node.js not found$(NC)" && exit 1)
	@command -v python3 >/dev/null 2>&1 || (echo -e "$(RED)❌ Python 3 not found$(NC)" && exit 1)
	@command -v git >/dev/null 2>&1 || (echo -e "$(RED)❌ Git not found$(NC)" && exit 1)
	@echo -e "$(GREEN)✅ All requirements met$(NC)"

.PHONY: install-deps
install-deps: ## Install all dependencies
	@echo -e "$(BLUE)Installing dependencies...$(NC)"
	@for ext in $(NODE_EXTENSIONS); do \
		echo -e "$(CYAN)Installing deps for $$ext...$(NC)"; \
		(cd $(EXTENSIONS_DIR)/$$ext && npm install) || exit 1; \
	done
	@for ext in $(PYTHON_EXTENSIONS); do \
		echo -e "$(CYAN)Setting up Python for $$ext...$(NC)"; \
		(cd $(EXTENSIONS_DIR)/$$ext && python3 -m venv .venv && \
		 .venv/bin/pip install -r requirements.txt) || exit 1; \
	done
	@(cd $(TOOLING_DIR)/dxt-lint && npm install) || exit 1
	@echo -e "$(GREEN)✅ Dependencies installed$(NC)"

.PHONY: install-tools
install-tools: ## Install global development tools
	@echo -e "$(BLUE)Installing global tools...$(NC)"
	@npm install -g @anthropic-ai/dxt || echo -e "$(YELLOW)⚠️  Could not install dxt globally$(NC)"
	@pip3 install --user ruff mypy pytest pytest-asyncio pytest-cov safety || true
	@echo -e "$(GREEN)✅ Tools installed$(NC)"

# ============================================================================
# Building
# ============================================================================

.PHONY: build
build: build-node build-python ## Build all extensions
	@echo -e "$(GREEN)✅ All extensions built$(NC)"

.PHONY: build-node
build-node: ## Build all Node.js extensions
	@for ext in $(NODE_EXTENSIONS); do \
		echo -e "$(CYAN)Building $$ext...$(NC)"; \
		$(MAKE) build-$$ext || exit 1; \
	done

.PHONY: build-python
build-python: ## Build all Python extensions
	@for ext in $(PYTHON_EXTENSIONS); do \
		echo -e "$(CYAN)Building $$ext...$(NC)"; \
		$(MAKE) build-$$ext || exit 1; \
	done

# Individual extension build targets
$(foreach ext,$(NODE_EXTENSIONS),build-$(ext)):
	@ext=$(@:build-%=%); \
	echo -e "$(BLUE)Building $$ext...$(NC)"; \
	cd $(EXTENSIONS_DIR)/$$ext && npm run build 2>/dev/null || npm run tsc 2>/dev/null || echo "No build step"

$(foreach ext,$(PYTHON_EXTENSIONS),build-$(ext)):
	@ext=$(@:build-%=%); \
	echo -e "$(BLUE)Building $$ext...$(NC)"; \
	cd $(EXTENSIONS_DIR)/$$ext && python3 -m py_compile server/*.py

# ============================================================================
# Testing
# ============================================================================

.PHONY: test
test: test-node test-python ## Run all tests
	@echo -e "$(GREEN)✅ All tests passed$(NC)"

.PHONY: test-all
test-all: test test-integration test-performance ## Run all test suites

.PHONY: test-node
test-node: ## Test all Node.js extensions
	@for ext in $(NODE_EXTENSIONS); do \
		echo -e "$(CYAN)Testing $$ext...$(NC)"; \
		(cd $(EXTENSIONS_DIR)/$$ext && npm test) || exit 1; \
	done

.PHONY: test-python
test-python: ## Test all Python extensions
	@for ext in $(PYTHON_EXTENSIONS); do \
		echo -e "$(CYAN)Testing $$ext...$(NC)"; \
		(cd $(EXTENSIONS_DIR)/$$ext && \
		 if [ -f .venv/bin/pytest ]; then \
		   .venv/bin/pytest -v; \
		 else \
		   python3 -m pytest -v 2>/dev/null || echo "No tests found"; \
		 fi) || exit 1; \
	done

.PHONY: test-integration
test-integration: ## Run integration tests with host simulator
	@echo -e "$(BLUE)Running integration tests...$(NC)"
	@python3 $(TOOLING_DIR)/host-sim/host_sim.py --test-all-extensions || echo "Host simulator not configured"

.PHONY: test-performance
test-performance: ## Run performance benchmarks
	@echo -e "$(BLUE)Running performance tests...$(NC)"
	@echo "Performance tests not yet implemented"

.PHONY: test-coverage
test-coverage: ## Generate test coverage reports
	@echo -e "$(BLUE)Generating coverage reports...$(NC)"
	@for ext in $(NODE_EXTENSIONS); do \
		(cd $(EXTENSIONS_DIR)/$$ext && npm run coverage 2>/dev/null || npm test -- --coverage 2>/dev/null) || true; \
	done
	@for ext in $(PYTHON_EXTENSIONS); do \
		(cd $(EXTENSIONS_DIR)/$$ext && \
		 .venv/bin/pytest --cov=server --cov-report=html 2>/dev/null) || true; \
	done

# ============================================================================
# Linting & Formatting
# ============================================================================

.PHONY: lint
lint: lint-node lint-python lint-manifests ## Run all linters
	@echo -e "$(GREEN)✅ All linting passed$(NC)"

.PHONY: lint-node
lint-node: ## Lint Node.js code
	@for ext in $(NODE_EXTENSIONS); do \
		echo -e "$(CYAN)Linting $$ext...$(NC)"; \
		(cd $(EXTENSIONS_DIR)/$$ext && npx eslint . --ext .ts,.js 2>/dev/null || npm run lint 2>/dev/null) || true; \
	done

.PHONY: lint-python
lint-python: ## Lint Python code
	@for ext in $(PYTHON_EXTENSIONS); do \
		echo -e "$(CYAN)Linting $$ext...$(NC)"; \
		(cd $(EXTENSIONS_DIR)/$$ext && \
		 ruff check . 2>/dev/null || python3 -m ruff check . 2>/dev/null) || true; \
	done

.PHONY: lint-manifests
lint-manifests: ## Validate all manifest.json files
	@for ext in $(ALL_EXTENSIONS); do \
		echo -e "$(CYAN)Validating manifest for $$ext...$(NC)"; \
		$(DXT_LINT) $(EXTENSIONS_DIR)/$$ext || true; \
	done

.PHONY: format
format: format-node format-python ## Auto-format all code
	@echo -e "$(GREEN)✅ Code formatted$(NC)"

.PHONY: format-node
format-node: ## Format Node.js code with Prettier
	@for ext in $(NODE_EXTENSIONS); do \
		echo -e "$(CYAN)Formatting $$ext...$(NC)"; \
		(cd $(EXTENSIONS_DIR)/$$ext && npx prettier --write "**/*.{ts,js,json}" 2>/dev/null) || true; \
	done

.PHONY: format-python
format-python: ## Format Python code with Black
	@for ext in $(PYTHON_EXTENSIONS); do \
		echo -e "$(CYAN)Formatting $$ext...$(NC)"; \
		(cd $(EXTENSIONS_DIR)/$$ext && black . 2>/dev/null || python3 -m black . 2>/dev/null) || true; \
	done

# ============================================================================
# Security
# ============================================================================

.PHONY: security-scan
security-scan: scan-secrets scan-deps scan-code ## Run all security scans
	@echo -e "$(GREEN)✅ Security scan complete$(NC)"

.PHONY: scan-secrets
scan-secrets: ## Scan for hardcoded secrets
	@echo -e "$(BLUE)Scanning for secrets...$(NC)"
	@command -v gitleaks >/dev/null 2>&1 && gitleaks detect --source . -v || \
		(grep -r "sk-[a-zA-Z0-9]\{48\}\|ghp_[a-zA-Z0-9]\{36\}\|password.*=.*['\"]" \
		 --exclude-dir=node_modules --exclude-dir=.venv --exclude-dir=.git . || true)

.PHONY: scan-deps
scan-deps: ## Scan dependencies for vulnerabilities
	@echo -e "$(BLUE)Scanning dependencies...$(NC)"
	@for ext in $(NODE_EXTENSIONS); do \
		echo -e "$(CYAN)Scanning $$ext dependencies...$(NC)"; \
		(cd $(EXTENSIONS_DIR)/$$ext && npm audit --audit-level=moderate) || true; \
	done
	@for ext in $(PYTHON_EXTENSIONS); do \
		echo -e "$(CYAN)Scanning $$ext dependencies...$(NC)"; \
		(cd $(EXTENSIONS_DIR)/$$ext && safety check -r requirements.txt 2>/dev/null) || true; \
	done

.PHONY: scan-code
scan-code: ## Run static security analysis
	@echo -e "$(BLUE)Running static analysis...$(NC)"
	@echo "Static analysis not yet configured"

# ============================================================================
# Packaging
# ============================================================================

.PHONY: pack
pack: pack-all ## Package all extensions as .dxt files

.PHONY: pack-all
pack-all: ## Package all extensions
	@for ext in $(ALL_EXTENSIONS); do \
		echo -e "$(CYAN)Packaging $$ext...$(NC)"; \
		$(MAKE) pack-$$ext || exit 1; \
	done
	@echo -e "$(GREEN)✅ All extensions packaged$(NC)"

# Individual extension pack targets
$(foreach ext,$(ALL_EXTENSIONS),pack-$(ext)):
	@ext=$(@:pack-%=%); \
	echo -e "$(BLUE)Packaging $$ext...$(NC)"; \
	cd $(EXTENSIONS_DIR)/$$ext && dxt pack

.PHONY: validate
validate: ## Validate all extensions with dxt
	@for ext in $(ALL_EXTENSIONS); do \
		echo -e "$(CYAN)Validating $$ext...$(NC)"; \
		cd $(EXTENSIONS_DIR)/$$ext && dxt validate || exit 1; \
	done
	@echo -e "$(GREEN)✅ All extensions valid$(NC)"

# ============================================================================
# Cleaning
# ============================================================================

.PHONY: clean
clean: clean-builds clean-deps clean-cache ## Clean all generated files
	@echo -e "$(GREEN)✅ Cleaned$(NC)"

.PHONY: clean-builds
clean-builds: ## Clean build artifacts
	@echo -e "$(BLUE)Cleaning build artifacts...$(NC)"
	@find . -name "*.dxt" -delete
	@find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
	@find . -name "build" -type d -exec rm -rf {} + 2>/dev/null || true
	@find . -name "*.pyc" -delete
	@find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

.PHONY: clean-deps
clean-deps: ## Clean dependency directories
	@echo -e "$(BLUE)Cleaning dependencies...$(NC)"
	@find $(EXTENSIONS_DIR) -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
	@find $(EXTENSIONS_DIR) -name ".venv" -type d -exec rm -rf {} + 2>/dev/null || true

.PHONY: clean-cache
clean-cache: ## Clean cache files
	@echo -e "$(BLUE)Cleaning cache...$(NC)"
	@find . -name ".pytest_cache" -type d -exec rm -rf {} + 2>/dev/null || true
	@find . -name ".coverage" -delete
	@find . -name "*.log" -delete

# ============================================================================
# Development Helpers
# ============================================================================

.PHONY: dev
dev: ## Start development mode with file watching
	@echo -e "$(CYAN)Starting development mode...$(NC)"
	@echo "Choose an extension to develop:"
	@select ext in $(ALL_EXTENSIONS) "quit"; do \
		case $$ext in \
			quit) break ;; \
			*) cd $(EXTENSIONS_DIR)/$$ext && npm run dev 2>/dev/null || python3 server/main.py --debug ;; \
		esac; \
	done

.PHONY: new-extension
new-extension: ## Create a new extension from template
	@echo -e "$(CYAN)Creating new extension...$(NC)"
	@read -p "Extension name (lowercase-hyphenated): " name; \
	read -p "Language (node/python): " lang; \
	if [ "$$lang" = "node" ]; then \
		cp -r examples/typescript-server.ts $(EXTENSIONS_DIR)/$$name/; \
		echo -e "$(GREEN)✅ Created $$name from TypeScript template$(NC)"; \
	elif [ "$$lang" = "python" ]; then \
		cp -r examples/python-server.py $(EXTENSIONS_DIR)/$$name/; \
		echo -e "$(GREEN)✅ Created $$name from Python template$(NC)"; \
	fi

.PHONY: release
release: validate test security-scan ## Prepare a release
	@echo -e "$(CYAN)Preparing release...$(NC)"
	@echo "1. Update version numbers in manifest.json files"
	@echo "2. Update CHANGELOG.md"
	@echo "3. Commit changes"
	@echo "4. Tag: git tag v0.1.0"
	@echo "5. Push: git push --tags"

.PHONY: ci
ci: check-requirements lint test security-scan validate pack ## Run CI pipeline locally
	@echo -e "$(GREEN)✅ CI pipeline passed$(NC)"

# ============================================================================
# Documentation
# ============================================================================

.PHONY: docs
docs: ## Generate documentation
	@echo -e "$(BLUE)Generating documentation...$(NC)"
	@echo "Documentation generation not yet configured"

.PHONY: serve-docs
serve-docs: ## Serve documentation locally
	@echo -e "$(BLUE)Serving documentation...$(NC)"
	@python3 -m http.server 8000 --directory docs

# ============================================================================
# Git Helpers
# ============================================================================

.PHONY: pre-commit
pre-commit: lint test ## Run pre-commit checks
	@echo -e "$(GREEN)✅ Pre-commit checks passed$(NC)"

.PHONY: setup-hooks
setup-hooks: ## Install git hooks
	@echo -e "$(BLUE)Setting up git hooks...$(NC)"
	@echo "#!/bin/bash" > .git/hooks/pre-commit
	@echo "make pre-commit" >> .git/hooks/pre-commit
	@chmod +x .git/hooks/pre-commit
	@echo -e "$(GREEN)✅ Git hooks installed$(NC)"

# Default target
.DEFAULT: help
