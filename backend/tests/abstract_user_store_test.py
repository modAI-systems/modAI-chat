"""
Abstract test base for UserStore implementations.
This base class provides common test scenarios that can be reused
for both InMemoryUserStore and SQLAlchemyUserStore.
"""

import pytest
from abc import ABC, abstractmethod

from modai.modules.user_store.module import UserStore


class AbstractUserStoreTestBase(ABC):
    """
    Abstract base class for testing UserStore implementations.

    Subclasses must implement the create_user_store() method to provide
    the specific UserStore implementation to be tested.
    """

    @abstractmethod
    def create_user_store(self) -> UserStore:
        """Create and return a UserStore instance for testing"""
        pass

    @pytest.fixture
    def user_store(self):
        """Fixture providing a UserStore instance"""
        return self.create_user_store()

    @pytest.mark.anyio
    async def test_user_store_integration(self, user_store):
        """Integration test for the UserStore implementation"""

        # Create users
        user1 = await user_store.create_user(
            email="alice@example.com", full_name="Alice Smith"
        )
        user2 = await user_store.create_user(
            email="bob@example.com", full_name="Bob Jones"
        )

        # Create groups
        group1 = await user_store.create_group(
            name="admins", description="Administrator group"
        )
        group2 = await user_store.create_group(
            name="users", description="Regular users group"
        )

        # Add users to groups
        await user_store.add_user_to_group(user1.id, group1.id)  # Alice is admin
        await user_store.add_user_to_group(user1.id, group2.id)  # Alice is also user
        await user_store.add_user_to_group(user2.id, group2.id)  # Bob is user

        # Test idempotent behavior - adding user to group they're already in should not raise
        await user_store.add_user_to_group(
            user1.id, group1.id
        )  # Alice already in admin group

        # Set passwords
        await user_store.set_user_password(user1.id, "hashed_alice_password")
        await user_store.set_user_password(user2.id, "hashed_bob_password")

        # Test retrieval operations
        retrieved_user1 = await user_store.get_user_by_email("alice@example.com")
        assert retrieved_user1 is not None
        assert retrieved_user1.email == "alice@example.com"

        retrieved_group1 = await user_store.get_group_by_name("admins")
        assert retrieved_group1 is not None
        assert retrieved_group1.name == "admins"

        # Test group membership
        alice_groups = await user_store.get_user_groups(user1.id)
        assert len(alice_groups) == 2
        group_names = {g.name for g in alice_groups}
        assert group_names == {"admins", "users"}

        admin_users = await user_store.get_group_users(group1.id)
        assert len(admin_users) == 1
        assert admin_users[0].email == "alice@example.com"

        user_group_users = await user_store.get_group_users(group2.id)
        assert len(user_group_users) == 2
        emails = {u.email for u in user_group_users}
        assert emails == {"alice@example.com", "bob@example.com"}

        # Test password verification
        alice_credentials = await user_store.get_user_credentials(user1.id)
        assert alice_credentials is not None
        assert alice_credentials.password_hash == "hashed_alice_password"

        # Test listing
        all_users = await user_store.list_users()
        assert len(all_users) == 2

        all_groups = await user_store.list_groups()
        assert len(all_groups) == 2

        # Test updates
        updated_user = await user_store.update_user(user1.id, full_name="Alice Johnson")
        assert updated_user is not None
        assert updated_user.full_name == "Alice Johnson"

        # Test removal from group
        await user_store.remove_user_from_group(user1.id, group1.id)  # Should not raise

        alice_groups_after = await user_store.get_user_groups(user1.id)
        assert len(alice_groups_after) == 1
        assert alice_groups_after[0].name == "users"

        # Test deletion
        await user_store.delete_user(user2.id)  # Should not raise

        remaining_users = await user_store.list_users()
        assert len(remaining_users) == 1
        assert remaining_users[0].email == "alice@example.com"

        # Verify Bob is removed from all groups
        users_group_after_deletion = await user_store.get_group_users(group2.id)
        assert len(users_group_after_deletion) == 1
        assert users_group_after_deletion[0].email == "alice@example.com"

    @pytest.mark.anyio
    async def test_user_store_error_cases(self, user_store):
        """Test error cases and edge conditions"""

        # Test duplicate email
        await user_store.create_user(email="testuser@example.com")

        with pytest.raises(
            ValueError, match="Email 'testuser@example.com' already exists"
        ):
            await user_store.create_user(email="testuser@example.com")

        # Test duplicate group name
        await user_store.create_group(name="testgroup")

        with pytest.raises(ValueError, match="Group name 'testgroup' already exists"):
            await user_store.create_group(name="testgroup")

        # Test operations on non-existent entities
        result = await user_store.get_user_by_id("nonexistent")
        assert result is None

        result = await user_store.update_user("nonexistent", full_name="Test")
        assert result is None

        # Test that idempotent operations don't raise exceptions
        # These operations should succeed silently if the desired state is already achieved
        await user_store.delete_user("nonexistent")  # Should not raise
        await user_store.delete_group("nonexistent")  # Should not raise
        await user_store.remove_user_from_group(
            "nonexistent", "somegroup"
        )  # Should not raise
        await user_store.delete_user_credentials("nonexistent")  # Should not raise

        # But operations that require existing entities should still raise exceptions
        with pytest.raises(ValueError, match="User with ID 'nonexistent' not found"):
            await user_store.set_user_password("nonexistent", "password")

        with pytest.raises(ValueError, match="User with ID 'nonexistent' not found"):
            await user_store.add_user_to_group("nonexistent", "somegroup")

    @pytest.mark.anyio
    async def test_user_store_pagination(self, user_store):
        """Test pagination functionality"""

        # Create multiple users for testing pagination
        for i in range(5):
            await user_store.create_user(
                email=f"user{i}@example.com", full_name=f"User {i}"
            )

        # Test user pagination
        users_page_1 = await user_store.list_users(limit=2, offset=0)
        assert len(users_page_1) == 2

        users_page_2 = await user_store.list_users(limit=2, offset=2)
        assert len(users_page_2) == 2

        users_page_3 = await user_store.list_users(limit=2, offset=4)
        assert len(users_page_3) == 1

        # Ensure no overlap between pages
        all_emails = set()
        for user in users_page_1 + users_page_2 + users_page_3:
            all_emails.add(user.email)
        assert len(all_emails) == 5

        # Create multiple groups for testing pagination
        for i in range(3):
            await user_store.create_group(name=f"group{i}", description=f"Group {i}")

        # Test group pagination
        groups_page_1 = await user_store.list_groups(limit=2, offset=0)
        assert len(groups_page_1) == 2

        groups_page_2 = await user_store.list_groups(limit=2, offset=2)
        assert len(groups_page_2) == 1

    @pytest.mark.anyio
    async def test_user_store_credentials_lifecycle(self, user_store):
        """Test complete credentials lifecycle"""

        # Create a user
        user = await user_store.create_user(email="testcreds@example.com")

        # Initially no credentials
        creds = await user_store.get_user_credentials(user.id)
        assert creds is None

        # Set password
        await user_store.set_user_password(user.id, "initial_hash")
        creds = await user_store.get_user_credentials(user.id)
        assert creds is not None
        assert creds.password_hash == "initial_hash"
        assert creds.user_id == user.id

        # Update password
        await user_store.set_user_password(user.id, "updated_hash")
        creds = await user_store.get_user_credentials(user.id)
        assert creds is not None
        assert creds.password_hash == "updated_hash"

        # Delete credentials
        await user_store.delete_user_credentials(user.id)
        creds = await user_store.get_user_credentials(user.id)
        assert creds is None

        # Deleting again should be idempotent
        await user_store.delete_user_credentials(user.id)  # Should not raise

    @pytest.mark.anyio
    async def test_user_store_complex_membership_operations(self, user_store):
        """Test complex user-group membership scenarios"""

        # Create users and groups
        user1 = await user_store.create_user(email="user1@example.com")
        user2 = await user_store.create_user(email="user2@example.com")
        user3 = await user_store.create_user(email="user3@example.com")

        group1 = await user_store.create_group(name="group1")
        group2 = await user_store.create_group(name="group2")
        group3 = await user_store.create_group(name="group3")

        # Add users to multiple groups
        await user_store.add_user_to_group(user1.id, group1.id)
        await user_store.add_user_to_group(user1.id, group2.id)
        await user_store.add_user_to_group(user2.id, group1.id)
        await user_store.add_user_to_group(user2.id, group3.id)
        await user_store.add_user_to_group(user3.id, group2.id)

        # Test complex queries
        group1_users = await user_store.get_group_users(group1.id)
        assert len(group1_users) == 2
        emails = {u.email for u in group1_users}
        assert emails == {"user1@example.com", "user2@example.com"}

        user1_groups = await user_store.get_user_groups(user1.id)
        assert len(user1_groups) == 2
        names = {g.name for g in user1_groups}
        assert names == {"group1", "group2"}

        # Remove user from one group
        await user_store.remove_user_from_group(user1.id, group1.id)

        user1_groups_after = await user_store.get_user_groups(user1.id)
        assert len(user1_groups_after) == 1
        assert user1_groups_after[0].name == "group2"

        group1_users_after = await user_store.get_group_users(group1.id)
        assert len(group1_users_after) == 1
        assert group1_users_after[0].email == "user2@example.com"
