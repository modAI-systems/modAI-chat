"""
SQLModel-based UserSettingsStore implementation for production usage.
This implementation uses SQLModel/SQLAlchemy for database persistence.
"""

from typing import Any, Dict
from datetime import datetime

from sqlmodel import SQLModel, Field, Session, create_engine, select, delete
from sqlalchemy import String, JSON

from modai.module import ModuleDependencies, PersistenceModule
from modai.modules.user_settings_store.module import UserSettingsStore


class UserSettingsTable(SQLModel, table=True):
    """SQLModel table for user settings with separate rows for each module name"""

    __tablename__ = "user_settings"

    user_id: str = Field(primary_key=True, sa_type=String(255))
    module_name: str = Field(primary_key=True, sa_type=String(255))
    setting_data: Dict[str, Any] = Field(sa_type=JSON)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class SQLModelUserSettingsStore(UserSettingsStore, PersistenceModule):
    """
    SQLModel-based implementation of the UserSettingsStore module.

    This implementation uses SQLModel/SQLAlchemy for database persistence.
    Each instance is completely self-contained with its own database connection,
    tables, and session management.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

        # Get database URL from config with default
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

    async def get_user_settings(self, user_id: str) -> Dict[str, Dict[str, Any]]:
        """
        Retrieve all settings for a specific user.
        """
        self._validate_user_id(user_id)

        with self._get_session() as session:
            return await self._get_user_settings(session, user_id)

    async def _get_user_settings(
        self,
        session: Session,
        user_id: str,
    ) -> Dict[str, Dict[str, Any]]:
        statement = select(UserSettingsTable).where(
            UserSettingsTable.user_id == user_id
        )
        settings_records = session.exec(statement).all()

        if settings_records:
            return self._table_to_user_settings(settings_records)
        else:
            return {}

    async def get_user_setting_by_module(
        self, user_id: str, module_name: str
    ) -> Dict[str, Any]:
        """
        Retrieve user settings of a specific module.
        """
        self._validate_user_id(user_id)
        self._validate_module_name(module_name)

        with self._get_session() as session:
            settings_record = session.get(UserSettingsTable, (user_id, module_name))

            if settings_record and settings_record.setting_data:
                return settings_record.setting_data
            else:
                return {}

    async def update_user_settings(
        self, user_id: str, settings: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Update multiple module settings for a user (merge operation).
        """
        self._validate_user_id(user_id)
        if not isinstance(settings, dict):
            raise ValueError("settings must be a dictionary")

        with self._get_session() as session:
            for module_name, setting_data in settings.items():
                self._update_or_create_setting_by_module(
                    session, user_id, module_name, setting_data
                )

            session.commit()

            return await self._get_user_settings(session, user_id)

    async def update_user_setting_by_module(
        self, user_id: str, module_name: str, setting_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update module settings for a user (replace operation).
        """
        self._validate_user_id(user_id)
        self._validate_module_name(module_name)
        if not isinstance(setting_data, dict):
            raise ValueError("setting_data must be a dictionary")

        with self._get_session() as session:
            self._update_or_create_setting_by_module(
                session, user_id, module_name, setting_data
            )
            session.commit()
            return setting_data

    def _update_or_create_setting_by_module(
        self,
        session: Session,
        user_id: str,
        module_name: str,
        setting_data: Dict[str, Any],
    ) -> None:
        """
        Helper method to update or create a single setting by module record.
        """
        now = datetime.now()

        # Check if setting by module already exists
        existing_record = session.get(UserSettingsTable, (user_id, module_name))

        if existing_record:
            # Update existing setting by module
            existing_record.setting_data = setting_data
            existing_record.updated_at = now
            session.add(existing_record)
        else:
            # Create new setting by module record
            new_record = UserSettingsTable(
                user_id=user_id,
                module_name=module_name,
                setting_data=setting_data,
                created_at=now,
                updated_at=now,
            )
            session.add(new_record)

    async def delete_user_settings(self, user_id: str) -> None:
        """
        Delete all settings for a specific user.

        Raises:
            ValueError: If user_id is empty
        """
        self._validate_user_id(user_id)

        with self._get_session() as session:
            # Use bulk delete operation - more efficient than select + iterate + delete
            statement = delete(UserSettingsTable).where(
                UserSettingsTable.user_id == user_id
            )
            session.exec(statement)
            session.commit()

    async def delete_user_setting_by_module(
        self, user_id: str, module_name: str
    ) -> None:
        """
        Delete specific module settings for a user.
        """
        self._validate_user_id(user_id)
        self._validate_module_name(module_name)

        with self._get_session() as session:
            # Use bulk delete operation - more efficient than get + delete
            statement = delete(UserSettingsTable).where(
                UserSettingsTable.user_id == user_id,
                UserSettingsTable.module_name == module_name,
            )
            session.exec(statement)
            session.commit()

    async def user_has_settings(self, user_id: str) -> bool:
        """
        Check if a user has any settings.
        """
        self._validate_user_id(user_id)

        with self._get_session() as session:
            statement = select(UserSettingsTable).where(
                UserSettingsTable.user_id == user_id
            )
            settings_records = session.exec(statement).first()
            return settings_records is not None

    # Persistence Module implementation
    def migrate_data(self, software_version: str, previous_version: str | None) -> None:
        """
        Migrate data from old JSON-based schema to new separate column schema.
        """
        # TODO: Implement actual migration logic when needed
        pass

    def _table_to_user_settings(
        self, tables: list[UserSettingsTable]
    ) -> Dict[str, Dict[str, Any]]:
        """Convert list of UserSettingsTable rows to settings dictionary"""
        if not tables:
            raise ValueError("Cannot convert empty table list to UserSettings")

        settings = {}

        for table in tables:
            settings[table.module_name] = table.setting_data or {}

        return settings

    def _validate_user_id(self, user_id: str) -> None:
        """Validate that user_id is not empty"""
        if not user_id:
            raise ValueError("user_id cannot be empty")

    def _validate_module_name(self, module_name: str) -> None:
        """Validate that module_name is not empty"""
        if not module_name:
            raise ValueError("module_name cannot be empty")
