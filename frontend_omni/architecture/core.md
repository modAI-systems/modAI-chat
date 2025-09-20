# Core Frontend Architecture

## 1. Principles
- **Architecture Style**: Modular component-based frontend with dynamic module composition
- **Design Principles**: KISS (Keep It Simple, Stupid), clear separation of concerns, dynamic component discovery
- **Quality Attributes**: Modularity for independent development, extensibility through well-defined component contracts, maintainability through standardized module structure

## 2. Technology Stack
- **Programming Language**: TypeScript
- **UI Framework**: React 19+ with React Router
- **UI Components**: Shadcn/ui component library
- **Build Tool**: Vite
- **State Management**: React Context API
- **Module Loading**: Dynamic ESM imports with manifest-driven discovery

## 3. Architecture Overview

The frontend is built as a composable system where modules dynamically contribute components to form the complete user interface. The core application provides the infrastructure for module loading, component registration, and integration points.

```mermaid
flowchart TD
    A[Core App] --> B[ModuleManager]
    A --> C[Integration Points]

    B --> D[Manifest Loader]
    D --> E[modules/manifest.json]

    B --> F[Dynamic Module Loading]
    F --> G[Module 1]
    F --> H[Module 2]
    F --> I[Module N]

    G --> J[Metadata.ts]
    H --> K[Metadata.ts]
    I --> L[Metadata.ts]

    C --> M[Router Integration]
    C --> N[Sidebar Integration]
    C --> O[Context Provider Chain]

    J --> P[Component Registry]
    K --> P
    L --> P

    P --> Q[RouterEntry]
    P --> R[SidebarItem]
    P --> S[ContextProvider]
    P --> T[GlobalSettingsNavItem]
```

## 4. Module System

### 4.1 Module Organization

The frontend uses a hierarchical module system with clear separation between interfaces and implementations:

- **Module Interfaces**: Located in `src/moduleif/[module-name].ts` - Single file defining contracts and data structures
- **Module Implementations**: Located in `src/modules/[module-name]/` - Concrete implementations of module interfaces
- **Module Manifest**: Global registry at `public/modules/manifest.json`
- **Module Metadata**: Each module contains `Metadata.ts` defining its contract

### 4.2 Module Architecture Pattern

The system follows a strict interface-implementation separation:

```
src/
├── moduleif/               # Module interfaces and contracts
│   ├── [module-name].ts    # Single file containing all interfaces, types, and contracts
│   └── [another-module].ts
└── modules/                # Module implementations
    └── [module-name]/
        ├── Metadata.ts     # Required: Module definition and component registry
        ├── [ComponentName].tsx # Module components
        └── ...             # Additional implementation files
```

### 4.3 Interface-Implementation Principles

- **Interface Dependency**: Modules only import from `moduleif/` files, never directly from other `modules/` folders
- **Contract Definition**: All data structures, types, and service contracts are defined in `moduleif/`
- **Implementation Isolation**: Concrete implementations in `modules/` can be swapped without affecting dependent modules
- **Multiple Implementations**: One interface can have multiple implementations (e.g., different chat providers)

### 4.4 Module Structure

Each module interface is defined in a single file:

```
src/moduleif/[module-name].ts    # Single file containing:
                                 # - Data structures and interfaces
                                 # - Service contracts and abstractions
                                 # - Type definitions and enums
                                 # - Hook declarations
```

Each module implementation must follow this standardized structure:

```
src/modules/[module-name]/
├── Metadata.ts          # Required: Module definition and component registry
├── [ComponentName].tsx  # Module components
└── ...                 # Additional implementation files
```

### 4.5 Import Guidelines

**Correct Import Patterns:**
```typescript
// ✅ Import interfaces from moduleif
import { SessionData, SessionService } from "@/moduleif/session";
import { ChatMessage, ChatProvider } from "@/moduleif/chat";

// ✅ Import hooks and utilities from same module
import { useLocalState } from "./hooks";
```

