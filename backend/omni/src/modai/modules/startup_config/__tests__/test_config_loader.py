import yaml
import pytest
from pathlib import Path

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

    assert config == {"modules": {"health": {"enabled": True}}}


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
    test_config = {"modules": {"svc": {"class": "${TEST_ENV_VAR}"}}}
    config_file = tmp_path / "config_env.yaml"
    config_file.write_text(yaml.dump(test_config))
    loader = YamlConfigModule(ModuleDependencies(), {"config_path": str(config_file)})
    config = loader.get_config()
    assert config == {"modules": {"svc": {"class": "env_value"}}}


def test_config_loader_unset_env_var_defaults_to_empty_string(
    tmp_path: Path, monkeypatch
):
    """Test that unresolvable ${VAR} placeholders are replaced with an empty string."""
    monkeypatch.delenv("UNSET_VAR", raising=False)
    test_config = {"modules": {"svc": {"class": "${UNSET_VAR}"}}}
    config_file = tmp_path / "config_unset_env.yaml"
    config_file.write_text(yaml.dump(test_config))
    loader = YamlConfigModule(ModuleDependencies(), {"config_path": str(config_file)})
    config = loader.get_config()
    assert config == {"modules": {"svc": {"class": ""}}}


def test_includes_merges_modules_from_included_file(tmp_path: Path):
    """Modules from an included file are added when they don't collide."""
    main = tmp_path / "config.yaml"
    main.write_text(
        yaml.dump(
            {
                "includes": [{"path": "extra.yaml"}],
                "modules": {"health": {"class": "a.b.Health"}},
            }
        )
    )

    included = tmp_path / "extra.yaml"
    included.write_text(yaml.dump({"modules": {"extra": {"class": "a.b.Extra"}}}))

    loader = YamlConfigModule(ModuleDependencies(), {"config_path": str(main)})
    config = loader.get_config()

    assert config == {
        "modules": {
            "health": {"class": "a.b.Health"},
            "extra": {"class": "a.b.Extra"},
        }
    }


def test_includes_collision_strategy_replace(tmp_path: Path):
    """collision_strategy=replace on a root module: root fully replaces the included one."""
    main = tmp_path / "config.yaml"
    main.write_text(
        yaml.dump(
            {
                "includes": [{"path": "extra.yaml"}],
                "modules": {
                    "health": {
                        "class": "a.b.HealthRoot",
                        "collision_strategy": "replace",
                    }
                },
            }
        )
    )

    included = tmp_path / "extra.yaml"
    included.write_text(
        yaml.dump(
            {
                "modules": {
                    "health": {
                        "class": "a.b.HealthIncluded",
                        "config": {"from_include": True},
                    }
                }
            }
        )
    )

    loader = YamlConfigModule(ModuleDependencies(), {"config_path": str(main)})
    config = loader.get_config()

    assert config == {
        "modules": {
            "health": {
                "class": "a.b.HealthRoot",
            }
        }
    }


def test_includes_collision_strategy_merge_default(tmp_path: Path):
    """Without collision_strategy the default is merge: root wins on collision, include-only keys survive."""
    main = tmp_path / "config.yaml"
    main.write_text(
        yaml.dump(
            {
                "includes": [{"path": "extra.yaml"}],
                "modules": {
                    "health": {"class": "a.b.HealthRoot", "config": {"root_key": 0}}
                },
            }
        )
    )

    included = tmp_path / "extra.yaml"
    included.write_text(
        yaml.dump(
            {
                "modules": {
                    "health": {
                        "class": "a.b.HealthIncluded",
                        "config": {"include_key": 1},
                    }
                }
            }
        )
    )

    loader = YamlConfigModule(ModuleDependencies(), {"config_path": str(main)})
    config = loader.get_config()

    assert config == {
        "modules": {
            "health": {
                "class": "a.b.HealthRoot",
                "config": {"root_key": 0, "include_key": 1},
            }
        }
    }


