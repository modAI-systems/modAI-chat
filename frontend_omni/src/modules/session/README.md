# Session Context

Module Type: Context Provider

## Description

The Session Context module provides session management functionality, maintaining user session state throughout the frontend application. It offers a centralized way to track the current authenticated user and session state, including loading states and session manipulation methods.

## Intended Usage

Other modules can access session data and session management functions through the `useSession()` hook. The session context is designed to be consumed by any component that needs to:

- Access current user information
- Check authentication status
- Refresh session data
- Clear/logout current session
- Display loading states during session operations

```tsx
import { useSession } from "@/moduleif/sessionContext";

function UserProfile() {
  const { session, isLoading, refreshSession, clearSession } = useSession();

  if (isLoading) {
    return <div>Loading session...</div>;
  }

  if (!session) {
    return <div>No active session</div>;
  }

  const user = session.getUser();

  return (
    <div>
      <h2>Welcome, {user.name}</h2>
      <p>Email: {user.email}</p>
      <button onClick={refreshSession}>Refresh Session</button>
      <button onClick={clearSession}>Logout</button>
    </div>
  );
}
```

## Intended Integration

This module is inteded to be a context provider, so no further information needed here.

## Sub Module Implementation Detail

This module does not consume any sub-modules.