**Incorrect Import Patterns:**
```typescript
// ❌ Never import directly from other modules
import { SessionProvider } from "@/modules/session/SessionProvider";
import { ChatComponent } from "@/modules/chat/ChatComponent";

// ❌ Never import implementation details
import { SQLiteSessionStore } from "@/modules/session/stores/SQLiteSessionStore";
```

### 4.6 Module Metadata Contract

Every module must export a `Metadata` object conforming to the `ModuleMetadata` interface:

```typescript
export interface ModuleMetadata {
    id: string                    // Unique module identifier
    version: string               // Semantic version
    description?: string          // Human-readable description
    author?: string              // Module author
    dependentModules: string[]   // Array of required module IDs
    components: any[]            // Array of component functions/classes
}
```

### 4.7 Component Registration

Modules register components that can be discovered and used by other modules or the core application:

```typescript
// Example: global-settings/Metadata.ts
import { SidebarFooterItem } from "./SidebarFooterItem";
import { RouterEntry } from "./RouterEntry";

export const Metadata: ModuleMetadata = {
    id: 'global-settings',
    version: '1.0.0',
    description: 'Global settings management module',
    author: 'ModAI Team',
    dependentModules: ["session"],
    components: [SidebarFooterItem, RouterEntry]
}
```

## 5. Component Discovery and Usage

### 5.1 The useModules Hook

Modules and the core application access components from other modules using the `useModules()` hook:

```typescript
const modules = useModules()
const routerEntryFunctions = modules.getComponentsByName("RouterEntry")
```

### 5.2 Component Naming Convention

Component names are critical as they serve as the discovery mechanism. Components with identical names from different modules are collected together:

- **Exact Match**: Component name must match exactly
- **Cross-Module**: Same-named components from all modules are returned as an array
- **Dynamic Discovery**: New modules can add components without core application changes

## 6. Core Integration Points

The core application defines specific component contracts that modules can implement to integrate with the main UI. **Important**: All integration components must be registered in the module's `Metadata.ts` file to be discoverable by the core application.

```typescript
// Example: Registering integration components in Metadata.ts
export const Metadata: ModuleMetadata = {
    id: 'example-module',
    version: '1.0.0',
    description: 'Example module with multiple integration points',
    author: 'ModAI Team',
    dependentModules: [],
    components: [RouterEntry, SidebarItem, SidebarFooterItem, ContextProvider]
}
```

### 6.1 Router Integration
- **Component Name**: `RouterEntry`
- **Purpose**: Modules can extend the application routing
- **Usage**: Each `RouterEntry` component returns React Router `<Route>` elements
- **Integration**: Core app renders all `RouterEntry` components within the main `<Routes>`
- **When to create**: Create this component and register it in the Metadata if the module needs a new route to be created. This is required for any module that wants to render pages or components at specific URLs.

```typescript
// Example: Module router entry
export function RouterEntry() {
    return (
        <Route path="/module-path" element={<ModulePage />} />
    );
}
```

### 6.2 Sidebar Integration
- **Component Name**: `SidebarItem`
- **Purpose**: Modules can add items to the main navigation sidebar
- **Usage**: Components return `<SidebarMenuItem>` elements
- **Integration**: Core sidebar renders all `SidebarItem` components
- **When to create**: Create this component and register it in the Metadata if the module needs to add a navigation item to the main sidebar. This is typically used for primary module features that users access frequently.

```typescript
// Example: Module sidebar item
export function SidebarItem() {
    return (
        <SidebarMenuItem>
            <SidebarMenuButton asChild>
                <Link to="/module-path">
                    <Icon />
                    <span>Module Name</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}
```

### 6.3 Sidebar Footer Integration
- **Component Name**: `SidebarFooterItem`
- **Purpose**: Modules can add items to the sidebar footer (typically settings/profile)
- **Usage**: Components return footer-appropriate UI elements
- **Integration**: Core sidebar footer renders all `SidebarFooterItem` components
- **When to create**: Create this component and register it in the Metadata if the module needs to add an item to the sidebar footer. This is typically used for settings, user profile actions, or other secondary navigation items that should remain accessible but not clutter the main sidebar.