def test_includes_collision_strategy_merge_explicit(tmp_path: Path):
    """Explicit collision_strategy=merge on a root module behaves identically to the default."""
    main = tmp_path / "config.yaml"
    main.write_text(
        yaml.dump(
            {
                "includes": [{"path": "extra.yaml"}],
                "modules": {
                    "health": {
                        "class": "a.b.HealthRoot",
                        "collision_strategy": "merge",
                    }
                },
            }
        )
    )

    included = tmp_path / "extra.yaml"
    included.write_text(
        yaml.dump(
            {
                "modules": {
                    "health": {
                        "class": "a.b.HealthIncluded",
                        "config": {"extra_key": "added"},
                    }
                }
            }
        )
    )

    loader = YamlConfigModule(ModuleDependencies(), {"config_path": str(main)})
    config = loader.get_config()

    assert config == {
        "modules": {
            "health": {
                "class": "a.b.HealthRoot",
                "config": {"extra_key": "added"},
            }
        }
    }


def test_includes_collision_strategy_merge_does_not_remove_existing_keys(
    tmp_path: Path,
):
    """merge never removes keys that already exist in the included module."""
    main = tmp_path / "config.yaml"
    main.write_text(
        yaml.dump(
            {
                "includes": [{"path": "extra.yaml"}],
                "modules": {
                    "health": {
                        "class": "a.b.HealthRoot",
                        "config": {"root_section": {"value": 1}},
                    }
                },
            }
        )
    )

    included = tmp_path / "extra.yaml"
    included.write_text(
        yaml.dump(
            {
                "modules": {
                    "health": {
                        "class": "a.b.HealthIncluded",
                        "config": {"include_key": True},
                    }
                }
            }
        )
    )

    loader = YamlConfigModule(ModuleDependencies(), {"config_path": str(main)})
    config = loader.get_config()

    assert config == {
        "modules": {
            "health": {
                "class": "a.b.HealthRoot",
                "config": {
                    "root_section": {"value": 1},
                    "include_key": True,
                },
            }
        }
    }


def test_includes_load_order_left_to_right(tmp_path: Path):
    """Load order: includes left-to-right, root last (highest priority).

    root → [A, B]:
    - A is loaded first, B overwrites A on collision (B applied after A).
    - Root is applied last and wins over both A and B.
    - Keys unique to any file are preserved throughout.
    """
    main = tmp_path / "config.yaml"
    main.write_text(
        yaml.dump(
            {
                "includes": [{"path": "a.yaml"}, {"path": "b.yaml"}],
                "modules": {
                    "shared": {
                        "last_writer": "root",
                        "class": "root",
                        "only_in_root": True,
                    }
                },
            }
        )
    )

    a = tmp_path / "a.yaml"
    a.write_text(
        yaml.dump(
            {
                "modules": {
                    "shared": {
                        "last_writer": "A",
                        "class": "A",
                        "only_in_a": True,
                        "include_writer": "A",
                    }
                }
            }
        )
    )

    b = tmp_path / "b.yaml"
    b.write_text(
        yaml.dump(
            {
                "modules": {
                    "shared": {
                        "last_writer": "B",
                        "class": "B",
                        "only_in_b": True,
                        "include_writer": "B",
                    }
                }
            }
        )
    )

    loader = YamlConfigModule(ModuleDependencies(), {"config_path": str(main)})
    config = loader.get_config()

    assert config == {
        "modules": {
            "shared": {
                "last_writer": "root",  # root wins (applied last)
                "class": "root",
                "only_in_root": True,
                "only_in_a": True,  # A-only key preserved
                "only_in_b": True,  # B-only key preserved
                "include_writer": "B",  # B overwrites A among includes
            }
        }
    }


def test_includes_nested_includes_are_rejected(tmp_path: Path):
    """An included file that itself contains 'includes' raises an error."""
    main = tmp_path / "config.yaml"
    main.write_text(
        yaml.dump(
            {
                "includes": [{"path": "mid.yaml"}],
                "modules": {"main_module": {"class": "a.b.Main"}},
            }
        )
    )

    mid = tmp_path / "mid.yaml"
    mid.write_text(
        yaml.dump(
            {
                "includes": [{"path": "deep.yaml"}],
                "modules": {"mid_module": {"class": "a.b.Mid"}},
            }
        )
    )

    deep = tmp_path / "deep.yaml"
    deep.write_text(yaml.dump({"modules": {"deep_module": {"class": "a.b.Deep"}}}))

    loader = YamlConfigModule(ModuleDependencies(), {"config_path": str(main)})
    with pytest.raises(ValueError, match="Nested includes are not supported"):
        loader.get_config()
