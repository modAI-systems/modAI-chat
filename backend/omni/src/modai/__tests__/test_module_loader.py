from typing import Any

from modai.module import ModaiModule, ModuleDependencies
from modai.module_loader import ModuleLoader


class DummyModule(ModaiModule):
    """Dummy module for testing purposes."""

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.name = "dummy"


def test_init():
    """Test ModuleLoader initialization."""
    startup_config = {"modules": {}}
    loader = ModuleLoader(startup_config)

    assert loader.startup_config == startup_config
    assert loader.loaded_modules == {}


def test_import_class_success():
    """Test successful class import."""
    startup_config = {
        "modules": {
            "foo": {
                "class": "modai.__tests__.test_module_loader.DummyModule",
                "config": {"some": "nicevalue"},
            }
        }
    }
    loader = ModuleLoader(startup_config)
    loader.load_modules()

    dummy_module = loader.get_module("foo")
    assert dummy_module is not None
    assert isinstance(dummy_module, DummyModule)
    assert dummy_module.config == {"some": "nicevalue"}


def test_load_module_disabled(caplog):
    """Test loading a disabled module."""
    startup_config = {
        "modules": {
            "foo": {
                "class": "modai.__tests__.test_module_loader.DummyModule",
                "enabled": False,
            }
        }
    }
    loader = ModuleLoader(startup_config)
    loader.load_modules()

    dummy_module = loader.get_module("foo")
    assert dummy_module is None


def test_load_module_none_config():
    """Test loading a module with None config."""
    startup_config = {"modules": {}}
    loader = ModuleLoader(startup_config)

    assert loader.loaded_modules == {}


def test_load_module_import_error():
    """Test handling import error during module loading."""
    startup_config = {"modules": {"foo": {"class": "noexist.Module"}}}
    loader = ModuleLoader(startup_config)
    loader.load_modules()

    assert loader.get_module("foo") is None


def test_module_dependencies():
    """Test module dependencies handling."""
    startup_config = {
        "modules": {
            "bar": {
                "class": "modai.__tests__.test_module_loader.DummyModule",
                "module_dependencies": {"foo": "foo"},
            },
            "foo": {
                "class": "modai.__tests__.test_module_loader.DummyModule",
            },
        }
    }
    loader = ModuleLoader(startup_config)
    loader.load_modules()

    foo_module = loader.get_module("foo")
    bar_module = loader.get_module("bar")

    assert foo_module is not None
    assert bar_module is not None

    assert isinstance(foo_module, DummyModule)
    assert isinstance(bar_module, DummyModule)

    assert bar_module.dependencies.modules.get("foo") == foo_module


def test_module_dependencies_chain():
    """Test chain of module dependencies (C depends on B, B depends on A)."""
    startup_config = {
        "modules": {
            "baz": {
                "class": "modai.__tests__.test_module_loader.DummyModule",
                "module_dependencies": {"bar": "bar"},
            },
            "bar": {
                "class": "modai.__tests__.test_module_loader.DummyModule",
                "module_dependencies": {"foo": "foo"},
            },
            "foo": {
                "class": "modai.__tests__.test_module_loader.DummyModule",
            },
        }
    }
    loader = ModuleLoader(startup_config)
    loader.load_modules()

    foo_module = loader.get_module("foo")
    bar_module = loader.get_module("bar")
    baz_module = loader.get_module("baz")

    assert foo_module is not None
    assert bar_module is not None
    assert baz_module is not None

    assert isinstance(foo_module, DummyModule)
    assert isinstance(bar_module, DummyModule)
    assert isinstance(baz_module, DummyModule)

    # Check the dependency chain
    assert bar_module.dependencies.modules.get("foo") == foo_module
    assert baz_module.dependencies.modules.get("bar") == bar_module


def test_module_dependencies_unresolvable():
    """Test handling of unresolvable dependencies."""
    startup_config = {
        "modules": {
            "bar": {
                "class": "modai.__tests__.test_module_loader.DummyModule",
                "module_dependencies": {"foo": "nonexistent"},
            },
        }
    }
    loader = ModuleLoader(startup_config)
    loader.load_modules()

    bar_module = loader.get_module("bar")
    assert bar_module is None  # Should not be loaded due to missing dependency
