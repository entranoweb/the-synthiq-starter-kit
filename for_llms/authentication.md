# Authentication System

## BetterAuth Configuration

### Setup Location
- Main config: `lib/auth.ts`
- API routes: `app/api/auth/[...all]/route.ts`
- Client config: `lib/auth-client.ts`

### Authentication Flow
1. User clicks "Sign in with Google"
2. Redirects to Google OAuth
3. Google returns user data
4. BetterAuth creates/updates user in database
5. Session created with custom user data
6. BetterAuth Stripe plugin handles customer integration

## Provider Configuration

### Google OAuth
```typescript
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
})
```

### Required Environment Variables
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `BETTER_AUTH_SECRET` - JWT encryption secret (32+ chars)
- `BETTER_AUTH_URL` - Application URL for callbacks

## Session Management

### Custom Session Data
Session includes additional user data:
- `user.id` - Database user ID
- `user.role` - User role (USER/PREMIUM/ADMIN/BANNED)
- `user.stripeProductId` - Current subscription product
- `user.tokens` - Available tokens
- `user.tokensExpiresAt` - Token expiration date

### Session Callback
```typescript
session({ session, user }) {
  if (session.user) {
    session.user.role = user.role;
    session.user.id = user.id;
    session.user.stripeProductId = user.stripeProductId;
    session.user.tokens = user.tokens;
    session.user.tokensExpiresAt = user.tokensExpiresAt;
  }
  return session;
}
```

## User Roles & Access Control

### Role Hierarchy
- **USER**: Default role, access to free content
- **PREMIUM**: Active subscription, access to premium content + tokens
- **ADMIN**: Full system access, admin panel access
- **BANNED**: No access to any content

### Role Assignment Logic
- New users: `USER` role by default
- Active subscription: `PREMIUM` role (auto-assigned)
- Admin setup: Manual assignment via `db:setup-admin` script
- Banned users: Manual assignment by admins

## Security Features

### Cookie Configuration
- `httpOnly: true` - Prevents XSS attacks
- `sameSite: "lax"` - CSRF protection
- `secure: true` - HTTPS only in production
- Custom cookie names for security

### CSRF Protection
- Built-in CSRF token handling
- Automatic token validation
- Secure cookie settings

## Database Integration

### Drizzle Adapter
- `drizzleAdapter` from BetterAuth
- Automatic user/account/session management
- Database schema includes required BetterAuth tables
- PostgreSQL with enum support

### Required Database Tables
- `account` - OAuth provider accounts
- `session` - Active user sessions
- `user` - User profiles and roles
- `verification` - Email verification (if used)
- `stripeCustomers` - Stripe customer integration
- `userSubscriptions` - Subscription management

## Access Control Functions

### Server-Side Access Control
```typescript
// lib/subscription.ts
export const isUserAdmin = async (userId: string): Promise<boolean>
export const hasActiveSubscription = async (userId: string): Promise<boolean>
export const checkUserAccess = async (userId: string)
```

### Client-Side Session Access
```typescript
// Using BetterAuth client
import { authClient } from '@/lib/auth-client'

const session = authClient.useSession()
if (session.data?.user?.role === 'ADMIN') {
  // Admin access
}
```

## Route Protection

### Server Components
```typescript
import { getSession } from '@/lib/auth'
import { headers } from 'next/headers'

export default async function ProtectedPage() {
  const session = await getSession({
    headers: await headers()
  })
  if (!session) redirect('/auth/signin')
  // Page content
}
```

### Middleware Protection
- Can be implemented via `middleware.ts`
- Route-based access control
- Automatic redirects for unauthorized access

## Admin User Setup

### Process
1. User must sign in first (creates database record)
2. Set `ADMIN_EMAIL` environment variable
3. Run `npm run db:setup-admin`
4. Script promotes user to ADMIN role

### Important Notes
- User must exist in database before running script
- Script preserves existing admin users
- Only works with email matching `ADMIN_EMAIL` env var