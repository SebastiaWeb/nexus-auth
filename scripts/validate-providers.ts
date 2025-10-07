/**
 * Provider Validation Script
 *
 * This script validates that all OAuth providers are correctly configured
 * without needing real credentials.
 */

import { GoogleProvider } from '../packages/providers/src/lib/google';
import { GitHubProvider } from '../packages/providers/src/lib/github';
import { FacebookProvider } from '../packages/providers/src/lib/facebook';
import { MicrosoftProvider } from '../packages/providers/src/lib/microsoft';

interface ValidationResult {
  provider: string;
  passed: boolean;
  checks: {
    name: string;
    passed: boolean;
    message?: string;
  }[];
}

async function validateProvider(
  name: string,
  createProvider: () => any,
  expectedAuthUrl: string,
  expectedScopes?: string[]
): Promise<ValidationResult> {
  const checks: ValidationResult['checks'] = [];
  let allPassed = true;

  try {
    // Test 1: Provider creation
    const provider = createProvider();
    checks.push({
      name: 'Provider instantiation',
      passed: !!provider,
      message: 'Provider created successfully',
    });

    // Test 2: Provider has correct properties
    const hasId = !!provider.id;
    const hasType = provider.type === 'oauth';
    checks.push({
      name: 'Provider properties',
      passed: hasId && hasType,
      message: `id: ${provider.id}, type: ${provider.type}`,
    });

    // Test 3: Authorization URL generation
    const authUrl = await provider.getAuthorizationUrl({ state: 'test-state' });
    const urlIsValid = authUrl.startsWith(expectedAuthUrl);
    checks.push({
      name: 'Authorization URL',
      passed: urlIsValid,
      message: urlIsValid ? `✓ URL starts with ${expectedAuthUrl}` : `✗ URL doesn't match expected`,
    });

    // Test 4: URL parameters validation
    const url = new URL(authUrl);
    const hasClientId = url.searchParams.has('client_id');
    const hasRedirectUri = url.searchParams.has('redirect_uri');
    const hasResponseType = url.searchParams.get('response_type') === 'code';
    const hasState = url.searchParams.get('state') === 'test-state';

    const paramsValid = hasClientId && hasRedirectUri && hasResponseType && hasState;
    checks.push({
      name: 'URL parameters',
      passed: paramsValid,
      message: paramsValid
        ? '✓ All required parameters present'
        : '✗ Missing required parameters',
    });

    // Test 5: Scopes validation (if provided)
    if (expectedScopes) {
      const scopeParam = url.searchParams.get('scope') || '';
      const hasAllScopes = expectedScopes.every((scope) =>
        scopeParam.includes(scope)
      );
      checks.push({
        name: 'OAuth scopes',
        passed: hasAllScopes,
        message: hasAllScopes
          ? `✓ Contains: ${expectedScopes.join(', ')}`
          : `✗ Missing scopes: ${scopeParam}`,
      });
    }

    allPassed = checks.every((check) => check.passed);
  } catch (error: any) {
    allPassed = false;
    checks.push({
      name: 'Error during validation',
      passed: false,
      message: error.message,
    });
  }

  return {
    provider: name,
    passed: allPassed,
    checks,
  };
}

async function main() {
  console.log('\n🔍 NexusAuth Provider Validation\n');
  console.log('='.repeat(60));

  const providers = [
    {
      name: 'Google',
      create: () =>
        GoogleProvider({
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          callbackUrl: 'http://localhost:3000/auth/callback/google',
        }),
      expectedAuthUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      expectedScopes: ['openid', 'email', 'profile'],
    },
    {
      name: 'GitHub',
      create: () =>
        GitHubProvider({
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          callbackUrl: 'http://localhost:3000/auth/callback/github',
        }),
      expectedAuthUrl: 'https://github.com/login/oauth/authorize',
      expectedScopes: ['read:user', 'user:email'],
    },
    {
      name: 'Facebook',
      create: () =>
        FacebookProvider({
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          callbackUrl: 'http://localhost:3000/auth/callback/facebook',
        }),
      expectedAuthUrl: 'https://www.facebook.com',
      expectedScopes: ['email', 'public_profile'],
    },
    {
      name: 'Microsoft',
      create: () =>
        MicrosoftProvider({
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          callbackUrl: 'http://localhost:3000/auth/callback/microsoft',
        }),
      expectedAuthUrl: 'https://login.microsoftonline.com',
      expectedScopes: ['openid', 'email', 'profile'],
    },
  ];

  const results: ValidationResult[] = [];

  for (const provider of providers) {
    const result = await validateProvider(
      provider.name,
      provider.create,
      provider.expectedAuthUrl,
      provider.expectedScopes
    );
    results.push(result);
  }

  // Print results
  console.log();
  for (const result of results) {
    const emoji = result.passed ? '✅' : '❌';
    console.log(`${emoji} ${result.provider}`);
    console.log('-'.repeat(60));

    for (const check of result.checks) {
      const checkEmoji = check.passed ? '  ✓' : '  ✗';
      console.log(`${checkEmoji} ${check.name}`);
      if (check.message) {
        console.log(`    ${check.message}`);
      }
    }
    console.log();
  }

  // Summary
  console.log('='.repeat(60));
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  console.log(`\n📊 Summary: ${passedCount}/${totalCount} providers validated successfully\n`);

  // Exit with error if any provider failed
  if (passedCount < totalCount) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});
