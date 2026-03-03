#!/usr/bin/env python3
"""
modAI Chat Backend - Main Entry Point

This is the main entry point for the modAI chat backend server.
It initializes the core system and starts the FastAPI server.
"""

from pathlib import Path
from typing import Any
import logging
from fastapi import FastAPI
from dotenv import find_dotenv, load_dotenv

from modai.module import ModuleDependencies
from modai.modules.startup_config.yaml_config_module import YamlConfigModule
from modai.module_loader import ModuleLoader


# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def load_startup_config() -> dict[str, Any]:
    working_dir = Path.cwd()
    load_dotenv(find_dotenv(str(working_dir / ".env")))

    config_path = Path("config.yaml")
    config = {"config_path": str(config_path)} if config_path.exists() else {}
    return YamlConfigModule(ModuleDependencies(), config).get_config()


def load_modules(app: FastAPI, startup_config: dict[str, Any]) -> None:
    """Register all loaded web modules with the FastAPI app."""
    module_loader = ModuleLoader(startup_config)
    module_loader.load_modules()
    web_modules = module_loader.get_web_modules()

    for module in web_modules:
        if hasattr(module, "router"):
            app.include_router(module.router)
            logger.info(f"Registered web module: {module.__class__.__name__}")


def create_app() -> FastAPI:
    working_dir = Path.cwd()
    logger.info(f"Working Directory: {working_dir}")

    """Create and configure the FastAPI application."""
    # 1. Config Loading
    logger.info("Loading configuration...")
    startup_config = load_startup_config()

    # Initialize the core system following the startup flow
    logger.info("Starting Core System initialization...")
    app = FastAPI(title="modAI Chat Backend")

    # 2. Module Loading
    logger.info("Loading modules...")
    load_modules(app, startup_config)

    # Core System initialization complete
    logger.info("Core System initialization complete!")

    return app


# Create the global app instance for uvicorn
app = create_app()
