"""
Simple in-memory UserStore implementation for development and testing purposes.
This implementation stores all data in memory and will be lost when the application restarts.
"""

from typing import Any, List
from datetime import datetime
import uuid

from modai.module import ModuleDependencies
from modai.modules.user_store.module import UserStore, User, Group, UserCredentials


class InMemoryUserStore(UserStore):
    """
    Simple in-memory implementation of the UserStore module.

    This implementation stores all user and group data in memory dictionaries.
    Data will be lost when the application restarts.

    Suitable for development, testing, and prototyping.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

        # In-memory storage
        self.users = {}  # user_id -> User
        self.groups = {}  # group_id -> Group
        self.user_groups = {}  # user_id -> set of group_ids
        self.group_users = {}  # group_id -> set of user_ids
        self.user_credentials = {}  # user_id -> UserCredentials

        # Auto-incrementing IDs (in a real implementation, you'd use proper UUID or database IDs)
        self._next_user_id = 1
        self._next_group_id = 1

    def _generate_user_id(self) -> str:
        """Generate a unique user ID"""
        user_id = str(uuid.uuid4())
        return user_id

    def _generate_group_id(self) -> str:
        """Generate a unique group ID"""
        group_id = str(uuid.uuid4())
        return group_id

    # User Management Operations
    async def create_user(
        self,
        email: str,
        full_name: str | None = None,
        **additional_fields,
    ) -> User:
        # Check if email already exists
        for user in self.users.values():
            if user.email == email:
                raise ValueError(f"Email '{email}' already exists")

        user_id = self._generate_user_id()
        now = datetime.now()

        user = User(
            id=user_id,
            email=email,
            full_name=full_name,
            created_at=now,
            updated_at=now,
        )

        self.users[user_id] = user
        self.user_groups[user_id] = set()

        return user

    async def get_user_by_id(self, user_id: str) -> User | None:
        return self.users.get(user_id)

    async def get_user_by_email(self, email: str) -> User | None:
        for user in self.users.values():
            if user.email == email:
                return user
        return None

    async def update_user(self, user_id: str, **updates) -> User | None:
        if user_id not in self.users:
            return None

        user = self.users[user_id]

        # Update fields
        for key, value in updates.items():
            if hasattr(user, key):
                setattr(user, key, value)

        user.updated_at = datetime.now()
        return user

    async def delete_user(self, user_id: str) -> bool:
        if user_id not in self.users:
            return False

        # Remove user
        del self.users[user_id]

        # Clean up user-group relationships
        if user_id in self.user_groups:
            # Remove user from all groups
            for group_id in self.user_groups[user_id]:
                if group_id in self.group_users:
                    self.group_users[group_id].discard(user_id)
            del self.user_groups[user_id]

        # Clean up credentials
        if user_id in self.user_credentials:
            del self.user_credentials[user_id]

        return True

    async def list_users(
        self,
        limit: int | None = None,
        offset: int | None = None,
    ) -> List[User]:
        users = list(self.users.values())

        # Apply pagination
        start = offset or 0
        end = start + limit if limit else None

        return users[start:end]

    # Group Management Operations
    async def create_group(
        self,
        name: str,
        description: str | None = None,
        **additional_fields,
    ) -> Group:
        # Check if group name already exists
        for group in self.groups.values():
            if group.name == name:
                raise ValueError(f"Group name '{name}' already exists")

        group_id = self._generate_group_id()
        now = datetime.now()

        group = Group(
            id=group_id,
            name=name,
            description=description,
            created_at=now,
            updated_at=now,
        )

        self.groups[group_id] = group
        self.group_users[group_id] = set()

        return group

    async def get_group_by_id(self, group_id: str) -> Group | None:
        return self.groups.get(group_id)

    async def get_group_by_name(self, name: str) -> Group | None:
        for group in self.groups.values():
            if group.name == name:
                return group
        return None

    async def update_group(self, group_id: str, **updates) -> Group | None:
        if group_id not in self.groups:
            return None

        group = self.groups[group_id]

        # Update fields
        for key, value in updates.items():
            if hasattr(group, key):
                setattr(group, key, value)

        group.updated_at = datetime.now()
        return group

    async def delete_group(self, group_id: str) -> bool:
        if group_id not in self.groups:
            return False

        # Remove group
        del self.groups[group_id]

        # Clean up user-group relationships
        if group_id in self.group_users:
            # Remove group from all users
            for user_id in self.group_users[group_id]:
                if user_id in self.user_groups:
                    self.user_groups[user_id].discard(group_id)
            del self.group_users[group_id]

        return True

    async def list_groups(
        self,
        limit: int | None = None,
        offset: int | None = None,
    ) -> List[Group]:
        groups = list(self.groups.values())

        # Apply pagination
        start = offset or 0
        end = start + limit if limit else None

        return groups[start:end]

    # User-Group Membership Operations
    async def add_user_to_group(self, user_id: str, group_id: str) -> bool:
        if user_id not in self.users or group_id not in self.groups:
            return False

        if group_id in self.user_groups.get(user_id, set()):
            raise ValueError(f"User {user_id} is already in group {group_id}")

        # Ensure user_groups entry exists
        if user_id not in self.user_groups:
            self.user_groups[user_id] = set()

        # Ensure group_users entry exists
        if group_id not in self.group_users:
            self.group_users[group_id] = set()

        self.user_groups[user_id].add(group_id)
        self.group_users[group_id].add(user_id)

        return True

    async def remove_user_from_group(self, user_id: str, group_id: str) -> bool:
        if user_id not in self.user_groups or group_id not in self.user_groups.get(
            user_id, set()
        ):
            return False

        self.user_groups[user_id].remove(group_id)
        if group_id in self.group_users:
            self.group_users[group_id].discard(user_id)

        return True

    async def get_user_groups(self, user_id: str) -> List[Group]:
        if user_id not in self.user_groups:
            return []

        group_ids = self.user_groups[user_id]
        return [self.groups[gid] for gid in group_ids if gid in self.groups]

    async def get_group_users(self, group_id: str) -> List[User]:
        if group_id not in self.group_users:
            return []

        user_ids = self.group_users[group_id]
        return [self.users[uid] for uid in user_ids if uid in self.users]

    # User Credentials Operations
    async def set_user_password(self, user_id: str, password_hash: str) -> bool:
        if user_id not in self.users:
            return False

        now = datetime.now()

        if user_id in self.user_credentials:
            # Update existing credentials
            credentials = self.user_credentials[user_id]
            credentials.password_hash = password_hash
            credentials.updated_at = now
        else:
            # Create new credentials
            self.user_credentials[user_id] = UserCredentials(
                user_id=user_id,
                password_hash=password_hash,
                created_at=now,
                updated_at=now,
            )

        return True

    async def get_user_credentials(self, user_id: str) -> UserCredentials | None:
        return self.user_credentials.get(user_id)

    async def delete_user_credentials(self, user_id: str) -> bool:
        if user_id in self.user_credentials:
            del self.user_credentials[user_id]
            return True
        return False
