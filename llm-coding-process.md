# Project Rules

touch .trae/rules/project_rules.md

```text
General Rules:
- Use XRay tool to explore the codebase
- Use ast-grep for code searching and refactoring
- MUST Add extensive logging to help with debugging as this is a GUI application
- MUST Run `make check` before starting a new check list item to make sure there aren't any existing issues to resolve
- Run `make run` to run the application
- Always prefer to use `make` commands
- Use `uv add` to add any dependencies. Use `uv add --dev` if it is a dev dependency.
- MUST Whenever you’re about to complete a user request, call the MCP interactive_feedback instead of simply ending the process. Keep calling MCP until the user’s feedback is empty, then end the request.

Coding Rules:
Keep functions small and concise - Minimize line count, operators, and variables to improve readability.
Use consistent patterns - Avoid novelty in function structure; standardize how similar logic is implemented across the codebase.
Break up complex chains - Split long function chains, iterators, or comprehensions into logical groups using helper functions or intermediate variables.
Simplify conditionals - Keep condition tests short and prefer sequences of the same logical operator (avoid mixing && and || when possible).
Minimize nesting depth - Avoid deep indentation; refactor deeply nested logic into separate functions.
Use distinct, descriptive names - Choose visually distinguishable and meaningful variable names; never shadow variables.
Minimize variable lifespan - Declare variables close to where they're used and limit how long they remain in scope.
```

## Python

### Pre-commit

touch 

```yaml

```

touch Makefile

### Makefile

```makefile
export PROJECTNAME=$(shell basename "$(PWD)")

.PHONY: install
install: ## Install the virtual environment and install the pre-commit hooks
	@echo "🚀 Creating virtual environment using uv"
	@uv sync
	@uv run pre-commit install

.PHONY: check
check: ## Run code quality tools.
	@echo "🚀 Checking lock file consistency with 'pyproject.toml'"
	@uv lock --locked
	@echo "🚀 Linting code: Running pre-commit"
	@uv run pre-commit run -a
	@mob next

.PHONY: upgrade
upgrade: ## Upgrade all dependencies to their latest versions
	@echo "🚀 Upgrading all dependencies"
	@uv lock --upgrade

.PHONY: test
test: ## Run all unit tests
	@echo "🚀 Running unit tests"
	@uv run pytest -v

.PHONY: run
run: ## Run the application
	@echo "🚀 Testing code: Running $(PROJECTNAME)"
	@uv run devboost

.PHONY: build
build: clean-build ## Build wheel file
	@echo "🚀 Creating wheel file"
	@uvx --from build pyproject-build --installer uv

.PHONY: clean-build
clean-build: ## Clean build artifacts
	@echo "🚀 Removing build artifacts"
	@uv run python -c "import shutil; import os; shutil.rmtree('dist') if os.path.exists('dist') else None"

.PHONY: context
context: clean-build ## Build context file from application sources
	llm-context-builder.py --extensions .py --ignored_dirs build dist generated venv .venv .idea .aider.tags.cache.v3 --print_contents --temp_file

package: clean-build ## Run installer
	uv run pyinstaller main.spec

install-macosx: package ## Installs application in users Application folder
	./scripts/install-macosx.sh DevBoost.app

.PHONY: help
help:
	@uv run python -c "import re; \
	[[print(f'\033[36m{m[0]:<20}\033[0m {m[1]}') for m in re.findall(r'^([a-zA-Z_-]+):.*?## (.*)$$', open(makefile).read(), re.M)] for makefile in ('$(MAKEFILE_LIST)').strip().split()]"

.DEFAULT_GOAL := help
```


## Typescript

...


## Java / Kotlin

...