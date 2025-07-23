# Technical Guide for AI Assistants

This project has **completed migration** from **NextAuth** with **Prisma** to **BetterAuth** using **Drizzle** ORM on **Supabase**. The codebase now runs on the new stack with all legacy code removed.

## Current Stack

- `lib/auth.ts` – BetterAuth configuration with Drizzle adapter
- `lib/db/schema.ts` – Drizzle ORM schema with PostgreSQL enums
- `app/api/auth/[...all]/route.ts` – BetterAuth API routes
- `lib/auth-client.ts` – BetterAuth client configuration

## Testing Commands

Run the following before committing:

```bash
pnpm lint
pnpm type-check
pnpm build
```

## Commit Message Format

```
[FEATURE/BUGFIX/REFACTOR] <scope>: <message>
```

Example:

```
[FEATURE] auth: add new BetterAuth Stripe integration
[BUGFIX] db: fix enum import in admin components
```

## Success Checklist for Each Phase

- [ ] Update all referenced files for the phase
- [ ] Ensure tests and build commands pass
- [ ] Verify new authentication flow with BetterAuth
- [ ] Confirm database operations through Drizzle and Supabase

## Reference Documentation

See the following files for detailed instructions and examples:

- `llms_betterauth.txt`
- `llms-full-drizzle.txt`
- `llms-stripe.txt`
- `stripe-betterauth.md`
- Files under `for_llms/`

These documents contain usage examples and API details for BetterAuth, Drizzle, Stripe, and related tooling.

