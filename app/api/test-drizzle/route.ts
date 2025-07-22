import { NextResponse } from 'next/server';
import { getUserSubscription, getUserTokens, hasActiveSubscription, isUserAdmin } from '@/lib/subscription';

export async function GET() {
  try {
    // Test with a dummy user ID (this won't exist in DB but shouldn't crash)
    const testUserId = 'test-user-123';
    
    console.log('🧪 Testing Drizzle functions...');
    
    // Test getUserSubscription
    const subscription = await getUserSubscription(testUserId, false); // Skip sync
    console.log('✅ getUserSubscription:', subscription);
    
    // Test getUserTokens
    const tokens = await getUserTokens(testUserId);
    console.log('✅ getUserTokens:', tokens);
    
    // Test hasActiveSubscription
    const hasActive = await hasActiveSubscription(testUserId);
    console.log('✅ hasActiveSubscription:', hasActive);
    
    // Test isUserAdmin
    const isAdmin = await isUserAdmin(testUserId);
    console.log('✅ isUserAdmin:', isAdmin);
    
    return NextResponse.json({
      success: true,
      message: 'All 4 Drizzle functions executed without crashing!',
      results: {
        subscription,
        tokens,
        hasActive,
        isAdmin
      }
    });
    
  } catch (error) {
    console.error('❌ Drizzle test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
