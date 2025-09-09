import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from modai.module import ModuleDependencies
from modai.modules.user_store.inmemory_user_store import InMemoryUserStore

# Force anyio to use asyncio backend only
anyio_backend = pytest.fixture(scope="session")(lambda: "asyncio")


@pytest.fixture
def user_store():
    return InMemoryUserStore(ModuleDependencies(), {})


@pytest.mark.anyio
async def test_simple_user_store_integration(user_store):
    """Integration test for the SimpleUserStore implementation"""

    # Create users
    user1 = await user_store.create_user(
        email="alice@example.com", full_name="Alice Smith"
    )
    user2 = await user_store.create_user(email="bob@example.com", full_name="Bob Jones")

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
    removed = await user_store.remove_user_from_group(user1.id, group1.id)
    assert removed is True

    alice_groups_after = await user_store.get_user_groups(user1.id)
    assert len(alice_groups_after) == 1
    assert alice_groups_after[0].name == "users"

    # Test deletion
    deleted_user = await user_store.delete_user(user2.id)
    assert deleted_user is True

    remaining_users = await user_store.list_users()
    assert len(remaining_users) == 1
    assert remaining_users[0].email == "alice@example.com"

    # Verify Bob is removed from all groups
    users_group_after_deletion = await user_store.get_group_users(group2.id)
    assert len(users_group_after_deletion) == 1
    assert users_group_after_deletion[0].email == "alice@example.com"


@pytest.mark.anyio
async def test_simple_user_store_error_cases(user_store):
    """Test error cases and edge conditions"""

    # Test duplicate email
    await user_store.create_user(email="testuser@example.com")

    with pytest.raises(ValueError, match="Email 'testuser@example.com' already exists"):
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

    result = await user_store.delete_user("nonexistent")
    assert result is False

    result = await user_store.set_user_password("nonexistent", "password")
    assert result is False
