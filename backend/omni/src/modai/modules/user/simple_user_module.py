import logging
from typing import Any
from fastapi import Request, HTTPException
from modai.module import ModuleDependencies
from modai.modules.user.module import UserModule, UserResponse
from modai.modules.session.module import SessionModule
from modai.modules.user_store.module import UserStore


class SimpleUserModule(UserModule):
    """Simple implementation of the User module with JIT user provisioning."""

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.logger = logging.getLogger(__name__)

        # Get required dependencies
        self.session_module: SessionModule = dependencies.modules.get("session")
        self.user_store: UserStore = dependencies.modules.get("user_store")

        if not self.session_module:
            raise ValueError("User module requires a session module dependency")
        if not self.user_store:
            raise ValueError("User module requires a user_store module dependency")

    async def get_current_user(self, request: Request) -> UserResponse:
        """
        Retrieves the current logged-in user.

        Validates the session and returns the user information.
        Performs JIT (Just-In-Time) provisioning if the user doesn't
        exist in the local store yet (e.g., first OIDC login).
        """
        session = self.session_module.validate_session_for_http(request)

        # Try to get user from local store
        user = await self.user_store.get_user_by_id(session.user_id)

        if not user:
            # JIT provisioning: create user from session claims
            user = await self._jit_provision_user(session)

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return UserResponse(id=user.id, email=user.email, full_name=user.full_name)

    async def _jit_provision_user(self, session):
        """Provision a user from OIDC session claims if possible."""
        email = session.additional.get("email")
        if not email:
            return None

        # Check if user exists by email (ID mapping may differ)
        user = await self.user_store.get_user_by_email(email)
        if user:
            return user

        try:
            user = await self.user_store.create_user(
                email=email,
                full_name=session.additional.get("name"),
                id=session.user_id,
            )
            self.logger.info(f"JIT provisioned user {session.user_id} ({email})")
            return user
        except Exception as e:
            self.logger.error(f"Failed to JIT provision user {session.user_id}: {e}")
            raise HTTPException(status_code=500, detail="Failed to JIT provision user")
