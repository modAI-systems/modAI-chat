import sys
import os
import yaml
import pytest
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from modai.module import ModuleDependencies
from modai.modules.startup_config.yaml_config_module import YamlConfigModule


def test_config_loader_valid_config(tmp_path: Path):
    """Test that config loader correctly loads a valid config file."""
    test_config = {
        "modules": {"health": {"enabled": True}},
    }

    config_file = tmp_path / "config.yaml"
    config_file.write_text(yaml.dump(test_config))

    loader = YamlConfigModule(ModuleDependencies(), {"config_path": str(config_file)})
    config = loader.get_config()

    assert config["modules"]["health"]["enabled"]


def test_config_loader_invalid_yaml(tmp_path: Path):
    """Test that config loader raises exception for invalid YAML."""
    config_file = tmp_path / "invalid_config.yaml"
    config_file.write_text("invalid: yaml: content: [")

    loader = YamlConfigModule(ModuleDependencies(), {"config_path": str(config_file)})
    with pytest.raises(Exception):
        loader.get_config()


def test_config_loader_fallback_to_default():
    """Test that config loader falls back to default config when no path is provided."""
    loader = YamlConfigModule(ModuleDependencies(), {})
    config = loader.get_config()

    # Should load the default configuration
    assert config is not None
    assert "modules" in config
    assert "health" in config["modules"]


def test_config_loader_env_var(tmp_path: Path, monkeypatch):
    """Test that config loader resolves environment variables in config values."""
    monkeypatch.setenv("TEST_ENV_VAR", "env_value")
    test_config = {"custom": {"from_env": "${TEST_ENV_VAR}"}}
    config_file = tmp_path / "config_env.yaml"
    config_file.write_text(yaml.dump(test_config))
    loader = YamlConfigModule(ModuleDependencies(), {"config_path": str(config_file)})
    config = loader.get_config()
    assert config["custom"]["from_env"] == "env_value"