```typescript
// Example: Module sidebar footer item
export function SidebarFooterItem() {
    return (
        <SidebarMenuItem>
            <SidebarMenuButton asChild>
                <Link to="/settings">
                    <Settings />
                    <span>Settings</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}
```

### 6.4 Context Provider Chain
- **Component Name**: `ContextProvider`
- **Purpose**: Modules can provide application-wide state/context
- **Usage**: Components wrap children with their context providers
- **Integration**: Core app chains all `ContextProvider` components around the main app
- **When to create**: Create this component and register it in the Metadata if the module needs to make state or services available throughout the entire application. This is essential for modules that provide shared services like authentication, session management, or global configuration that other modules depend on.

#### 6.4.1 Service Provider Pattern

For modules that provide services (like authentication, LLM provider management, etc.), follow this standardized pattern:

**1. Interface Definition**: Define the service contract and context/hook in `src/moduleif/[service-name].ts`
```typescript
// Example: src/moduleif/authenticationService.ts
import { createContext, useContext } from "react";

export interface AuthService {
    login(credentials: LoginRequest): Promise<LoginResponse>;
    signup(credentials: SignupRequest): Promise<SignupResponse>;
    logout(): Promise<LoginResponse>;
}

// Create context for the authentication service
export const AuthServiceContext = createContext<AuthService | undefined>(undefined);

/**
 * Hook to access the authentication service from any component
 *
 * @returns AuthService instance
 * @throws Error if used outside of AuthServiceProvider
 */
export function useAuthService(): AuthService {
    const context = useContext(AuthServiceContext);
    if (!context) {
        throw new Error('useAuthService must be used within an AuthServiceProvider');
    }
    return context;
}
```

**2. Service Implementation**: Create the concrete service class in `src/modules/[service-module]/[ServiceName].ts`
```typescript
// Example: src/modules/authentication-service/AuthenticationService.ts
export class AuthenticationService implements AuthService {
    async login(credentials: LoginRequest): Promise<LoginResponse> {
        // Implementation
    }
    // ... other methods
}
```

**3. Context Provider**: Create a React context provider in `src/modules/[service-module]/ContextProvider.tsx`
```typescript
// Example: src/modules/authentication-service/ContextProvider.tsx
import React from 'react';
import { AuthServiceContext } from "@/moduleif/authenticationService";
import { AuthenticationService } from './AuthenticationService';

export function ContextProvider({ children }: { children: React.ReactNode }) {
    const authServiceInstance = new AuthenticationService();
    return (
        <AuthServiceContext value={authServiceInstance}>
            {children}
        </AuthServiceContext>
    );
}
```

**4. Module Registration**: Register the `ContextProvider` in the module's `Metadata.ts`
```typescript
// Example: src/modules/authentication-service/Metadata.ts
export const Metadata: ModuleMetadata = {
    id: 'authentication-service',
    // ...
    components: [ContextProvider]
}
```

#### 6.4.2 Provider Module

The provider module wants to make some state available throughout the application. The context and hook are defined in the interface, and the implementation only provides the context provider:

```typescript
// Example: src/moduleif/sessionContext.ts - Interface defines context and hook
import { createContext, useContext } from "react";

export interface SessionContextType {
    session: SessionData | null;
    isLoading: boolean;
    refreshSession: () => Promise<void>;
    clearSession: () => void;
}

export const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function useSession(): SessionContextType {
    const context = useContext(SessionContext);
    if (!context) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return context;
}
```

```typescript
// Example: src/modules/session/ContextProvider.tsx - Implementation only provides the provider
import React, { useState } from 'react';
import { SessionContext, SessionContextType } from "@/moduleif/sessionContext";

export function ContextProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    // ... other state and logic

    const contextValue: SessionContextType = {
        session,
        isLoading,
        refreshSession,
        clearSession,
    }

    return (
        <SessionContext value={contextValue}>
            {children}
        </SessionContext>
    );
}
```

