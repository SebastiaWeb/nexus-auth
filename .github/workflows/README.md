# GitHub Actions Workflows

This directory contains CI/CD workflows for NexusAuth.

## Workflows

### 1. CI (`ci.yml`)

**Triggers:**
- Push to `main`, `master`, or `develop` branches
- Pull requests to `main`, `master`, or `develop` branches

**Jobs:**
- **test**: Runs tests on Node.js 18, 20, and 22
- **build**: Builds all packages
- **quality**: Runs type checking and format validation

### 2. Publish (`publish.yml`)

**Triggers:**
- When a GitHub release is published

**What it does:**
- Builds all packages
- Runs tests
- Publishes to NPM with `--access public`

**Requirements:**
- `NPM_TOKEN` secret must be configured in repository settings

### 3. Release (`release.yml`)

**Triggers:**
- Push to `main` or `master` branch

**What it does:**
- Automatically creates releases using Semantic Release
- Generates changelog
- Creates Git tags
- Publishes to NPM

**Requirements:**
- `NPM_TOKEN` secret must be configured
- Uses conventional commits for version bumping

### 4. Version Bump (`version-bump.yml`)

**Triggers:**
- Manual workflow dispatch

**What it does:**
- Manually bump version (patch/minor/major)
- Updates all package.json files
- Commits changes
- Creates Git tag

## Setting Up

### 1. Add NPM Token

1. Generate NPM token: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Add to GitHub repository secrets as `NPM_TOKEN`

### 2. Configure Branch Protection (Optional)

1. Go to Settings > Branches
2. Add rule for `main` branch:
   - Require pull request reviews
   - Require status checks (CI tests)
   - Require branches to be up to date

### 3. Enable GitHub Actions

1. Go to Settings > Actions > General
2. Allow all actions and reusable workflows
3. Set workflow permissions to "Read and write"

## Conventional Commits

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automated versioning:

- `feat:` - New feature (minor version bump)
- `fix:` - Bug fix (patch version bump)
- `perf:` - Performance improvement (patch version bump)
- `BREAKING CHANGE:` - Breaking change (major version bump)
- `docs:` - Documentation only (no release)
- `chore:` - Maintenance tasks (no release)

### Examples

```bash
# Minor version bump (0.1.0 -> 0.2.0)
git commit -m "feat: add Google OAuth provider"

# Patch version bump (0.1.0 -> 0.1.1)
git commit -m "fix: resolve JWT expiration issue"

# Major version bump (0.1.0 -> 1.0.0)
git commit -m "feat!: redesign authentication API

BREAKING CHANGE: signIn method now requires email parameter"

# No version bump
git commit -m "docs: update README with new examples"
```

## Manual Release Process

If you prefer manual releases:

1. Go to Actions tab
2. Select "Version Bump" workflow
3. Click "Run workflow"
4. Choose version type (patch/minor/major)
5. Click "Run workflow" button

This will:
- Bump versions in all packages
- Commit changes
- Create Git tag
- Trigger publish workflow

## Troubleshooting

### Publish fails with "401 Unauthorized"
- Check that `NPM_TOKEN` is correctly set in secrets
- Verify token has publish permissions

### Semantic Release creates wrong version
- Check your commit messages follow conventional commits format
- Review `.releaserc.json` configuration

### Workflow not triggering
- Ensure GitHub Actions is enabled in repository settings
- Check branch name matches workflow triggers
- Verify workflow file syntax is correct

## Local Testing

Test workflows locally with [act](https://github.com/nektos/act):

```bash
# Install act
brew install act  # macOS
# or
choco install act  # Windows

# Test CI workflow
act push

# Test with specific event
act release -e test/release.json
```
