"""
SQLModel-based LLMProviderStore implementation for production usage.
This implementation uses SQLModel/SQLAlchemy for database persistence.
"""

from typing import Any, List
from datetime import datetime
import uuid
import json

from sqlmodel import SQLModel, Field, Session, create_engine, select
from sqlalchemy import String, JSON
from sqlalchemy.exc import StatementError

from modai.module import ModuleDependencies, PersistenceModule
from modai.modules.llm_provider_store.module import LLMProviderStore, LLMProvider


class LLMProviderTable(SQLModel, table=True):
    """SQLModel table for LLM providers"""

    __tablename__ = "llm_providers"

    id: str = Field(primary_key=True)
    name: str = Field(unique=True, index=True, sa_type=String(128))
    url: str = Field(sa_type=String(1000))
    properties: dict[str, Any] = Field(sa_type=JSON)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class SQLModelLLMProviderStore(LLMProviderStore, PersistenceModule):

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

        # Get database URL from config - required
        database_url = config.get("database_url")
        if not database_url:
            raise ValueError(
                "SQLModelLLMProviderStore requires 'database_url' to be specified in config"
            )

        # Create engine - completely self-contained
        self.engine = create_engine(database_url, echo=config.get("echo", False))

        # Create all tables
        SQLModel.metadata.create_all(self.engine)

    def _get_session(self) -> Session:
        """Get a new database session"""
        return Session(self.engine)

    def _provider_table_to_provider(
        self, provider_table: LLMProviderTable
    ) -> LLMProvider:
        """Convert LLMProviderTable to LLMProvider dataclass"""
        # With JSON type, properties are automatically deserialized
        properties = provider_table.properties if provider_table.properties else {}

        return LLMProvider(
            id=provider_table.id,
            name=provider_table.name,
            url=provider_table.url,
            properties=properties,
            created_at=provider_table.created_at,
            updated_at=provider_table.updated_at,
        )

    def _generate_provider_id(self) -> str:
        """Generate a unique provider ID"""
        return str(uuid.uuid4())

    def _validate_properties(self, properties: dict[str, Any]) -> None:
        """Validate that properties can be JSON serialized"""
        try:
            json.dumps(properties)
        except (TypeError, ValueError, RuntimeError) as e:
            raise ValueError(f"Properties must be JSON serializable: {e}")

    async def get_providers(
        self,
        limit: int | None = None,
        offset: int | None = None,
    ) -> List[LLMProvider]:
        with self._get_session() as session:
            statement = select(LLMProviderTable).order_by(LLMProviderTable.created_at)

            if offset:
                statement = statement.offset(offset)
            if limit:
                statement = statement.limit(limit)

            provider_tables = session.exec(statement).all()
            return [
                self._provider_table_to_provider(provider_table)
                for provider_table in provider_tables
            ]

    async def get_provider(self, provider_id: str) -> LLMProvider | None:
        with self._get_session() as session:
            provider_table = session.get(LLMProviderTable, provider_id)
            if provider_table:
                return self._provider_table_to_provider(provider_table)
            return None

    async def add_provider(
        self, name: str, url: str, properties: dict[str, Any]
    ) -> LLMProvider:
        provider_id = self._generate_provider_id()
        with self._get_session() as session:
            # Validate and prepare properties
            if properties is None:
                properties = {}

            now = datetime.now()

            provider_table = LLMProviderTable(
                id=provider_id,
                name=name.strip(),
                url=url.strip(),
                properties=properties,
                created_at=now,
                updated_at=now,
            )

            session.add(provider_table)
            session.commit()
            session.refresh(provider_table)

            return self._provider_table_to_provider(provider_table)

    async def update_provider(
        self,
        provider_id: str,
        name: str,
        url: str,
        properties: dict[str, Any],
    ) -> LLMProvider | None:
        with self._get_session() as session:
            provider_table = session.get(LLMProviderTable, provider_id)
            if not provider_table:
                return None

            if properties is None:
                properties = {}

            # Update timestamp
            provider_table.name = name.strip()
            provider_table.url = url.strip()
            provider_table.properties = properties
            provider_table.updated_at = datetime.now()

            session.add(provider_table)
            session.commit()
            session.refresh(provider_table)

            return self._provider_table_to_provider(provider_table)

    async def delete_provider(self, provider_id: str) -> None:
        with self._get_session() as session:
            # Idempotent operation
            provider_table = session.get(LLMProviderTable, provider_id)
            if provider_table:
                session.delete(provider_table)
                session.commit()

    # Persistence Module implementation
    def migrate_data(self, software_version: str, previous_version: str | None) -> None:
        """
        Performs data migration for this module.
        Currently empty as requested - no actual migration logic yet.
        """
        # TODO: Implement actual migration logic when needed
        # Example migration scenarios:
        # - Add new columns to existing tables
        # - Transform existing data formats
        # - Migrate from old property structures
        pass
