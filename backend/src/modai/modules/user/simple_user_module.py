from typing import Any
from fastapi import Request, HTTPException
from modai.module import ModuleDependencies
from modai.modules.user.module import UserModule, UserResponse
from modai.modules.session.module import SessionModule
from modai.modules.user_store.module import UserStore


class SimpleUserModule(UserModule):
    """Simple implementation of the User module."""

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

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

        Validates the session and returns the user information from the user store.
        """

        # Validate session
        session = self.session_module.validate_session_for_http(request)

        # Get user from user store
        user = await self.user_store.get_user_by_id(session.user_id)

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return UserResponse(id=user.id, email=user.email, full_name=user.full_name)
