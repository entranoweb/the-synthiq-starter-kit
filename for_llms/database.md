# Database Architecture & Schema

## Database Setup

### Technology Stack
- **Database**: PostgreSQL
- **ORM**: Drizzle
- **Schema Location**: `drizzle/schema.ts`
- **Generated Types**: `lib/db`

### Essential Commands
```bash
npm run db:generate     # Generate Drizzle types
npm run db:migrate      # Apply migrations
npm run db:reset        # Reset database
npm run db:sync-stripe  # Sync Stripe products
npm run db:setup-admin  # Setup admin user
```

## Core Models

### User Table
```ts
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  name: text('name'),
  role: userRole('role').default('USER'),
  organizationId: text('organization_id').references(() => organizations.id),
  stripeProductId: text('stripe_product_id'),
  membershipStatus: membershipStatus('membership_status').default('ACTIVE'),
  tokens: integer('tokens').default(0),
  tokensExpiresAt: timestamp('tokens_expires_at')
});
```

### Organizations Table
```ts
export const organizations = pgTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});
```

### Stripe Integration Models
- `StripeProduct` - Products from Stripe (single source of truth)
- `StripePrice` - Pricing information linked to products
- `StripeCustomer` - Customer records for Stripe integration
- `UserSubscription` - Active subscription tracking
- `PaymentHistory` - Payment intent tracking

### NextAuth Required Models
- `Account` - OAuth provider accounts
- `Session` - Active user sessions
- `VerificationToken` - Email verification tokens

## Enums & Types

### UserRole
```ts
export const userRole = pgEnum('user_role', ['USER', 'PREMIUM', 'ADMIN', 'BANNED']);
```

### MembershipStatus
```ts
export const membershipStatus = pgEnum('membership_status', [
  'ACTIVE',
  'INACTIVE',
  'CANCELED',
  'PAST_DUE'
]);
```

## Database Relationships

### User Relationships
- User → StripeProduct (via `stripeProductId`)
- User → UserSubscription (one-to-many)
- User → PaymentHistory (one-to-many)
- User → StripeCustomer (one-to-one)
- User → Organization (many-to-one)

### Organization Relationships
- Organization → Users (one-to-many)

### Stripe Relationships
- StripeProduct → StripePrice (one-to-many)
- StripeProduct → UserSubscription (one-to-many)
- UserSubscription → StripePrice (many-to-one)

## Key Database Operations

### User Management
```typescript
// Get user with subscription info
const user = await db.query.users.findFirst({
  where: (users, { eq }) => eq(users.id, userId),
  with: {
    subscriptions: {
      where: (subscriptions, { inArray }) =>
        inArray(subscriptions.status, ['active', 'trialing']),
      with: { stripeProduct: true }
    }
  }
});
```

### Subscription Queries
```typescript
// Check active subscription
const subscription = await db.query.userSubscriptions.findFirst({
  where: (userSubscriptions, { and, eq, inArray }) =>
    and(
      eq(userSubscriptions.userId, userId),
      inArray(userSubscriptions.status, ['active', 'trialing'])
    ),
  with: {
    stripeProduct: true,
    stripePrice: true
  }
});
```

### Token Management
```typescript
// Update user tokens
await db
  .update(users)
  .set({ tokens: newTokenCount, tokensExpiresAt: expirationDate })
  .where(eq(users.id, userId));
```

## Data Synchronization

### Stripe Sync Process
1. Webhook receives Stripe event
2. Relevant data extracted from event
3. Database updated via upsert operations
4. User roles/tokens updated accordingly

### Auto-Sync Features
- Product sync every 5 minutes (cached)
- Subscription status sync on user access
- Payment history tracking via webhooks

## Database Migrations

### Migration Strategy
- Schema changes via Drizzle migrations
- Rollback support for failed migrations
- Environment-specific migration runs

### Migration Files
- Located in `drizzle/migrations/`
- Automatic migration generation
- SQL migration files for review

## Performance Considerations

### Indexing
- Unique indexes on email, Stripe IDs
- Composite indexes for common queries
- Foreign key constraints for data integrity

### Query Optimization
- Include statements for related data
- Limit/offset for pagination
- Connection pooling for concurrent requests

## Data Integrity

### Constraints
- Unique constraints on critical fields
- Foreign key relationships
- Cascade deletes for cleanup

- Drizzle schema validation
- Application-level validation
- Database-level constraints

## Backup & Recovery

### Backup Strategy
- Regular database backups
- Point-in-time recovery
- Environment-specific backup schedules

### Data Recovery
- Migration rollback procedures
- Data restoration from backups
- Disaster recovery planning

## Environment Configuration

### Database URLs
```env
# Development
DATABASE_URL="postgresql://user:password@localhost:5432/dev_db"

# Production
DATABASE_URL="postgresql://user:password@host:5432/prod_db"
```

### Connection Settings
- Connection pooling configuration
- SSL settings for production
- Timeout and retry settings
