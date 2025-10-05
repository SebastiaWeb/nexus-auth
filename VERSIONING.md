# Versioning & Release Process

NexusAuth follows [Semantic Versioning](https://semver.org/) (SemVer) and uses automated releases via [Semantic Release](https://semantic-release.gitbook.io/).

## Semantic Versioning (SemVer)

Version format: `MAJOR.MINOR.PATCH`

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features (backwards compatible)
- **PATCH** (0.0.1): Bug fixes (backwards compatible)

### Examples

```
0.1.0 -> 0.1.1  (patch: bug fix)
0.1.0 -> 0.2.0  (minor: new feature)
0.1.0 -> 1.0.0  (major: breaking change)
```

---

## Conventional Commits

We use [Conventional Commits](https://www.conventionalcommits.org/) to automate versioning and changelog generation.

### Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

| Type | Version Bump | Description | Example |
|------|--------------|-------------|---------|
| `feat` | **MINOR** | New feature | `feat: add Google OAuth provider` |
| `fix` | **PATCH** | Bug fix | `fix: resolve JWT expiration issue` |
| `perf` | **PATCH** | Performance improvement | `perf: optimize database queries` |
| `refactor` | **PATCH** | Code refactoring | `refactor: simplify auth logic` |
| `docs` | None | Documentation changes | `docs: update README` |
| `style` | None | Code style/formatting | `style: fix indentation` |
| `test` | None | Adding/updating tests | `test: add OAuth tests` |
| `build` | None | Build system changes | `build: update dependencies` |
| `ci` | None | CI configuration | `ci: add GitHub Actions` |
| `chore` | None | Maintenance tasks | `chore: update gitignore` |
| `revert` | **PATCH** | Revert previous commit | `revert: undo feature X` |

### Breaking Changes

Add `BREAKING CHANGE:` in the commit body or use `!` after type to trigger a **MAJOR** version bump:

**Option 1: Using footer**
```bash
git commit -m "feat: redesign authentication API

BREAKING CHANGE: signIn method now requires email parameter"
```

**Option 2: Using `!` suffix**
```bash
git commit -m "feat!: redesign authentication API"
```

Both will bump: `0.1.0` → `1.0.0`

### Scopes (Optional)

Add scope to provide context:

```bash
git commit -m "feat(oauth): add Facebook provider"
git commit -m "fix(core): resolve token expiration bug"
git commit -m "docs(api): update method signatures"
```

Common scopes:
- `core` - @nexusauth/core
- `oauth` - OAuth providers
- `adapters` - Database adapters
- `helpers` - Framework helpers
- `api` - API changes
- `deps` - Dependencies

---

## Automated Release Process

### How It Works

1. **Commit with conventional format**
   ```bash
   git commit -m "feat: add password strength validation"
   ```

2. **Push to main branch**
   ```bash
   git push origin main
   ```

3. **Semantic Release runs automatically** (via GitHub Actions)
   - Analyzes commits since last release
   - Determines version bump (patch/minor/major)
   - Generates CHANGELOG.md
   - Creates GitHub release
   - Publishes to NPM
   - Commits version changes

### Release Workflow

```mermaid
graph LR
    A[Commit] --> B[Push to main]
    B --> C[CI Tests]
    C --> D[Semantic Release]
    D --> E[Version Bump]
    E --> F[Generate Changelog]
    F --> G[Create Git Tag]
    G --> H[GitHub Release]
    H --> I[Publish to NPM]
```

---

## Manual Version Bumping

### Using Scripts (Local)

```bash
# Patch version (0.1.0 -> 0.1.1)
pnpm version:patch

# Minor version (0.1.0 -> 0.2.0)
pnpm version:minor

# Major version (0.1.0 -> 1.0.0)
pnpm version:major
```

This updates all `package.json` files in the monorepo.

### Using GitHub Actions (Manual Trigger)

1. Go to **Actions** tab
2. Select **"Version Bump"** workflow
3. Click **"Run workflow"**
4. Choose version type (patch/minor/major)
5. Click **"Run workflow"** button

This will:
- Bump versions
- Update lock file
- Commit changes
- Create Git tag
- Trigger publish workflow

---

## Release Examples

### Patch Release (Bug Fix)

```bash
# Make a bug fix
git commit -m "fix: resolve session expiration issue"

# Push to main
git push origin main
```

**Result**: `0.1.0` → `0.1.1`

### Minor Release (New Feature)

```bash
# Add new feature
git commit -m "feat: add GitHub OAuth provider"

# Push to main
git push origin main
```

**Result**: `0.1.0` → `0.2.0`

### Major Release (Breaking Change)

```bash
# Breaking change with footer
git commit -m "feat: redesign adapter interface

BREAKING CHANGE: All adapters must now implement createTables method"

# Push to main
git push origin main
```

**Result**: `0.1.0` → `1.0.0`

### Multiple Changes

```bash
# Multiple commits
git commit -m "feat: add password reset flow"
git commit -m "fix: resolve OAuth callback bug"
git commit -m "docs: update migration guide"

# Push to main
git push origin main
```

**Result**: `0.1.0` → `0.2.0` (highest version bump wins = minor)

---

## Changelog Generation

Changelog is **automatically generated** based on commits:

### Example CHANGELOG.md

```markdown
# Changelog

## [0.2.0] - 2025-01-15

### ✨ Features
- add GitHub OAuth provider (#12)
- add password strength validation (#14)

### 🐛 Bug Fixes
- resolve JWT expiration issue (#13)
- fix OAuth callback redirect (#15)

### 📚 Documentation
- update API reference
- add migration guide from Auth.js
```

### Commit to Changelog Mapping

| Commit | Changelog Section |
|--------|-------------------|
| `feat:` | ✨ Features |
| `fix:` | 🐛 Bug Fixes |
| `perf:` | ⚡ Performance Improvements |
| `refactor:` | ♻️ Code Refactoring |
| `docs:` | 📚 Documentation |
| `revert:` | ⏪ Reverts |

---

## Best Practices

### ✅ DO

- **Use conventional commits** for all changes
- **Write clear descriptions** (not "fix bug" but "fix JWT expiration")
- **Add scope** when applicable (`feat(oauth): ...`)
- **Test before pushing** to main
- **Use breaking change** footer for major changes

### ❌ DON'T

- Don't commit directly to main without conventional format
- Don't manually edit CHANGELOG.md (auto-generated)
- Don't manually bump versions (use scripts or automation)
- Don't skip CI checks
- Don't force push to main

---

## Commit Message Examples

### Good Examples ✅

```bash
# Feature with scope
git commit -m "feat(oauth): add Microsoft OAuth provider"

# Bug fix with details
git commit -m "fix(core): prevent token refresh race condition"

# Breaking change
git commit -m "feat!: require Node.js 18+ for all packages"

# Multiple lines
git commit -m "feat: add email verification flow

- Generate verification tokens
- Send verification emails
- Verify email endpoint"
```

### Bad Examples ❌

```bash
# Too vague
git commit -m "fix bug"
git commit -m "update stuff"

# Missing type
git commit -m "add Google OAuth"

# Wrong case
git commit -m "Feat: Add feature"
git commit -m "FIX: bug fix"
```

---

## Pre-release Versions

For beta/alpha releases:

```bash
# Create pre-release branch
git checkout -b beta

# Commit as usual
git commit -m "feat: experimental feature"

# Tag with pre-release
git tag v0.2.0-beta.1
git push origin v0.2.0-beta.1
```

Publish with tag:
```bash
pnpm publish -r --tag beta
```

Users can install:
```bash
npm install @nexusauth/core@beta
```

---

## Version Synchronization

All packages share the same version number:

```json
// Root package.json
{ "version": "0.2.0" }

// packages/core/package.json
{ "version": "0.2.0" }

// packages/typeorm-adapter/package.json
{ "version": "0.2.0" }
```

This is maintained automatically by our version scripts.

---

## Troubleshooting

### Commit message validation fails

**Error**: `commit message does not follow conventional format`

**Fix**: Ensure message follows pattern:
```bash
git commit -m "type(scope): description"
```

### Semantic release skips version bump

**Cause**: No commits that trigger version bump (e.g., only `docs:` or `chore:`)

**Fix**: Ensure you have `feat:`, `fix:`, or breaking changes

### Version mismatch across packages

**Fix**: Run version sync script:
```bash
pnpm version:minor  # This syncs all packages
```

---

## Resources

- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Release](https://semantic-release.gitbook.io/)
- [Commitlint](https://commitlint.js.org/)

---

## Quick Reference

### Version Bump Cheat Sheet

| Change Type | Command | Example Commit |
|-------------|---------|----------------|
| Bug fix | `pnpm version:patch` | `fix: resolve issue` |
| New feature | `pnpm version:minor` | `feat: add feature` |
| Breaking change | `pnpm version:major` | `feat!: breaking change` |

### Commit Format Cheat Sheet

```
type(scope): subject

body

footer
```

**Types**: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

**Scopes**: core, oauth, adapters, helpers, api, deps (optional)

**Subject**: Imperative, lowercase, no period

**Body**: Explain what and why (optional)

**Footer**: Breaking changes, issue references (optional)
