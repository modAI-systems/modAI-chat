"""
UserStore Module: Provides user and group management capabilities.
- User CRUD operations
- Group CRUD operations
- User-group membership management
- User authentication data management
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, List
from datetime import datetime

from modai.module import ModaiModule, ModuleDependencies


@dataclass
class User:
    """User data model"""

    id: str
    email: str
    full_name: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class Group:
    """Group data model"""

    id: str
    name: str
    description: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class UserCredentials:
    """User authentication credentials"""

    user_id: str
    password_hash: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


class UserStore(ModaiModule, ABC):
    """
    Module Declaration for: UserStore (Plain Module)
    Provides user and group management operations.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

    # User Management Operations
    @abstractmethod
    async def create_user(
        self, email: str, full_name: str | None = None, **additional_fields
    ) -> User:
        """
        Creates a new user.

        Args:
            email: Unique email address for the user
            full_name: Optional full name
            **additional_fields: Additional user data

        Returns:
            Created User object

        Raises:
            ValueError: If email already exists or is invalid
        """
        pass

    @abstractmethod
    async def get_user_by_id(self, user_id: str) -> User | None:
        """
        Retrieves a user by their ID.

        Args:
            user_id: Unique identifier for the user

        Returns:
            User object if found, None otherwise
        """
        pass

    @abstractmethod
    async def get_user_by_email(self, email: str) -> User | None:
        """
        Retrieves a user by their email address.

        Args:
            email: Email address to search for

        Returns:
            User object if found, None otherwise
        """
        pass

    @abstractmethod
    async def update_user(self, user_id: str, **updates) -> User | None:
        """
        Updates user information.

        Args:
            user_id: ID of the user to update
            **updates: Fields to update

        Returns:
            Updated User object if found, None otherwise
        """
        pass

    @abstractmethod
    async def delete_user(self, user_id: str) -> bool:
        """
        Deletes a user.

        Args:
            user_id: ID of the user to delete

        Returns:
            True if user was deleted, False if user not found
        """
        pass

    @abstractmethod
    async def list_users(
        self,
        limit: int | None = None,
        offset: int | None = None,
    ) -> List[User]:
        """
        Lists users with optional pagination.

        Args:
            limit: Maximum number of users to return
            offset: Number of users to skip

        Returns:
            List of User objects
        """
        pass

    # Group Management Operations
    @abstractmethod
    async def create_group(
        self, name: str, description: str | None = None, **additional_fields
    ) -> Group:
        """
        Creates a new group.

        Args:
            name: Unique name for the group
            description: Optional description
            **additional_fields: Additional group data

        Returns:
            Created Group object

        Raises:
            ValueError: If group name already exists or is invalid
        """
        pass

    @abstractmethod
    async def get_group_by_id(self, group_id: str) -> Group | None:
        """
        Retrieves a group by its ID.

        Args:
            group_id: Unique identifier for the group

        Returns:
            Group object if found, None otherwise
        """
        pass

    @abstractmethod
    async def get_group_by_name(self, name: str) -> Group | None:
        """
        Retrieves a group by its name.

        Args:
            name: Group name to search for

        Returns:
            Group object if found, None otherwise
        """
        pass

    @abstractmethod
    async def update_group(self, group_id: str, **updates) -> Group | None:
        """
        Updates group information.

        Args:
            group_id: ID of the group to update
            **updates: Fields to update

        Returns:
            Updated Group object if found, None otherwise
        """
        pass

    @abstractmethod
    async def delete_group(self, group_id: str) -> bool:
        """
        Deletes a group.

        Args:
            group_id: ID of the group to delete

        Returns:
            True if group was deleted, False if group not found
        """
        pass

    @abstractmethod
    async def list_groups(
        self,
        limit: int | None = None,
        offset: int | None = None,
    ) -> List[Group]:
        """
        Lists groups with optional pagination.

        Args:
            limit: Maximum number of groups to return
            offset: Number of groups to skip

        Returns:
            List of Group objects
        """
        pass

    # User-Group Membership Operations
    @abstractmethod
    async def add_user_to_group(self, user_id: str, group_id: str) -> bool:
        """
        Adds a user to a group.

        Args:
            user_id: ID of the user to add
            group_id: ID of the group to add user to

        Returns:
            True if successful, False if user or group not found

        Raises:
            ValueError: If user is already in the group
        """
        pass

    @abstractmethod
    async def remove_user_from_group(self, user_id: str, group_id: str) -> bool:
        """
        Removes a user from a group.

        Args:
            user_id: ID of the user to remove
            group_id: ID of the group to remove user from

        Returns:
            True if successful, False if user not in group
        """
        pass

    @abstractmethod
    async def get_user_groups(self, user_id: str) -> List[Group]:
        """
        Gets all groups that a user belongs to.

        Args:
            user_id: ID of the user

        Returns:
            List of Group objects the user belongs to
        """
        pass

    @abstractmethod
    async def get_group_users(self, group_id: str) -> List[User]:
        """
        Gets all users in a group.

        Args:
            group_id: ID of the group

        Returns:
            List of User objects in the group
        """
        pass

    # User Credentials Operations
    @abstractmethod
    async def set_user_password(self, user_id: str, password_hash: str) -> bool:
        """
        Sets or updates a user's password hash.

        Args:
            user_id: ID of the user
            password_hash: Hashed password to store

        Returns:
            True if successful, False if user not found
        """
        pass

    @abstractmethod
    async def get_user_credentials(self, user_id: str) -> UserCredentials | None:
        """
        Retrieves user credentials.

        Args:
            user_id: ID of the user

        Returns:
            UserCredentials object if found, None otherwise
        """
        pass

    @abstractmethod
    async def delete_user_credentials(self, user_id: str) -> bool:
        """
        Deletes user credentials.

        Args:
            user_id: ID of the user

        Returns:
            True if credentials were deleted, False if not found
        """
        pass
