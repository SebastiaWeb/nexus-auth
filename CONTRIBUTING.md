# Contributing to NexusAuth

Thank you for your interest in contributing to NexusAuth! We welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code.

### Our Standards

- **Be respectful** and inclusive
- **Be collaborative** and constructive
- **Be patient** with newcomers
- **Focus on what is best** for the community
- **Show empathy** towards other community members

## Getting Started

### Prerequisites

- Node.js 16+ installed
- pnpm 8+ installed
- Git installed
- Familiarity with TypeScript

### First Time Contributors

1. Look for issues labeled `good first issue` or `help wanted`
2. Comment on the issue to let others know you're working on it
3. Fork the repository and create a branch
4. Make your changes and submit a PR

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repo on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/nexus-auth.git
cd nexus-auth
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Build All Packages

```bash
pnpm build
```

### 4. Run Tests

```bash
pnpm test
```

### 5. Create a Branch

```bash
git checkout -b feat/my-feature
# or
git checkout -b fix/bug-description
```

## How to Contribute

### Reporting Bugs

1. Search existing issues first
2. Use the bug report template
3. Provide reproduction steps
4. Include environment details
5. Add error logs if applicable

### Suggesting Features

1. Search existing issues and discussions
2. Use the feature request template
3. Explain the use case
4. Provide example usage
5. Consider implementation complexity

### Improving Documentation

- Fix typos or unclear explanations
- Add missing examples
- Improve API documentation
- Create tutorials or guides

### Code Contributions

1. **Pick an issue** or create one
2. **Discuss approach** in the issue
3. **Fork and branch** from main
4. **Write code** following our standards
5. **Add tests** for new features
6. **Update docs** if needed
7. **Submit PR** with clear description

## Coding Standards

### TypeScript Configuration

This project uses **strict TypeScript** with ESM modules:

#### Module System (`"module": "nodenext"`)

We use ECMAScript modules (ESM). All imports/exports must use ESM syntax.

#### Relative Imports with `.js` Extension (Critical Rule)

**All relative imports between files in the same package MUST include the `.js` extension:**

```typescript
// ✅ Correct
import { BaseAdapter } from './types.js';
import { NexusAuth } from './nexus-auth.js';

// ❌ Wrong - This will cause TS2307 error
import { BaseAdapter } from './types';
import { NexusAuth } from './nexus-auth';
```

Why? TypeScript with `moduleResolution: "nodenext"` requires `.js` extensions for proper Node.js ESM resolution.

#### Single Source of Truth for Types

All core types are centralized in `packages/core/src/lib/types.ts`. Never duplicate type definitions.

```typescript
// ✅ Correct
import { User, BaseAdapter } from '@nexus-auth/core';

// ❌ Wrong - Don't redefine types
interface User {
  // duplicate definition
}
```

#### Strict Mode (`"strict": true`)

Strict null checks are enabled. Be explicit with nullable types:

```typescript
// ✅ Correct
function findUser(): User | null {
  if (userExists) return user;
  return null;
}

// ❌ Wrong - Type mismatch
function findUser(): User | undefined {
  return null; // Error!
}
```

### Code Style

- Use **2 spaces** for indentation
- Use **single quotes** for strings
- Add **semicolons** at end of statements
- Use **arrow functions** for callbacks
- Prefer **const** over let

### Naming Conventions

- **PascalCase** for classes and types
- **camelCase** for variables and functions
- **SCREAMING_SNAKE_CASE** for constants

```typescript
// ✅ Good
class NexusAuth {}
const userSession = {};
const MAX_RETRY_COUNT = 3;

// ❌ Bad
class nexusauth {}
const us = {};
const max = 3;
```

### Comments & Documentation

Use JSDoc for public APIs:

```typescript
/**
 * Creates a new session for the authenticated user
 * @param userId - The unique identifier of the user
 * @param options - Session configuration options
 * @returns Session object with token and expiry
 */
export async function createSession(
  userId: string,
  options?: SessionOptions
): Promise<Session> {
  // Implementation
}
```

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/).

### Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style (formatting)
- `refactor:` - Code refactoring
- `perf:` - Performance improvement
- `test:` - Adding tests
- `build:` - Build system changes
- `ci:` - CI configuration
- `chore:` - Maintenance tasks

### Examples

```bash
# Feature
git commit -m "feat(oauth): add Microsoft OAuth provider"

# Bug fix
git commit -m "fix(core): resolve JWT expiration issue"

# Breaking change
git commit -m "feat(adapters)!: change adapter interface

BREAKING CHANGE: All adapters must now implement createTables method"
```

## Pull Request Process

### Before Submitting

1. **Update from main**: `git pull origin main`
2. **Run tests**: `pnpm test`
3. **Run build**: `pnpm build`
4. **Update docs**: If API changed

### PR Requirements

- [ ] Follows coding standards
- [ ] Includes tests for new features
- [ ] Updates documentation
- [ ] Passes all CI checks
- [ ] Has clear description
- [ ] Links related issues
- [ ] Follows commit conventions

### PR Title

Use conventional commit format:

```
feat(oauth): add Microsoft OAuth provider
fix(core): resolve session expiration bug
```

### Review Process

1. **Automated checks** run first
2. **Maintainer review** within 2-3 days
3. **Address feedback** if requested
4. **Approval** from at least one maintainer
5. **Merge** by maintainer

## Testing Guidelines

### Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { NexusAuth } from './nexus-auth.js';

describe('NexusAuth', () => {
  it('should throw error if no adapter provided', () => {
    expect(() => new NexusAuth({} as any)).toThrow(
      'No adapter provided'
    );
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test --coverage

# Watch mode
pnpm test --watch
```

## Project Structure

```
nexus-auth/
├── packages/
│   ├── core/               # Core authentication library
│   ├── typeorm-adapter/    # TypeORM adapter
│   ├── prisma-adapter/     # Prisma adapter
│   ├── providers/          # OAuth providers
│   └── ...                 # Other packages
├── guides/                 # User guides
├── .github/                # GitHub templates
└── scripts/                # Build scripts
```

## GitHub Templates

We have several issue templates to help you:

- **[Bug Report](.github/ISSUE_TEMPLATE/bug_report.yml)** - Report bugs or unexpected behavior
- **[Feature Request](.github/ISSUE_TEMPLATE/feature_request.yml)** - Suggest new features
- **[Documentation Issue](.github/ISSUE_TEMPLATE/documentation.yml)** - Report documentation problems
- **[Question](.github/ISSUE_TEMPLATE/question.yml)** - Ask questions about usage
- **[Adapter Request](.github/ISSUE_TEMPLATE/adapter_request.yml)** - Request new database adapters
- **[Provider Request](.github/ISSUE_TEMPLATE/provider_request.yml)** - Request new OAuth providers

## Getting Help

- 📚 [Documentation](./README.md)
- 💬 [GitHub Discussions](https://github.com/yourusername/nexus-auth/discussions)
- 🐛 [Report Issues](https://github.com/yourusername/nexus-auth/issues)
- 🆘 [Support Guide](.github/SUPPORT.md)
- 🔒 [Security Policy](.github/SECURITY.md)

Thank you for contributing to NexusAuth! 🙏
