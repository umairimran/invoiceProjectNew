# Role-Based Access Control Implementation

This document explains how role-based access control (RBAC) is implemented in the Medpush X MEDPUSH application to restrict access to certain pages and features based on user roles.

## Overview

The application uses a multi-layered approach to implement role-based access control:

1. **Client-side Role Guard**: Prevents unauthorized users from accessing restricted pages
2. **Conditional UI Rendering**: Hides navigation links and UI elements based on user roles
3. **Server-side Middleware**: Basic authentication check for protected routes

## Components

### 1. RoleGuard Component

The `RoleGuard` component (`Dashboard/components/RoleGuard.js`) is a higher-order component that:

- Takes an array of allowed roles as a prop
- Checks if the current user's role is in the allowed roles
- Redirects unauthorized users to a specified page
- Shows a loading spinner during authorization checks

```jsx
// Example usage
<RoleGuard allowedRoles={['admin']} redirectTo="/">
  {/* Protected content */}
</RoleGuard>
```

### 2. Conditional Navigation in Sidebar

The Sidebar component (`Dashboard/components/Sidebar.jsx`) conditionally renders navigation links based on the user's role:

```jsx
// Define navigation items based on user role
const getNavItems = () => {
  const baseItems = [
    { name: 'Dashboard', path: '/', icon: 'fas fa-tachometer-alt' },
    { name: 'Clients', path: '/clients', icon: 'fas fa-users' },
  ];
  
  // Add Users management link only for admin users
  if (user?.role === 'admin') {
    baseItems.push({ name: 'Users', path: '/users', icon: 'fas fa-user-cog' });
  }
  
  return baseItems;
};
```

### 3. Protected Pages

Pages that require specific roles are wrapped with the `RoleGuard` component:

```jsx
// Example: Users management page (admin-only)
export default function Users() {
  // ...component logic

  return (
    <RoleGuard allowedRoles={['admin']} redirectTo="/">
      <Layout title="Users Management">
        {/* Page content */}
      </Layout>
    </RoleGuard>
  );
}
```

### 4. Middleware

The middleware (`Dashboard/middleware.js`) handles basic authentication checks:

- Checks for authentication token in cookies
- Redirects unauthenticated users to the login page
- Identifies admin-only paths for potential server-side checks

## User Roles

The application currently supports the following roles:

1. **admin**: Full access to all features, including user management
2. **user**: Standard access to dashboard and client features, but not user management

## How It Works

1. When a user logs in, their role is stored in the authentication context
2. The `RoleGuard` component checks this role against its `allowedRoles` prop
3. If the user's role is not allowed, they are redirected
4. Navigation links in the Sidebar are conditionally rendered based on the user's role
5. The middleware ensures that all protected routes require authentication

## Security Considerations

- Client-side role checks should not be the only security measure
- API endpoints should also implement role-based authorization
- The middleware provides a basic layer of protection but doesn't verify roles
- For complete security, both client and server-side checks are necessary

## Testing

To test the role-based access control:

1. Log in as an admin user - you should see the Users link in the sidebar and be able to access the Users page
2. Log in as a regular user - the Users link should be hidden, and attempting to navigate to `/users` directly should redirect to the dashboard

## Future Improvements

- Add more granular permissions beyond just roles
- Implement server-side role verification in the middleware
- Add role-based API endpoint protection
- Support for custom roles and permissions
