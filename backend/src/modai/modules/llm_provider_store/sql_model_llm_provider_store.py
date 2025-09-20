"""
SQLAlchemy-based LLMProviderStore implementation for production usage.
This implementation uses pure SQLAlchemy for database persistence with isolated metadata.
"""

from typing import Any, List
from datetime import datetime
import uuid
import json

from sqlalchemy import (
    create_engine,
    MetaData,
    Table,
    Column,
    String,
    JSON,
    DateTime,
    select,
    update,
    delete,
)
from sqlalchemy.orm import Session, sessionmaker

from modai.module import ModuleDependencies, PersistenceModule
from modai.modules.llm_provider_store.module import LLMProviderStore, LLMProvider


class SQLAlchemyLLMProviderStore(LLMProviderStore, PersistenceModule):
    """
    Pure SQLAlchemy implementation of the LLMProviderStore module.

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
                "SQLAlchemyLLMProviderStore requires 'database_url' to be specified in config"
            )

        # Create isolated metadata for this module only
        self.metadata = MetaData()

        # Define the llm_providers table with isolated metadata
        self.llm_providers_table = Table(
            "llm_providers",
            self.metadata,
            Column("id", String(255), primary_key=True),
            Column("name", String(128), unique=True, index=True),
            Column("url", String(1000)),
            Column("properties", JSON),
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

    def _row_to_provider(self, row) -> LLMProvider:
        """Convert database row to LLMProvider dataclass"""
        # With JSON type, properties are automatically deserialized
        properties = row.properties if row.properties else {}

        return LLMProvider(
            id=row.id,
            name=row.name,
            url=row.url,
            properties=properties,
            created_at=row.created_at,
            updated_at=row.updated_at,
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
            statement = select(self.llm_providers_table).order_by(
                self.llm_providers_table.c.created_at
            )

            if offset:
                statement = statement.offset(offset)
            if limit:
                statement = statement.limit(limit)

            result = session.execute(statement)
            rows = result.fetchall()
            return [self._row_to_provider(row) for row in rows]

    async def get_provider(self, provider_id: str) -> LLMProvider | None:
        with self._get_session() as session:
            statement = select(self.llm_providers_table).where(
                self.llm_providers_table.c.id == provider_id
            )
            result = session.execute(statement)
            row = result.fetchone()
            if row:
                return self._row_to_provider(row)
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

            insert_stmt = self.llm_providers_table.insert().values(
                id=provider_id,
                name=name.strip(),
                url=url.strip(),
                properties=properties,
                created_at=now,
                updated_at=now,
            )

            session.execute(insert_stmt)
            session.commit()

            # Return the created provider
            return LLMProvider(
                id=provider_id,
                name=name.strip(),
                url=url.strip(),
                properties=properties,
                created_at=now,
                updated_at=now,
            )

    async def update_provider(
        self,
        provider_id: str,
        name: str,
        url: str,
        properties: dict[str, Any],
    ) -> LLMProvider | None:
        with self._get_session() as session:
            # Check if provider exists first
            check_stmt = select(self.llm_providers_table).where(
                self.llm_providers_table.c.id == provider_id
            )
            result = session.execute(check_stmt)
            existing_row = result.fetchone()

            if not existing_row:
                return None

            if properties is None:
                properties = {}

            now = datetime.now()

            # Update the provider
            update_stmt = (
                update(self.llm_providers_table)
                .where(self.llm_providers_table.c.id == provider_id)
                .values(
                    name=name.strip(),
                    url=url.strip(),
                    properties=properties,
                    updated_at=now,
                )
            )

            session.execute(update_stmt)
            session.commit()

            # Return the updated provider
            return LLMProvider(
                id=provider_id,
                name=name.strip(),
                url=url.strip(),
                properties=properties,
                created_at=existing_row.created_at,
                updated_at=now,
            )

    async def delete_provider(self, provider_id: str) -> None:
        with self._get_session() as session:
            # Idempotent operation
            delete_stmt = delete(self.llm_providers_table).where(
                self.llm_providers_table.c.id == provider_id
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
        # Example migration scenarios:
        # - Add new columns to existing tables
        # - Transform existing data formats
        # - Migrate from old property structures
        pass