#### 6.4.3 Consumer Module

Consumer modules import and use the interfaces and types from the provider module's interface definition, not the implementation. This creates a dependency on the interface, allowing for flexible implementations.

```typescript
// Consuming module imports from moduleif
import { SessionData, useSession } from "@/moduleif/session";

export function SomeComponent() {
    const { session } = useSession();

    if (!session) {
        return <div>Please log in</div>;
    }

    return <div>Welcome, {session.user.name}!</div>;
}
```

**Interface-Based Dependencies**: Consuming modules depend on interface definitions, not implementations:

```typescript
// src/moduleif/session.ts
...
// Hook interface - implementation provided by module
export declare function useSession(): SessionContextType;
```

**Dependency Management**: Consuming modules must declare their dependency on provider modules in their metadata:

```typescript
export const Metadata: ModuleMetadata = {
    id: 'consuming-module',
    // ...
    dependentModules: ["session"], // Must include provider module
    components: [SidebarItem]
}
```

## 7. Module Hierarchy and Extension Pattern

### 7.1 Extension Modules

The system supports modules that extend other modules. For example, the global settings module provides extension points:

- **Settings Navigation**: Modules register `GlobalSettingsNavItem` components
- **Settings Routes**: Modules register `GlobalSettingsRouterEntry` components
- **Pattern**: Parent module discovers and renders child module components

```typescript
// Chat module extending global settings
export function GlobalSettingsNavItem() {
    return (
        <SidebarMenuButton asChild>
            <Link to="/settings/global/llmproviders">
                <span>LLM Providers</span>
            </Link>
        </SidebarMenuButton>
    )
}

export function GlobalSettingsRouterEntry() {
    return (
        <Route path="llmproviders" element={<LLMProviderManagementPage />} />
    );
}
```

### 7.2 Hierarchical Component Naming

The naming convention supports hierarchical relationships:
- **Core Integration**: `RouterEntry`, `SidebarItem`, `ContextProvider`
- **Module Extension**: `[ModuleName][ComponentType]` (e.g., `GlobalSettingsNavItem`)
- **Discovery**: Parent modules query for their specific extension pattern

## 8. Module Loading and Lifecycle

### 8.1 Startup Flow
1. **App Start**: React application initialization begins
2. **Manifest Loading**: Fetch and parse `modules/manifest.json`
3. **Module Discovery**: Load enabled modules from manifest
4. **Metadata Import**: Dynamic import of each module's `Metadata.ts`
5. **Component Registration**: Register all module components in ModuleManager
6. **Context Composition**: Chain all `ContextProvider` components
7. **UI Composition**: Render all integration point components

### 8.2 Module Dependencies

Modules can declare dependencies on other modules:

```typescript
dependentModules: ["session", "auth"]
```

**Note**: Current implementation loads all modules; dependency resolution is declarative for documentation purposes.

## 9. Example Module Implementations

### 9.1 Interface Definition Example

```typescript
// src/moduleif/chat.ts - Single file containing all chat-related interfaces
export interface ChatMessage {
    id: string;
    content: string;
    timestamp: Date;
    role: 'user' | 'assistant';
}

export interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: Date;
}

export interface ChatProvider {
    sendMessage(content: string, sessionId: string): Promise<ChatMessage>;
    createSession(): Promise<ChatSession>;
    getSession(id: string): Promise<ChatSession | null>;
}

export interface ChatContextType {
    currentSession: ChatSession | null;
    sessions: ChatSession[];
    sendMessage: (content: string) => Promise<void>;
    createNewSession: () => Promise<void>;
}

export declare function useChat(): ChatContextType;
```

### 9.2 Simple UI Module Implementation

