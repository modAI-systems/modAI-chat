from abc import ABC, abstractmethod
from typing import Any

from modai.module import ModaiModule, ModuleDependencies


## This is a boostrap Module meaning that it is not changable via the usual
## module loading mechanism


class StartupConfig(ModaiModule, ABC):
    """
    Module Declaration for: Startup Configuration
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

    @abstractmethod
    def get_config(self) -> dict[str, Any]:
        """
        Returns the initial config for the system (usually parsed from the config file)
        """
        pass
