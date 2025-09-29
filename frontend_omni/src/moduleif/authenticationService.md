# Authentication Service

Module Type: Service, Hook

## Description

Provides authentication functionality for user management, including login, signup, and logout operations. This service handles user authentication against the backend API and manages authentication state.

## Intended Usage

Other modules can access authentication functionality through the `useAuthService` hook to perform user authentication operations.

```jsx
import { useAuthService } from "@/moduleif/authenticationService";

function LoginComponent() {
  const authService = useAuthService();

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      console.log("Login successful:", response.message);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  // Component implementation...
}
```

## Intended Integration

This module provides a context provider that makes the `AuthService` instance available throughout the application. Implementations should register a `GlobalModuleContextProvider` component that wraps the app with `AuthServiceContext`.

```jsx
// In the module's GlobalContextProvider component
export function AuthServiceContextProvider({
  children,
}: {
  children: React.ReactNode,
}) {
  ...
  return (
    <AuthServiceContext value={authService}>{children}</AuthServiceContext>
  );
}

// In the module metadata usually it should be exported to the global context
export const Metadata: ModuleMetadata = {
    exports: {
        [GLOBAL_MODULE_CONTEXT_PROVIDER_CLASS_NAME]: AuthServiceContextProvider,
    },
}
```

## Sub Module Implementation Detail

This module is not consuming any sub-modules.