```typescript
// src/modules/chat/Metadata.ts
import { SidebarItem, RouterEntry } from './components';

export const Metadata: ModuleMetadata = {
    id: 'chat',
    version: '1.0.0',
    description: 'AI Chat interface',
    author: 'ModAI Team',
    dependentModules: ["session"],
    components: [SidebarItem, RouterEntry]
}

// src/modules/chat/components/SidebarItem.tsx
import { ChatMessage } from "@/moduleif/chat"; // ✅ Import from interface

export function SidebarItem() {
    return (
        <SidebarMenuItem>
            <SidebarMenuButton asChild>
                <Link to="/chat">
                    <Plus />
                    <span>New Chat</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

// src/modules/chat/components/RouterEntry.tsx
export function RouterEntry() {
    return (
        <Route path="/chat" element={<ChatComponent />} />
    );
}
```

### 9.3 Service-Only Module Implementation

```typescript
// src/moduleif/session.ts - Single interface file
export interface SessionData {
    user: {
        id: string;
        name: string;
        email: string;
    };
    isAuthenticated: boolean;
}

export interface SessionContextType {
    session: SessionData | null;
    isLoading: boolean;
    refreshSession: () => Promise<void>;
    clearSession: () => void;
}

// Create context and hook in the interface file
export const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function useSession(): SessionContextType {
    const context = useContext(SessionContext);
    if (!context) {
        throw new Error('useSession must be used within SessionProvider');
    }
    return context;
}

// src/modules/session/Metadata.ts
export const Metadata: ModuleMetadata = {
    id: 'session',
    version: '1.0.0',
    description: 'Session management service',
    author: 'ModAI Team',
    dependentModules: [],
    components: [ContextProvider]
}

// src/modules/session/ContextProvider.tsx
import React, { useState } from 'react';
import { SessionContext, SessionContextType } from "@/moduleif/sessionContext";

export function ContextProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<SessionData | null>(null);
    // Implementation details...

    return (
        <SessionContext value={contextValue}>
            {children}
        </SessionContext>
    );
}
```

### 9.4 Service Module Implementation Example

For modules that primarily provide services (like authentication, LLM provider management, etc.), follow this pattern:

```typescript
// src/moduleif/authenticationService.ts - Interface definition with context and hook
import { createContext, useContext } from "react";

export interface AuthService {
    login(credentials: LoginRequest): Promise<LoginResponse>;
    signup(credentials: SignupRequest): Promise<SignupResponse>;
    logout(): Promise<LoginResponse>;
}

// Create context for the authentication service
export const AuthServiceContext = createContext<AuthService | undefined>(undefined);

/**
 * Hook to access the authentication service from any component
 */
export function useAuthService(): AuthService {
    const context = useContext(AuthServiceContext);
    if (!context) {
        throw new Error('useAuthService must be used within an AuthServiceProvider');
    }
    return context;
}

// src/modules/authentication-service/AuthenticationService.ts - Service class
export class AuthenticationService implements AuthService {
    async login(credentials: LoginRequest): Promise<LoginResponse> {
        // HTTP API implementation
    }
    // ... other methods
}

// src/modules/authentication-service/ContextProvider.tsx - Context provider
import React from 'react';
import { AuthServiceContext } from "@/moduleif/authenticationService";
import { AuthenticationService } from './AuthenticationService';

export function ContextProvider({ children }: { children: React.ReactNode }) {
    const authServiceInstance = new AuthenticationService();
    return (
        <AuthServiceContext value={authServiceInstance}>
            {children}
        </AuthServiceContext>
    );
}

// src/modules/authentication-service/Metadata.ts - Module registration
export const Metadata: ModuleMetadata = {
    id: 'authentication-service',
    version: '1.0.0',
    description: 'Authentication service providing login, signup, and logout functionality',
    author: 'ModAI Team',
    dependentModules: [],
    components: [ContextProvider]  // Register the context provider
}
```

### 9.5 Multiple Implementation Example

