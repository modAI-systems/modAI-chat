# User Settings Module

## Overview
The User Settings module provides REST API endpoints for managing user-specific settings organized by type/category. Settings are stored as flexible JSON structures that can accommodate different setting types with varying schemas.

## Module Type
- **Web Module**: Provides REST API endpoints

## API Endpoints

The module provides four endpoints for managing user settings:

1. **Bulk operations** (`/api/user/{user_id}/settings`): Get all settings or update multiple setting types at once
2. **Single type operations** (`/api/user/{user_id}/settings/{setting_type}`): Get or update a specific setting type

### GET /api/user/{user_id}/settings
Retrieves all settings for a specific user.

**Authentication**: Required (session-based)
**Authorization**: Users can only access their own settings

**Response (200 OK)**:
```json
{
  "settings": {
    "general": {
      "theme": "dark"
    },
    "notifications": {
      "email_enabled": true,
      "push_enabled": false,
      "frequency": "daily"
    }
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated or invalid session
- `403 Forbidden`: User doesn't have permission to access these settings
- `404 Not Found`: User not found

### PUT /api/user/{user_id}/settings
Updates settings for a specific user. Only provided setting types are updated, existing settings for other types are preserved.

**Authentication**: Required (session-based)
**Authorization**: Users can only modify their own settings

**Request Body**:
```json
{
  "settings": {
    "theme": {
      "mode": "light",
      "primary_color": "#2196f3"
    }
  }
}
```

**Response (200 OK)**:
```json
{
  "settings": {
    "theme": {
      "mode": "light",
      "primary_color": "#2196f3"
    },
    "notifications": {
      "email_enabled": true,
      "push_enabled": false,
      "frequency": "daily"
    }
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated or invalid session
- `403 Forbidden`: User doesn't have permission to modify these settings
- `404 Not Found`: User not found
- `422 Unprocessable Entity`: Invalid settings data format

### GET /api/user/{user_id}/settings/{setting_type}
Retrieves a specific setting type for a user.

**Authentication**: Required (session-based)
**Authorization**: Users can only access their own settings

**Response (200 OK)**:
```json
{
  "setting_type": "theme",
  "settings": {
    "mode": "dark",
    "primary_color": "#1976d2"
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated or invalid session
- `403 Forbidden`: User doesn't have permission to access these settings
- `404 Not Found`: User not found (returns empty settings if setting type doesn't exist)

### PUT /api/user/{user_id}/settings/{setting_type}
Updates a specific setting type for a user. This completely replaces the setting type data.

**Authentication**: Required (session-based)
**Authorization**: Users can only modify their own settings

**Request Body**:
```json
{
  "settings": {
    "mode": "light",
    "primary_color": "#2196f3",
    "sidebar": "expanded"
  }
}
```

**Response (200 OK)**:
```json
{
  "setting_type": "theme",
  "settings": {
    "mode": "light",
    "primary_color": "#2196f3",
    "sidebar": "expanded"
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated or invalid session
- `403 Forbidden`: User doesn't have permission to modify these settings
- `404 Not Found`: User not found
- `422 Unprocessable Entity`: Invalid settings data format

## Settings Structure

### High-Level Format
```json
{
  "[Type A]": { SETTINGS },
  "[Type B]": { SETTINGS }
}
```

The high-level structure with setting types is enforced by this module. The contents of each setting type (`SETTINGS`) can be arbitrary JSON and is not validated by this module - that responsibility belongs to the components that consume specific setting types.

### Example Setting Types
- `theme`: UI theme and appearance settings
- `notifications`: Notification preferences
- `privacy`: Privacy and visibility settings
- `language`: Internationalization preferences
- `integrations`: Third-party service configurations

## Data Storage
- Settings are stored in SQLite database by default
- Each user has one record containing all their settings as JSON
- Settings are merged on update - only provided types are modified
- Database schema supports timestamps for audit purposes

## Configuration

### Module Configuration
```yaml
user_settings:
  class: modai.modules.user_settings.simple_user_settings_module.SimpleUserSettingsModule
  config:
    database_url: "sqlite:///user_settings.db"  # Optional, defaults to user_settings.db
    echo: false  # Optional, enable SQL query logging
  module_dependencies:
    session: "jwt_session"  # Required for authentication
```

### Dependencies
- **session**: Session module for authentication validation (required)

## Security Considerations
- Users can only access and modify their own settings
- Session validation required for all operations
- No data validation on setting contents - consuming components should validate
- Settings are stored as JSON in database - consider data size limits

## Usage Examples

### Frontend Integration
```typescript
// Get all user settings
const allSettings = await fetch('/api/user/123/settings', {
  credentials: 'include'
}).then(r => r.json());

// Get specific setting type
const themeSettings = await fetch('/api/user/123/settings/theme', {
  credentials: 'include'
}).then(r => r.json());

// Update all settings (merge)
await fetch('/api/user/123/settings', {
  method: 'PUT',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    settings: {
      theme: { mode: 'dark', primary_color: '#1976d2' }
    }
  })
});

// Update specific setting type (replace)
await fetch('/api/user/123/settings/theme', {
  method: 'PUT',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    settings: { mode: 'light', primary_color: '#2196f3', sidebar: 'expanded' }
  })
});
```

### Backend Module Integration
Other modules can define their own setting schemas and validate them when consuming settings data.
