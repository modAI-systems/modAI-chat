"""
SQLModel-based UserStore implementation for production usage.
This implementation uses SQLModel/SQLAlchemy for database persistence.
"""

from typing import Any, List
from datetime import datetime
import uuid

from sqlmodel import SQLModel, Field, Session, create_engine, select, col
from sqlalchemy import String

from modai.module import ModuleDependencies, PersistenceModule
from modai.modules.user_store.module import UserStore, User, Group, UserCredentials


class UserTable(SQLModel, table=True):
    """SQLModel table for users"""

    __tablename__ = "users"

    id: str = Field(primary_key=True)
    email: str = Field(unique=True, index=True, sa_type=String(255))
    full_name: str | None = Field(default=None, sa_type=String(255))
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class GroupTable(SQLModel, table=True):
    """SQLModel table for groups"""

    __tablename__ = "groups"

    id: str = Field(primary_key=True)
    name: str = Field(unique=True, index=True, sa_type=String(255))
    description: str | None = Field(default=None, sa_type=String(500))
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class UserGroupTable(SQLModel, table=True):
    """SQLModel table for user-group relationships"""

    __tablename__ = "user_groups"

    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    group_id: str = Field(foreign_key="groups.id", index=True)
    created_at: datetime = Field(default_factory=datetime.now)