```typescript
// src/moduleif/chat.ts - Single interface
export interface ChatProvider {
    sendMessage(content: string): Promise<ChatMessage>;
    // ... other methods
}

// src/modules/chat-openai/OpenAIChatProvider.ts - Implementation 1
import { ChatProvider } from "@/moduleif/chat";

export class OpenAIChatProvider implements ChatProvider {
    async sendMessage(content: string): Promise<ChatMessage> {
        // OpenAI implementation
    }
}

// src/modules/chat-anthropic/AnthropicChatProvider.ts - Implementation 2
import { ChatProvider } from "@/moduleif/chat";

export class AnthropicChatProvider implements ChatProvider {
    async sendMessage(content: string): Promise<ChatMessage> {
        // Anthropic implementation
    }
}
```

## 10. Module Manifest Configuration

### 10.1 Overview and Purpose

The module manifest (`public/modules/manifest.json`) is the **central registry** that controls which modules are loaded by the frontend application. This file serves as the authoritative source for module discovery and is **critical for the module system to function**.

**⚠️ CRITICAL REQUIREMENT**: Every module **MUST** be registered in the `manifest.json` file to be loaded by the application. Modules not listed in the manifest will be completely ignored, regardless of their implementation quality or placement in the modules directory.

### 10.2 Manifest File Structure

The manifest follows a strict JSON schema:

```json
{
    "version": "1.0.0",
    "modules": [
        {
            "id": "global-settings",
            "path": "../modules/global-settings",
            "enabled": true
        },
        {
            "id": "session",
            "path": "../modules/session",
            "enabled": true
        }
    ]
}
```

### 10.3 Manifest Schema Definition

#### 10.3.1 Root Level Properties

- **`version`** (string, required): Semantic version of the manifest schema itself
  - Used for manifest compatibility checking and deployment management
  - Format: "MAJOR.MINOR.PATCH" (e.g., "1.0.0")

- **`modules`** (array, required): Array of module registration objects
  - Contains all modules that should be considered for loading
  - Order in array may affect loading sequence

#### 10.3.2 Module Registration Properties

Each module entry **must** contain the following properties:

- **`id`** (string, required): Unique module identifier
  - Must match the `id` field in the module's `Metadata.ts` file
  - Used for dependency resolution and module references
  - Convention: kebab-case (e.g., "llm-provider-service")
  - Must be unique across all modules

- **`path`** (string, required): Relative path to the module directory
  - Path is relative to the `src/` directory
  - Convention: "../modules/[module-directory-name]"
  - Must point to a directory containing a valid `Metadata.ts` file

- **`enabled`** (boolean, required): Whether the module should be loaded
  - `true`: Module will be loaded and its components registered
  - `false`: Module will be ignored during application startup
  - Allows for easy feature toggling without removing module entries

### 10.4 Module Loading Process

The manifest drives the entire module loading lifecycle:

1. **Manifest Parsing**: Application fetches and parses `public/modules/manifest.json`
2. **Filtering**: Only modules with `"enabled": true` are considered for loading
3. **Path Resolution**: Each enabled module's path is resolved relative to `src/`
4. **Metadata Import**: Dynamic import of `[module-path]/Metadata.ts`
5. **Validation**: Verify module ID matches between manifest and metadata
6. **Component Registration**: Register all components from module metadata
7. **Dependency Resolution**: Process declared module dependencies (future feature)

### 10.5 Manifest Management Best Practices

#### 10.5.1 Adding New Modules

When creating a new module, you **MUST**:

1. **Create the module implementation** in `src/modules/[module-name]/`
2. **Define the module metadata** in `src/modules/[module-name]/Metadata.ts`
3. **Register in manifest** by adding an entry to `public/modules/manifest.json`
4. **Verify the ID match** between manifest entry and metadata export

```json
// Example: Adding a new "notifications" module
{
    "id": "notifications",
    "path": "../modules/notifications",
    "enabled": true
}
```

#### 10.5.2 Module ID Consistency

