"""
SQLAlchemy-based UserStore implementation for production usage.
This implementation uses pure SQLAlchemy for database persistence with isolated metadata.
"""

from typing import Any, List
from datetime import datetime
import uuid

from sqlalchemy import (
    create_engine,
    MetaData,
    Table,
    Column,
    String,
    Integer,
    DateTime,
    ForeignKey,
    select,
    update,
    delete,
)
from sqlalchemy.orm import Session, sessionmaker

from modai.module import ModuleDependencies, PersistenceModule
from modai.modules.user_store.module import UserStore, User, Group, UserCredentials


class SQLAlchemyUserStore(UserStore, PersistenceModule):
    """
    Pure SQLAlchemy implementation of the UserStore module.

    This implementation uses pure SQLAlchemy for database persistence with isolated metadata
    to ensure only this module's tables are created and managed.
    Each instance is completely self-contained with its own database connection,
    tables, and session management.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

        # Get database URL from config - required
        database_url = config.get("database_url")
        if not database_url:
            raise ValueError(
                "SQLAlchemyUserStore requires 'database_url' to be specified in config"
            )

        # Create isolated metadata for this module only
        self.metadata = MetaData()

        # Define all tables with isolated metadata
        self.users_table = Table(
            "users",
            self.metadata,
            Column("id", String(255), primary_key=True),
            Column("email", String(255), unique=True, index=True),
            Column("full_name", String(255)),
            Column("created_at", DateTime, default=datetime.now),
            Column("updated_at", DateTime, default=datetime.now),
        )

        self.groups_table = Table(
            "groups",
            self.metadata,
            Column("id", String(255), primary_key=True),
            Column("name", String(255), unique=True, index=True),
            Column("description", String(500)),
            Column("created_at", DateTime, default=datetime.now),
            Column("updated_at", DateTime, default=datetime.now),
        )

        self.user_groups_table = Table(
            "user_groups",
            self.metadata,
            Column("id", Integer, primary_key=True),
            Column("user_id", String(255), ForeignKey("users.id"), index=True),
            Column("group_id", String(255), ForeignKey("groups.id"), index=True),
            Column("created_at", DateTime, default=datetime.now),
        )

        self.user_credentials_table = Table(
            "user_credentials",
            self.metadata,
            Column("user_id", String(255), ForeignKey("users.id"), primary_key=True),
            Column("password_hash", String(255)),
            Column("created_at", DateTime, default=datetime.now),
            Column("updated_at", DateTime, default=datetime.now),
        )

        # Create engine - completely self-contained
        self.engine = create_engine(database_url, echo=config.get("echo", False))

        # Create only this module's tables using isolated metadata
        self.metadata.create_all(self.engine)

        # Create session factory
        self.SessionLocal = sessionmaker(bind=self.engine)

    def _get_session(self) -> Session:
        """Get a new database session"""
        return self.SessionLocal()

    def _row_to_user(self, row) -> User:
        """Convert database row to User dataclass"""
        return User(
            id=row.id,
            email=row.email,
            full_name=row.full_name,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    def _row_to_group(self, row) -> Group:
        """Convert database row to Group dataclass"""
        return Group(
            id=row.id,
            name=row.name,
            description=row.description,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    def _row_to_credentials(self, row) -> UserCredentials:
        """Convert database row to UserCredentials dataclass"""
        return UserCredentials(
            user_id=row.user_id,
            password_hash=row.password_hash,
            created_at=row.created_at,
            updated_at=row.updated_at,
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
            check_stmt = select(self.users_table).where(
                self.users_table.c.email == email
            )
            result = session.execute(check_stmt)
            existing_user = result.fetchone()
            if existing_user:
                raise ValueError(f"Email '{email}' already exists")

            user_id = self._generate_user_id()
            now = datetime.now()

            insert_stmt = self.users_table.insert().values(
                id=user_id,
                email=email,
                full_name=full_name,
                created_at=now,
                updated_at=now,
            )

            session.execute(insert_stmt)
            session.commit()

            return User(
                id=user_id,
                email=email,
                full_name=full_name,
                created_at=now,
                updated_at=now,
            )

    async def get_user_by_id(self, user_id: str) -> User | None:
        with self._get_session() as session:
            stmt = select(self.users_table).where(self.users_table.c.id == user_id)
            result = session.execute(stmt)
            row = result.fetchone()
            if row:
                return self._row_to_user(row)
            return None

    async def get_user_by_email(self, email: str) -> User | None:
        with self._get_session() as session:
            stmt = select(self.users_table).where(self.users_table.c.email == email)
            result = session.execute(stmt)
            row = result.fetchone()
            if row:
                return self._row_to_user(row)
            return None

    async def update_user(self, user_id: str, **updates) -> User | None:
        with self._get_session() as session:
            # Check if user exists
            check_stmt = select(self.users_table).where(
                self.users_table.c.id == user_id
            )
            result = session.execute(check_stmt)
            existing_row = result.fetchone()
            if not existing_row:
                return None

            # Update user
            updates["updated_at"] = datetime.now()
            update_stmt = (
                update(self.users_table)
                .where(self.users_table.c.id == user_id)
                .values(**updates)
            )
            session.execute(update_stmt)
            session.commit()

            # Return updated user
            result = session.execute(check_stmt)
            updated_row = result.fetchone()
            return self._row_to_user(updated_row)

    async def delete_user(self, user_id: str) -> None:
        with self._get_session() as session:
            # Delete user credentials first
            delete_creds_stmt = delete(self.user_credentials_table).where(
                self.user_credentials_table.c.user_id == user_id
            )
            session.execute(delete_creds_stmt)

            # Delete user-group relationships
            delete_groups_stmt = delete(self.user_groups_table).where(
                self.user_groups_table.c.user_id == user_id
            )
            session.execute(delete_groups_stmt)

            # Delete user
            delete_user_stmt = delete(self.users_table).where(
                self.users_table.c.id == user_id
            )
            session.execute(delete_user_stmt)

            session.commit()

    async def list_users(
        self,
        limit: int | None = None,
        offset: int | None = None,
    ) -> List[User]:
        with self._get_session() as session:
            stmt = select(self.users_table)

            if offset:
                stmt = stmt.offset(offset)
            if limit:
                stmt = stmt.limit(limit)

            result = session.execute(stmt)
            rows = result.fetchall()
            return [self._row_to_user(row) for row in rows]

    # Group Management Operations
    async def create_group(
        self,
        name: str,
        description: str | None = None,
        **additional_fields,
    ) -> Group:
        with self._get_session() as session:
            # Check if group name already exists
            check_stmt = select(self.groups_table).where(
                self.groups_table.c.name == name
            )
            result = session.execute(check_stmt)
            existing_group = result.fetchone()
            if existing_group:
                raise ValueError(f"Group name '{name}' already exists")

            group_id = self._generate_group_id()
            now = datetime.now()

            insert_stmt = self.groups_table.insert().values(
                id=group_id,
                name=name,
                description=description,
                created_at=now,
                updated_at=now,
            )

            session.execute(insert_stmt)
            session.commit()

            return Group(
                id=group_id,
                name=name,
                description=description,
                created_at=now,
                updated_at=now,
            )

    async def get_group_by_id(self, group_id: str) -> Group | None:
        with self._get_session() as session:
            stmt = select(self.groups_table).where(self.groups_table.c.id == group_id)
            result = session.execute(stmt)
            row = result.fetchone()
            if row:
                return self._row_to_group(row)
            return None

    async def get_group_by_name(self, name: str) -> Group | None:
        with self._get_session() as session:
            stmt = select(self.groups_table).where(self.groups_table.c.name == name)
            result = session.execute(stmt)
            row = result.fetchone()
            if row:
                return self._row_to_group(row)
            return None

    async def update_group(self, group_id: str, **updates) -> Group | None:
        with self._get_session() as session:
            # Check if group exists
            check_stmt = select(self.groups_table).where(
                self.groups_table.c.id == group_id
            )
            result = session.execute(check_stmt)
            existing_row = result.fetchone()
            if not existing_row:
                return None

            # Update group
            updates["updated_at"] = datetime.now()
            update_stmt = (
                update(self.groups_table)
                .where(self.groups_table.c.id == group_id)
                .values(**updates)
            )
            session.execute(update_stmt)
            session.commit()

            # Return updated group
            result = session.execute(check_stmt)
            updated_row = result.fetchone()
            return self._row_to_group(updated_row)

    async def delete_group(self, group_id: str) -> None:
        with self._get_session() as session:
            # Delete user-group relationships first
            delete_user_groups_stmt = delete(self.user_groups_table).where(
                self.user_groups_table.c.group_id == group_id
            )
            session.execute(delete_user_groups_stmt)

            # Delete group
            delete_group_stmt = delete(self.groups_table).where(
                self.groups_table.c.id == group_id
            )
            session.execute(delete_group_stmt)

            session.commit()

    async def list_groups(
        self,
        limit: int | None = None,
        offset: int | None = None,
    ) -> List[Group]:
        with self._get_session() as session:
            stmt = select(self.groups_table)

            if offset:
                stmt = stmt.offset(offset)
            if limit:
                stmt = stmt.limit(limit)

            result = session.execute(stmt)
            rows = result.fetchall()
            return [self._row_to_group(row) for row in rows]

    # User-Group Membership Operations
    async def add_user_to_group(self, user_id: str, group_id: str) -> None:
        with self._get_session() as session:
            # Verify user exists
            user_check = select(self.users_table).where(
                self.users_table.c.id == user_id
            )
            user_result = session.execute(user_check)
            if not user_result.fetchone():
                raise ValueError(f"User with ID '{user_id}' not found")

            # Verify group exists
            group_check = select(self.groups_table).where(
                self.groups_table.c.id == group_id
            )
            group_result = session.execute(group_check)
            if not group_result.fetchone():
                raise ValueError(f"Group with ID '{group_id}' not found")

            # Check if relationship already exists (idempotent)
            existing_check = select(self.user_groups_table).where(
                self.user_groups_table.c.user_id == user_id,
                self.user_groups_table.c.group_id == group_id,
            )
            existing_result = session.execute(existing_check)
            if existing_result.fetchone():
                return  # Already in group

            # Create relationship
            insert_stmt = self.user_groups_table.insert().values(
                user_id=user_id,
                group_id=group_id,
                created_at=datetime.now(),
            )
            session.execute(insert_stmt)
            session.commit()

    async def remove_user_from_group(self, user_id: str, group_id: str) -> None:
        with self._get_session() as session:
            # Find and delete relationship (idempotent)
            delete_stmt = delete(self.user_groups_table).where(
                self.user_groups_table.c.user_id == user_id,
                self.user_groups_table.c.group_id == group_id,
            )
            session.execute(delete_stmt)
            session.commit()

    async def get_user_groups(self, user_id: str) -> List[Group]:
        with self._get_session() as session:
            stmt = (
                select(self.groups_table)
                .join(
                    self.user_groups_table,
                    self.groups_table.c.id == self.user_groups_table.c.group_id,
                )
                .where(self.user_groups_table.c.user_id == user_id)
            )

            result = session.execute(stmt)
            rows = result.fetchall()
            return [self._row_to_group(row) for row in rows]

    async def get_group_users(self, group_id: str) -> List[User]:
        with self._get_session() as session:
            stmt = (
                select(self.users_table)
                .join(
                    self.user_groups_table,
                    self.users_table.c.id == self.user_groups_table.c.user_id,
                )
                .where(self.user_groups_table.c.group_id == group_id)
            )

            result = session.execute(stmt)
            rows = result.fetchall()
            return [self._row_to_user(row) for row in rows]

    # User Credentials Operations
    async def set_user_password(self, user_id: str, password_hash: str) -> None:
        with self._get_session() as session:
            # Verify user exists
            user_check = select(self.users_table).where(
                self.users_table.c.id == user_id
            )
            user_result = session.execute(user_check)
            if not user_result.fetchone():
                raise ValueError(f"User with ID '{user_id}' not found")

            now = datetime.now()

            # Check if credentials already exist
            check_stmt = select(self.user_credentials_table).where(
                self.user_credentials_table.c.user_id == user_id
            )
            result = session.execute(check_stmt)
            existing_creds = result.fetchone()

            if existing_creds:
                # Update existing credentials
                update_stmt = (
                    update(self.user_credentials_table)
                    .where(self.user_credentials_table.c.user_id == user_id)
                    .values(password_hash=password_hash, updated_at=now)
                )
                session.execute(update_stmt)
            else:
                # Create new credentials
                insert_stmt = self.user_credentials_table.insert().values(
                    user_id=user_id,
                    password_hash=password_hash,
                    created_at=now,
                    updated_at=now,
                )
                session.execute(insert_stmt)

            session.commit()

    async def get_user_credentials(self, user_id: str) -> UserCredentials | None:
        with self._get_session() as session:
            stmt = select(self.user_credentials_table).where(
                self.user_credentials_table.c.user_id == user_id
            )
            result = session.execute(stmt)
            row = result.fetchone()
            if row:
                return self._row_to_credentials(row)
            return None

    async def delete_user_credentials(self, user_id: str) -> None:
        with self._get_session() as session:
            # Idempotent operation
            delete_stmt = delete(self.user_credentials_table).where(
                self.user_credentials_table.c.user_id == user_id
            )
            session.execute(delete_stmt)
            session.commit()

    # Persistence Module implementation
    def migrate_data(self, software_version: str, previous_version: str | None) -> None:
        """
        Performs data migration for this module.
        Currently empty as requested - no actual migration logic yet.
        """
        # TODO: Implement actual migration logic when needed
        pass
