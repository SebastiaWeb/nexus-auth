#!/usr/bin/env node

/**
 * Script to optimize all package.json files in the monorepo
 * Adds metadata, keywords, and ensures consistency
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const PACKAGES_DIR = 'packages';
const VERSION = '0.1.0';

const commonMetadata = {
  author: 'NexusAuth Team',
  license: 'MIT',
  repository: {
    type: 'git',
    url: 'https://github.com/yourusername/nexus-auth.git',
  },
  homepage: 'https://github.com/yourusername/nexus-auth#readme',
  bugs: {
    url: 'https://github.com/yourusername/nexus-auth/issues',
  },
  engines: {
    node: '>=16.0.0',
  },
  publishConfig: {
    access: 'public',
  },
};

const packageDescriptions = {
  core: 'Core authentication library for NexusAuth - Framework agnostic, TypeScript-first authentication with schema mapping',
  'typeorm-adapter': 'TypeORM adapter for NexusAuth - Database integration with schema mapping support',
  'prisma-adapter': 'Prisma adapter for NexusAuth - Modern database toolkit integration with schema mapping',
  'mongoose-adapter': 'Mongoose adapter for NexusAuth - MongoDB integration with schema mapping support',
  'sql-adapter': 'Raw SQL adapter for NexusAuth - Universal SQL database support without ORM dependencies',
  providers: 'OAuth provider implementations for NexusAuth - Google, GitHub, Facebook, Microsoft',
  'nextjs-helpers': 'Next.js integration helpers for NexusAuth - App Router and Pages Router support',
  'nestjs-helpers': 'NestJS integration helpers for NexusAuth - Guards, decorators, and modules',
  'express-helpers': 'Express.js integration helpers for NexusAuth - Middleware and route protection',
};

const packageKeywords = {
  core: ['auth', 'authentication', 'jwt', 'oauth', 'oauth2', 'session', 'passport', 'nextauth', 'typescript', 'security'],
  'typeorm-adapter': ['nexus-auth', 'typeorm', 'adapter', 'database', 'postgres', 'mysql', 'sqlite', 'mssql', 'authentication'],
  'prisma-adapter': ['nexus-auth', 'prisma', 'adapter', 'database', 'postgres', 'mysql', 'sqlite', 'authentication'],
  'mongoose-adapter': ['nexus-auth', 'mongoose', 'mongodb', 'adapter', 'database', 'authentication'],
  'sql-adapter': ['nexus-auth', 'sql', 'adapter', 'database', 'postgres', 'mysql', 'sqlite', 'mssql', 'authentication'],
  providers: ['nexus-auth', 'oauth', 'oauth2', 'google', 'github', 'facebook', 'microsoft', 'authentication', 'provider'],
  'nextjs-helpers': ['nexus-auth', 'nextjs', 'next', 'react', 'app-router', 'pages-router', 'authentication', 'helpers'],
  'nestjs-helpers': ['nexus-auth', 'nestjs', 'nest', 'guards', 'decorators', 'authentication', 'helpers'],
  'express-helpers': ['nexus-auth', 'express', 'middleware', 'authentication', 'helpers'],
};

function optimizePackage(packagePath, packageName) {
  const pkgJsonPath = join(packagePath, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));

  // Update version
  pkg.version = VERSION;

  // Add description
  if (!pkg.description) {
    pkg.description = packageDescriptions[packageName] || `${packageName} package for NexusAuth`;
  }

  // Add keywords
  if (!pkg.keywords) {
    pkg.keywords = packageKeywords[packageName] || ['nexus-auth', 'authentication'];
  }

  // Remove private flag (packages should be public for NPM)
  delete pkg.private;

  // Add common metadata
  Object.assign(pkg, {
    ...commonMetadata,
    repository: {
      ...commonMetadata.repository,
      directory: `packages/${packageName}`,
    },
  });

  // Ensure files array includes necessary files
  if (!pkg.files) {
    pkg.files = ['dist', 'README.md', 'LICENSE'];
  } else if (!pkg.files.includes('README.md')) {
    pkg.files.push('README.md', 'LICENSE');
  }

  // Update peerDependencies to use published version range
  if (pkg.peerDependencies && pkg.peerDependencies['@nexus-auth/core']) {
    if (packageName !== 'core') {
      pkg.peerDependencies['@nexus-auth/core'] = `^${VERSION}`;
    }
  }

  // Write back to file
  writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✅ Optimized ${packageName}`);
}

// Main
const packages = readdirSync(PACKAGES_DIR, { withFileTypes: true })
  .filter((dirent) => {
    if (!dirent.isDirectory()) return false;
    // Skip common non-package directories
    if (['node_modules', 'dist', '.cache'].includes(dirent.name)) return false;
    // Check if package.json exists
    try {
      const pkgPath = join(PACKAGES_DIR, dirent.name, 'package.json');
      readFileSync(pkgPath);
      return true;
    } catch {
      return false;
    }
  })
  .map((dirent) => dirent.name);

console.log('🚀 Optimizing package.json files...\n');

packages.forEach((packageName) => {
  const packagePath = join(PACKAGES_DIR, packageName);
  optimizePackage(packagePath, packageName);
});

console.log('\n✨ All packages optimized!');
