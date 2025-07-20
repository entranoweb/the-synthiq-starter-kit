// TEMPORARY FILE - Remove after full Drizzle migration
// Fake enum values you still import in UI components
export enum UserRole {
  USER = 'USER',
  PREMIUM = 'PREMIUM', 
  ADMIN = 'ADMIN',
  BANNED = 'BANNED'
}

export enum MembershipStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  CANCELED = 'CANCELED',
  PAST_DUE = 'PAST_DUE'
}

// Fake PrismaClient to prevent "is not defined" errors
export class PrismaClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user = {} as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  account = {} as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session = {} as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  organization = {} as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userSubscription = {} as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stripeCustomer = {} as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  paymentHistory = {} as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stripeProduct = {} as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stripePrice = {} as any;
}
