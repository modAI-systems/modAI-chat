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


def test_config_loader_no_path_raises():
    """Test that config loader raises FileNotFoundError when no config_path is provided."""
    with pytest.raises(FileNotFoundError):
        YamlConfigModule(ModuleDependencies(), {})


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


def test_includes_override_tag_replaces_module(tmp_path: Path):
    """!override on a root module: root fully replaces the included one."""
    main = tmp_path / "config.yaml"
    main.write_text(
        "includes:\n"
        "  - path: extra.yaml\n"
        "modules:\n"
        "  health: !override\n"
        "    class: a.b.HealthRoot\n"
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


def test_includes_merge_default(tmp_path: Path):
    """Default (no tag) is merge: root wins on collision, include-only keys survive."""
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


def test_includes_merge_does_not_remove_existing_keys(
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


def test_includes_override_tag_on_nested_key(tmp_path: Path):
    """!override on a nested config key replaces that sub-tree without merging."""
    main = tmp_path / "config.yaml"
    main.write_text(
        "includes:\n"
        "  - path: extra.yaml\n"
        "modules:\n"
        "  health:\n"
        "    class: a.b.HealthRoot\n"
        "    config: !override\n"
        "      new_key: new_value\n"
    )

    included = tmp_path / "extra.yaml"
    included.write_text(
        yaml.dump(
            {
                "modules": {
                    "health": {
                        "class": "a.b.HealthIncluded",
                        "config": {"old_key": "old_value", "other_key": 42},
                    }
                }
            }
        )
    )

    loader = YamlConfigModule(ModuleDependencies(), {"config_path": str(main)})
    config = loader.get_config()

    # config is fully replaced; old_key from include is gone
    assert config == {
        "modules": {
            "health": {
                "class": "a.b.HealthRoot",
                "config": {"new_key": "new_value"},
            }
        }
    }


def test_includes_drop_tag_on_nested_key(tmp_path: Path):
    """!drop on a nested key removes that key from the merged result."""
    main = tmp_path / "config.yaml"
    main.write_text(
        "includes:\n"
        "  - path: extra.yaml\n"
        "modules:\n"
        "  health:\n"
        "    class: a.b.HealthRoot\n"
        "    config:\n"
        "      keep_key: kept\n"
        "      remove_key: !drop\n"
    )

    included = tmp_path / "extra.yaml"
    included.write_text(
        yaml.dump(
            {
                "modules": {
                    "health": {
                        "class": "a.b.HealthIncluded",
                        "config": {"keep_key": "base", "remove_key": "base_value"},
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
                "config": {"keep_key": "kept"},
            }
        }
    }


def test_default_list_merge(tmp_path: Path):
    """Lists are concatenated (base first, then incoming) by default."""
    main = tmp_path / "config.yaml"
    main.write_text(
        yaml.dump(
            {
                "includes": [{"path": "extra.yaml"}],
                "modules": {
                    "svc": {
                        "class": "a.b.Svc",
                        "config": {"items": ["c", "d"]},
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
                    "svc": {
                        "class": "a.b.Svc",
                        "config": {"items": ["a", "b"]},
                    }
                }
            }
        )
    )

    loader = YamlConfigModule(ModuleDependencies(), {"config_path": str(main)})
    config = loader.get_config()

    assert config == {
        "modules": {
            "svc": {
                "class": "a.b.Svc",
                "config": {"items": ["a", "b", "c", "d"]},
            }
        }
    }


def test_override_tag_on_list_replaces_base_list(tmp_path: Path):
    """!override on a list value replaces the base list instead of concatenating."""
    main = tmp_path / "config.yaml"
    main.write_text(
        "includes:\n"
        "  - path: extra.yaml\n"
        "modules:\n"
        "  svc:\n"
        "    class: a.b.Svc\n"
        "    config:\n"
        "      items: !override\n"
        "        - c\n"
        "        - d\n"
    )

    included = tmp_path / "extra.yaml"
    included.write_text(
        yaml.dump(
            {
                "modules": {
                    "svc": {
                        "class": "a.b.Svc",
                        "config": {"items": ["a", "b"]},
                    }
                }
            }
        )
    )

    loader = YamlConfigModule(ModuleDependencies(), {"config_path": str(main)})
    config = loader.get_config()

    assert config == {
        "modules": {
            "svc": {
                "class": "a.b.Svc",
                "config": {"items": ["c", "d"]},
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


def test_includes_drop_tag_removes_base_and_incoming(tmp_path: Path):
    """!drop on an incoming module removes both the base and incoming entries."""
    main = tmp_path / "config.yaml"
    main.write_text(
        "includes:\n"
        "  - path: extra.yaml\n"
        "modules:\n"
        "  health: !drop\n"
        "  other:\n"
        "    class: a.b.Other\n"
    )

    included = tmp_path / "extra.yaml"
    included.write_text(
        yaml.dump(
            {
                "modules": {
                    "health": {"class": "a.b.HealthIncluded"},
                }
            }
        )
    )

    loader = YamlConfigModule(ModuleDependencies(), {"config_path": str(main)})
    config = loader.get_config()

    assert "health" not in config["modules"]
    assert config == {"modules": {"other": {"class": "a.b.Other"}}}


def test_includes_drop_tag_no_existing_module(tmp_path: Path):
    """!drop on an incoming module with no prior base entry is simply not added."""
    main = tmp_path / "config.yaml"
    main.write_text("modules:\n  health: !drop\n  other:\n    class: a.b.Other\n")

    loader = YamlConfigModule(ModuleDependencies(), {"config_path": str(main)})
    config = loader.get_config()

    assert "health" not in config["modules"]
    assert config == {"modules": {"other": {"class": "a.b.Other"}}}


def test_includes_drop_tag_successor_modules_unaffected(tmp_path: Path):
    """Modules defined after the !drop module in the same config are loaded normally."""
    main = tmp_path / "config.yaml"
    main.write_text(
        "includes:\n"
        "  - path: extra.yaml\n"
        "modules:\n"
        "  health: !drop\n"
        "  successor:\n"
        "    class: a.b.Successor\n"
    )

    included = tmp_path / "extra.yaml"
    included.write_text(
        yaml.dump(
            {
                "modules": {
                    "health": {"class": "a.b.HealthIncluded"},
                    "from_include": {"class": "a.b.FromInclude"},
                }
            }
        )
    )

    loader = YamlConfigModule(ModuleDependencies(), {"config_path": str(main)})
    config = loader.get_config()

    assert "health" not in config["modules"]
    assert config == {
        "modules": {
            "from_include": {"class": "a.b.FromInclude"},
            "successor": {"class": "a.b.Successor"},
        }
    }
