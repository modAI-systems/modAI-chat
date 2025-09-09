.PHONY: install dev test run clean

# Install dependencies
install:
	uv sync

# Install with dev dependencies
dev:
	uv sync --dev

# Run tests
test:
	uv run pytest

# Run the application with uvicorn
serve:
	PYTHONPATH=src uv run uvicorn modai.main:app --reload

# Clean up generated files
clean:
	rm -rf .venv
	rm -rf __pycache__
	rm -rf .pytest_cache
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete

# Show help
help:
	@echo "Available commands:"
	@echo "  install - Install dependencies"
	@echo "  dev     - Install with dev dependencies"
	@echo "  test    - Run tests"
	@echo "  serve   - Run with uvicorn (development server)"
	@echo "  clean   - Clean up generated files"
	@echo "  help    - Show this help message"