The module `id` must be consistent across:
- Manifest entry (`manifest.json`)
- Module metadata (`Metadata.ts`)
- Directory naming convention (recommended)

```typescript
// src/modules/notifications/Metadata.ts
export const Metadata: ModuleMetadata = {
    id: 'notifications', // Must match manifest.json
    version: '1.0.0',
    // ...
}
```

#### 10.5.3 Feature Toggling

Use the `enabled` flag for feature management:

```json
{
    "id": "experimental-feature",
    "path": "../modules/experimental-feature",
    "enabled": false // Disable for production
}
```

### 10.6 Error Handling and Debugging

#### 10.6.1 Common Manifest Issues

- **Module Not Loading**: Check if module is listed in manifest with `"enabled": true`
- **Path Resolution Errors**: Verify the `path` points to correct module directory
- **ID Mismatch**: Ensure manifest `id` matches the `id` in module's `Metadata.ts`
- **Invalid JSON**: Use a JSON validator to check manifest syntax

### 10.7 Deployment Considerations

#### 10.7.1 Environment-Specific Manifests

Different environments may require different module configurations:

```json
// Development manifest - includes debug modules
{
    "version": "1.0.0",
    "modules": [
        {"id": "debug-tools", "path": "../modules/debug-tools", "enabled": true}
    ]
}

// Production manifest - excludes debug modules
{
    "version": "1.0.0",
    "modules": [
        {"id": "debug-tools", "path": "../modules/debug-tools", "enabled": false}
    ]
}
```

## 11. Design Decisions and Trade-offs

### 11.1 Dynamic Component Discovery
- **Decision**: Use string-based component naming for discovery rather than strong typing
- **Trade-offs**: Flexibility and extensibility vs. compile-time type safety
- **Mitigation**: Clear naming conventions and runtime validation

### 11.2 Manifest-Driven Loading
- **Decision**: External JSON manifest controls module loading vs. code-based registration
- **Trade-offs**: Runtime configuration flexibility vs. bundle optimization
- **Benefits**: Enables/disables modules without code changes, supports A/B testing

## 12. Extension Guidelines

### 12.1 Creating New Modules

1. **Define Module Interface**: Create `src/moduleif/[module-name].ts` with all types, contracts, and declarations
2. **Create Module Directory**: `src/modules/[module-name]/`
3. **Define Metadata**: Export `ModuleMetadata` object with unique ID and component registry
4. **Implement Components**: Create components for desired integration points, importing only from `moduleif/`
5. **Register in Manifest**: Add module entry to `public/modules/manifest.json`
6. **Test Integration**: Verify components appear in appropriate UI locations

### 12.2 Extending Existing Modules

1. **Study Interface**: Review existing module interfaces in `src/moduleif/[module-name].ts`
2. **Identify Extension Points**: Find module that accepts extension components (e.g., `GlobalSettings*`)
3. **Implement Extension Components**: Create components following parent module's naming pattern
4. **Use Interface Dependencies**: Import only from `moduleif/` files, never from `modules/`
5. **Register Components**: Add extension components to your module's metadata
6. **Verify Integration**: Ensure components appear in parent module's UI

### 12.3 Best Practices

- **Interface First**: Always define interfaces in `moduleif/` before implementing in `modules/`
- **Import Discipline**: Never import directly from other `modules/` folders - use `moduleif/` files only
- **Component Naming**: Use descriptive, consistent names following established patterns
- **Dependency Declaration**: Always declare dependent modules in metadata
- **Type Safety**: Define comprehensive TypeScript interfaces for all data structures
- **Error Handling**: Components should gracefully handle missing dependencies
- **Authentication**: Check session state in components that require authentication
- **Responsive Design**: Follow established UI patterns and responsive design principles
- **Interface Stability**: Keep interfaces stable - breaking changes affect all dependent modules
- **Service Pattern**: For shared services, use the interface-class-context pattern for dependency injection and testability
