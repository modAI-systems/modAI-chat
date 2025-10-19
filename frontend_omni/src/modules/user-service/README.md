# User Service

This module provides user management functionality, including user data retrieval, user profile operations, and making user information available throughout the application. It serves as the central service for all user-related operations and state management.

## Intended Usage

```jsx
// Access user service from any component
const userService = useUserService();

// Get current authenticated user data
const [user, setUser] = (useState < User) | (null > null);

useEffect(() => {
  const fetchUser = async () => {
    try {
      const currentUser = await userService.fetchCurrentUser();
      setUser(currentUser);
    } catch (error) {
      ...
    }
  };

  fetchUser();
}, [userService]);

if (user == null) {
    return <div>No user</div>;
}

return <div className="user-info">
    <p>Email: {user.email}</p>
    {user.full_name && <p>Name: {user.full_name}</p>}
</div>
```

## Intended Integration

The user service is provided to child components via the React Context API and hooks, therefore a provider must be used like this:

```jsx
const userServiceInstance = ...
...
return (
  <UserServiceContext value={userServiceInstance}>...</UserServiceContext>
);
```
