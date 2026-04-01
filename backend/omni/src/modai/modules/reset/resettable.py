from abc import ABC, abstractmethod


class Resettable(ABC):
    """
    Interface for modules that can reset all of their managed data to an empty state.

    Any module whose data should be wiped by the reset endpoint must
    implement this interface and provide a domain-specific reset() implementation.
    """

    @abstractmethod
    def reset(self) -> None:
        """
        Deletes all data managed by this module, leaving the storage in a clean,
        empty-but-functional state (tables exist but contain no rows).

        Implementations must be synchronous and must not raise on an already-empty
        store. Any unexpected failure should propagate as an exception so the
        caller can log and report it.
        """
        pass
