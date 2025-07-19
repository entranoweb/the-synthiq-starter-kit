# Migration Guide for AI Assistants

This project is migrating from **NextAuth** with **Prisma** to **BetterAuth** using **Drizzle** ORM on **Supabase**. The legacy implementation still exists across the codebase, so assistants should follow these guidelines when implementing migration tasks.

## Key Locations to Update

- `lib/auth.ts` – authentication logic currently tied to NextAuth and Prisma
- `prisma/` – legacy Prisma schema and migrations
- `app/api/` – API routes relying on NextAuth and Prisma

## Testing Commands

Run the following before committing:

```bash
pnpm lint
pnpm type-check
pnpm build
```

## Commit Message Format

```
[MIGRATION/<phase>] <scope>: <message>
```

Example:

```
[MIGRATION/phase-1] auth: replace NextAuth adapter with BetterAuth
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