class UserCredentialsTable(SQLModel, table=True):
    """SQLModel table for user credentials"""

    __tablename__ = "user_credentials"

    user_id: str = Field(primary_key=True, foreign_key="users.id")
    password_hash: str = Field(sa_type=String(255))
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class SQLModelUserStore(UserStore, PersistenceModule):
    """
    SQLModel-based implementation of the UserStore module.

    This implementation uses SQLModel/SQLAlchemy for database persistence.
    Each instance is completely self-contained with its own database connection,
    tables, and session management.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

        # Get database URL from config - required
        database_url = config.get("database_url")
        if not database_url:
            raise ValueError(
                "SQLModelUserStore requires 'database_url' to be specified in config"
            )

        # Create engine - completely self-contained
        self.engine = create_engine(database_url, echo=config.get("echo", False))

        # Create all tables
        SQLModel.metadata.create_all(self.engine)

    def _get_session(self) -> Session:
        """Get a new database session"""
        return Session(self.engine)

    def _user_table_to_user(self, user_table: UserTable) -> User:
        """Convert UserTable to User dataclass"""
        return User(
            id=user_table.id,
            email=user_table.email,
            full_name=user_table.full_name,
            created_at=user_table.created_at,
            updated_at=user_table.updated_at,
        )

    def _group_table_to_group(self, group_table: GroupTable) -> Group:
        """Convert GroupTable to Group dataclass"""
        return Group(
            id=group_table.id,
            name=group_table.name,
            description=group_table.description,
            created_at=group_table.created_at,
            updated_at=group_table.updated_at,
        )

    def _credentials_table_to_credentials(
        self, cred_table: UserCredentialsTable
    ) -> UserCredentials:
        """Convert UserCredentialsTable to UserCredentials dataclass"""
        return UserCredentials(
            user_id=cred_table.user_id,
            password_hash=cred_table.password_hash,
            created_at=cred_table.created_at,
            updated_at=cred_table.updated_at,
        )

    def _generate_user_id(self) -> str:
        """Generate a unique user ID"""
        return str(uuid.uuid4())

    def _generate_group_id(self) -> str:
        """Generate a unique group ID"""
        return str(uuid.uuid4())

    # User Management Operations
    async def create_user(
        self,
        email: str,
        full_name: str | None = None,
        **additional_fields,
    ) -> User:
        with self._get_session() as session:
            # Check if email already exists
            existing_user = session.exec(
                select(UserTable).where(UserTable.email == email)
            ).first()
            if existing_user:
                raise ValueError(f"Email '{email}' already exists")

            user_id = self._generate_user_id()
            now = datetime.now()

            user_table = UserTable(
                id=user_id,
                email=email,
                full_name=full_name,
                created_at=now,
                updated_at=now,
            )

            session.add(user_table)
            session.commit()
            session.refresh(user_table)

            return self._user_table_to_user(user_table)

    async def get_user_by_id(self, user_id: str) -> User | None:
        with self._get_session() as session:
            user_table = session.get(UserTable, user_id)
            if user_table:
                return self._user_table_to_user(user_table)
            return None

    async def get_user_by_email(self, email: str) -> User | None:
        with self._get_session() as session:
            user_table = session.exec(
                select(UserTable).where(UserTable.email == email)
            ).first()
            if user_table:
                return self._user_table_to_user(user_table)
            return None

    async def update_user(self, user_id: str, **updates) -> User | None:
        with self._get_session() as session:
            user_table = session.get(UserTable, user_id)
            if not user_table:
                return None

            # Update fields
            for key, value in updates.items():
                if hasattr(user_table, key):
                    setattr(user_table, key, value)

            user_table.updated_at = datetime.now()
            session.add(user_table)
            session.commit()
            session.refresh(user_table)

            return self._user_table_to_user(user_table)

    async def delete_user(self, user_id: str) -> None:
        with self._get_session() as session:
            # Delete user credentials first
            session.exec(
                select(UserCredentialsTable).where(
                    UserCredentialsTable.user_id == user_id
                )
            ).first()
            if cred := session.exec(
                select(UserCredentialsTable).where(
                    UserCredentialsTable.user_id == user_id
                )
            ).first():
                session.delete(cred)

            # Delete user-group relationships
            user_groups = session.exec(
                select(UserGroupTable).where(UserGroupTable.user_id == user_id)
            ).all()
            for user_group in user_groups:
                session.delete(user_group)

            # Delete user
            user_table = session.get(UserTable, user_id)
            if user_table:
                session.delete(user_table)

            session.commit()

    async def list_users(
        self,
        limit: int | None = None,
        offset: int | None = None,
    ) -> List[User]:
        with self._get_session() as session:
            statement = select(UserTable)

            if offset:
                statement = statement.offset(offset)
            if limit:
                statement = statement.limit(limit)

            user_tables = session.exec(statement).all()
            return [self._user_table_to_user(user_table) for user_table in user_tables]

    # Group Management Operations
    async def create_group(
        self,
        name: str,
        description: str | None = None,
        **additional_fields,
    ) -> Group:
        with self._get_session() as session:
            # Check if group name already exists
            existing_group = session.exec(
                select(GroupTable).where(GroupTable.name == name)
            ).first()
            if existing_group:
                raise ValueError(f"Group name '{name}' already exists")

            group_id = self._generate_group_id()
            now = datetime.now()

            group_table = GroupTable(
                id=group_id,
                name=name,
                description=description,
                created_at=now,
                updated_at=now,
            )

            session.add(group_table)
            session.commit()
            session.refresh(group_table)

            return self._group_table_to_group(group_table)

    async def get_group_by_id(self, group_id: str) -> Group | None:
        with self._get_session() as session:
            group_table = session.get(GroupTable, group_id)
            if group_table:
                return self._group_table_to_group(group_table)
            return None

    async def get_group_by_name(self, name: str) -> Group | None:
        with self._get_session() as session:
            group_table = session.exec(
                select(GroupTable).where(GroupTable.name == name)
            ).first()
            if group_table:
                return self._group_table_to_group(group_table)
            return None

    async def update_group(self, group_id: str, **updates) -> Group | None:
        with self._get_session() as session:
            group_table = session.get(GroupTable, group_id)
            if not group_table:
                return None

            # Update fields
            for key, value in updates.items():
                if hasattr(group_table, key):
                    setattr(group_table, key, value)

            group_table.updated_at = datetime.now()
            session.add(group_table)
            session.commit()
            session.refresh(group_table)

            return self._group_table_to_group(group_table)

    async def delete_group(self, group_id: str) -> None:
        with self._get_session() as session:
            # Delete user-group relationships first
            user_groups = session.exec(
                select(UserGroupTable).where(UserGroupTable.group_id == group_id)
            ).all()
            for user_group in user_groups:
                session.delete(user_group)

            # Delete group
            group_table = session.get(GroupTable, group_id)
            if group_table:
                session.delete(group_table)

            session.commit()

    async def list_groups(
        self,
        limit: int | None = None,
        offset: int | None = None,
    ) -> List[Group]:
        with self._get_session() as session:
            statement = select(GroupTable)

            if offset:
                statement = statement.offset(offset)
            if limit:
                statement = statement.limit(limit)

            group_tables = session.exec(statement).all()
            return [
                self._group_table_to_group(group_table) for group_table in group_tables
            ]

    # User-Group Membership Operations
    async def add_user_to_group(self, user_id: str, group_id: str) -> None:
        with self._get_session() as session:
            # Verify user exists
            user_table = session.get(UserTable, user_id)
            if not user_table:
                raise ValueError(f"User with ID '{user_id}' not found")

            # Verify group exists
            group_table = session.get(GroupTable, group_id)
            if not group_table:
                raise ValueError(f"Group with ID '{group_id}' not found")

            # Check if relationship already exists (idempotent)
            existing = session.exec(
                select(UserGroupTable).where(
                    UserGroupTable.user_id == user_id,
                    UserGroupTable.group_id == group_id,
                )
            ).first()

            if existing:
                return  # Already in group

            # Create relationship
            user_group = UserGroupTable(
                user_id=user_id,
                group_id=group_id,
                created_at=datetime.now(),
            )
            session.add(user_group)
            session.commit()

    async def remove_user_from_group(self, user_id: str, group_id: str) -> None:
        with self._get_session() as session:
            # Find and delete relationship (idempotent)
            user_group = session.exec(
                select(UserGroupTable).where(
                    UserGroupTable.user_id == user_id,
                    UserGroupTable.group_id == group_id,
                )
            ).first()

            if user_group:
                session.delete(user_group)
                session.commit()

    async def get_user_groups(self, user_id: str) -> List[Group]:
        with self._get_session() as session:
            statement = (
                select(GroupTable)
                .join(UserGroupTable, GroupTable.id == UserGroupTable.group_id)
                .where(UserGroupTable.user_id == user_id)
            )

            group_tables = session.exec(statement).all()
            return [
                self._group_table_to_group(group_table) for group_table in group_tables
            ]

    async def get_group_users(self, group_id: str) -> List[User]:
        with self._get_session() as session:
            statement = (
                select(UserTable)
                .join(UserGroupTable, UserTable.id == UserGroupTable.user_id)
                .where(UserGroupTable.group_id == group_id)
            )

            user_tables = session.exec(statement).all()
            return [self._user_table_to_user(user_table) for user_table in user_tables]

    # User Credentials Operations
    async def set_user_password(self, user_id: str, password_hash: str) -> None:
        with self._get_session() as session:
            # Verify user exists
            user_table = session.get(UserTable, user_id)
            if not user_table:
                raise ValueError(f"User with ID '{user_id}' not found")

            now = datetime.now()

            # Check if credentials already exist
            existing_creds = session.get(UserCredentialsTable, user_id)
            if existing_creds:
                # Update existing credentials
                existing_creds.password_hash = password_hash
                existing_creds.updated_at = now
                session.add(existing_creds)
            else:
                # Create new credentials
                credentials = UserCredentialsTable(
                    user_id=user_id,
                    password_hash=password_hash,
                    created_at=now,
                    updated_at=now,
                )
                session.add(credentials)

            session.commit()

    async def get_user_credentials(self, user_id: str) -> UserCredentials | None:
        with self._get_session() as session:
            cred_table = session.get(UserCredentialsTable, user_id)
            if cred_table:
                return self._credentials_table_to_credentials(cred_table)
            return None

    async def delete_user_credentials(self, user_id: str) -> None:
        with self._get_session() as session:
            # Idempotent operation
            cred_table = session.get(UserCredentialsTable, user_id)
            if cred_table:
                session.delete(cred_table)
                session.commit()

    # Persistence Module implementation
    def migrate_data(self, software_version: str, previous_version: str | None) -> None:
        """
        Performs data migration for this module.
        Currently empty as requested - no actual migration logic yet.
        """
        # TODO: Implement actual migration logic when needed
        pass
