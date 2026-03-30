"""
SQLAlchemy-based CreditStore implementation for production usage.
This implementation uses pure SQLAlchemy for database persistence with isolated metadata.
"""

from datetime import datetime
from typing import Any

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    Integer,
    MetaData,
    String,
    Table,
    create_engine,
    select,
)
from sqlalchemy.orm import Session, sessionmaker

from modai.module import ModuleDependencies, PersistenceModule
from modai.modules.credit_store.module import CreditAccount, CreditStore


class SQLAlchemyCreditStore(CreditStore, PersistenceModule):
    """
    Pure SQLAlchemy implementation of the CreditStore module.

    Each instance is completely self-contained with its own database connection,
    tables, and session management.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

        database_url = config.get("database_url")
        if not database_url:
            raise ValueError(
                "SQLAlchemyCreditStore requires 'database_url' to be specified in config"
            )

        self.metadata = MetaData()

        self.credit_accounts_table = Table(
            "credit_accounts",
            self.metadata,
            Column("user_id", String(255), primary_key=True),
            Column("tier", String(50), nullable=False, default="free"),
            Column("tier_status", String(50), nullable=False, default="active"),
            Column("tier_credits_available", Integer, nullable=False, default=0),
            Column("tier_cost_eur", Float, nullable=False, default=0.0),
            Column("topup_credits_available", Integer, nullable=False, default=0),
            Column("topup_cost_eur", Float, nullable=False, default=0.0),
            Column("period_start", DateTime, nullable=False),
            Column("created_at", DateTime, default=datetime.now),
            Column("updated_at", DateTime, default=datetime.now),
        )

        self.engine = create_engine(database_url, echo=config.get("echo", False))
        self.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)

    def migrate_data(self, software_version: str, previous_version: str | None) -> None:
        pass

    def _get_session(self) -> Session:
        return self.SessionLocal()

    async def get_credit_account(self, user_id: str) -> CreditAccount | None:
        self._validate_user_id(user_id)

        with self._get_session() as session:
            statement = select(self.credit_accounts_table).where(
                self.credit_accounts_table.c.user_id == user_id
            )
            result = session.execute(statement)
            row = result.fetchone()

            if row is None:
                return None

            return self._row_to_credit_account(row)

    async def create_credit_account(self, account: CreditAccount) -> CreditAccount:
        self._validate_user_id(account.user_id)

        with self._get_session() as session:
            # Check if account already exists
            existing = session.execute(
                select(self.credit_accounts_table).where(
                    self.credit_accounts_table.c.user_id == account.user_id
                )
            ).fetchone()

            if existing:
                raise ValueError(
                    f"Credit account already exists for user {account.user_id}"
                )

            now = datetime.now()
            session.execute(
                self.credit_accounts_table.insert().values(
                    user_id=account.user_id,
                    tier=account.tier,
                    tier_status=account.tier_status,
                    tier_credits_available=account.tier_credits_available,
                    tier_cost_eur=account.tier_cost_eur,
                    topup_credits_available=account.topup_credits_available,
                    topup_cost_eur=account.topup_cost_eur,
                    period_start=account.period_start,
                    created_at=now,
                    updated_at=now,
                )
            )
            session.commit()

            return CreditAccount(
                user_id=account.user_id,
                tier=account.tier,
                tier_status=account.tier_status,
                tier_credits_available=account.tier_credits_available,
                tier_cost_eur=account.tier_cost_eur,
                topup_credits_available=account.topup_credits_available,
                topup_cost_eur=account.topup_cost_eur,
                period_start=account.period_start,
                created_at=now,
                updated_at=now,
            )

    async def update_credit_account(self, account: CreditAccount) -> CreditAccount:
        self._validate_user_id(account.user_id)

        with self._get_session() as session:
            existing = session.execute(
                select(self.credit_accounts_table).where(
                    self.credit_accounts_table.c.user_id == account.user_id
                )
            ).fetchone()

            if not existing:
                raise ValueError(
                    f"Credit account does not exist for user {account.user_id}"
                )

            now = datetime.now()
            session.execute(
                self.credit_accounts_table.update()
                .where(self.credit_accounts_table.c.user_id == account.user_id)
                .values(
                    tier=account.tier,
                    tier_status=account.tier_status,
                    tier_credits_available=account.tier_credits_available,
                    tier_cost_eur=account.tier_cost_eur,
                    topup_credits_available=account.topup_credits_available,
                    topup_cost_eur=account.topup_cost_eur,
                    period_start=account.period_start,
                    updated_at=now,
                )
            )
            session.commit()

            return CreditAccount(
                user_id=account.user_id,
                tier=account.tier,
                tier_status=account.tier_status,
                tier_credits_available=account.tier_credits_available,
                tier_cost_eur=account.tier_cost_eur,
                topup_credits_available=account.topup_credits_available,
                topup_cost_eur=account.topup_cost_eur,
                period_start=account.period_start,
                created_at=account.created_at,
                updated_at=now,
            )

    def _row_to_credit_account(self, row) -> CreditAccount:
        return CreditAccount(
            user_id=row.user_id,
            tier=row.tier,
            tier_status=row.tier_status,
            tier_credits_available=row.tier_credits_available,
            tier_cost_eur=row.tier_cost_eur,
            topup_credits_available=row.topup_credits_available,
            topup_cost_eur=row.topup_cost_eur,
            period_start=row.period_start,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
