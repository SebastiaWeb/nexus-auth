# GitHub Configuration for NexusAuth

This directory contains GitHub-specific configuration files, templates, and workflows for the NexusAuth project.

## 📋 Issue Templates

Located in [ISSUE_TEMPLATE/](./ISSUE_TEMPLATE/), we provide several templates to help contributors report issues effectively:

### Core Templates

- **[bug_report.yml](./ISSUE_TEMPLATE/bug_report.yml)** - Report bugs or unexpected behavior
  - Collects detailed reproduction steps
  - Captures environment information
  - Identifies affected packages

- **[feature_request.yml](./ISSUE_TEMPLATE/feature_request.yml)** - Suggest new features
  - Describes problem and solution
  - Includes example usage
  - Assesses priority and impact

### Specialized Templates

- **[documentation.yml](./ISSUE_TEMPLATE/documentation.yml)** - Report documentation issues
  - Fix typos or unclear content
  - Request missing documentation
  - Suggest improvements

- **[question.yml](./ISSUE_TEMPLATE/question.yml)** - Ask usage questions
  - Get help with implementation
  - Clarify features
  - Discuss best practices

- **[adapter_request.yml](./ISSUE_TEMPLATE/adapter_request.yml)** - Request new database adapters
  - Propose support for new ORMs/databases
  - Share use cases
  - Offer to contribute

- **[provider_request.yml](./ISSUE_TEMPLATE/provider_request.yml)** - Request OAuth providers
  - Suggest new OAuth integrations
  - Provide provider documentation
  - Indicate priority

### Configuration

- **[config.yml](./ISSUE_TEMPLATE/config.yml)** - Issue template settings
  - Disables blank issues
  - Provides helpful links

## 💬 Discussion Templates

Located in [DISCUSSION_TEMPLATE/](./DISCUSSION_TEMPLATE/):

- **[general.yml](./DISCUSSION_TEMPLATE/general.yml)** - Open-ended discussions
- **[ideas.yml](./DISCUSSION_TEMPLATE/ideas.yml)** - Share early-stage ideas
- **[show-and-tell.yml](./DISCUSSION_TEMPLATE/show-and-tell.yml)** - Showcase projects built with NexusAuth

## 🔄 Pull Request Template

- **[pull_request_template.md](./pull_request_template.md)** - Standard PR template
  - Checklist for contributors
  - Type of change classification
  - Testing requirements
  - Breaking change documentation

## 🤖 Workflows

Located in [workflows/](./workflows/):

### CI/CD Workflows

- **[ci.yml](./workflows/ci.yml)** - Continuous integration
- **[release.yml](./workflows/release.yml)** - Automated releases
- **[publish.yml](./workflows/publish.yml)** - Package publishing
- **[version-bump.yml](./workflows/version-bump.yml)** - Version management

### Automation Workflows

- **[auto-label.yml](./workflows/auto-label.yml)** - Auto-label PRs based on changed files
- **[auto-assign.yml](./workflows/auto-assign.yml)** - Auto-assign PRs to authors
- **[pr-size-labeler.yml](./workflows/pr-size-labeler.yml)** - Label PRs by size
- **[label-sync.yml](./workflows/label-sync.yml)** - Sync repository labels
- **[stale.yml](./workflows/stale.yml)** - Mark stale issues/PRs
- **[greet.yml](./workflows/greet.yml)** - Welcome first-time contributors

## 🏷️ Labels

- **[labels.yml](./labels.yml)** - Label definitions
  - Type labels (bug, enhancement, etc.)
  - Priority labels (critical, high, medium, low)
  - Package labels (pkg: core, pkg: adapters, etc.)
  - Area labels (area: security, area: oauth, etc.)
  - Size labels (size: XS, S, M, L, XL)
  - Special labels (good first issue, help wanted, etc.)

- **[labeler.yml](./labeler.yml)** - Auto-labeling configuration
  - Automatically labels PRs based on changed files

## 👥 Code Ownership

- **[CODEOWNERS](./CODEOWNERS)** - Defines code ownership
  - Assigns reviewers automatically
  - Ensures proper review coverage

## 🔒 Security

- **[SECURITY.md](./SECURITY.md)** - Security policy
  - Vulnerability reporting process
  - Security best practices
  - Supported versions

## 💝 Support

- **[SUPPORT.md](./SUPPORT.md)** - Getting support
  - Where to ask questions
  - How to report issues
  - Community resources

## 💰 Funding

- **[FUNDING.yml](./FUNDING.yml)** - Sponsorship configuration
  - GitHub Sponsors
  - Other funding platforms

## 📊 Label Management

To sync labels to the repository:

```bash
# Using GitHub CLI
gh label sync -f .github/labels.yml

# Or let the workflow do it automatically when labels.yml is updated
```

## 🔧 Workflow Triggers

### Automatic Triggers

- **On Push**: CI, Release workflows
- **On PR**: Auto-label, size labeler, CI
- **On Schedule**: Stale issue management (daily)
- **On Issue/PR Open**: First-time contributor greeting

### Manual Triggers

Most workflows support `workflow_dispatch` for manual execution via GitHub Actions UI.

## 📝 Customization

### Adding New Issue Templates

1. Create a new `.yml` file in `ISSUE_TEMPLATE/`
2. Follow the structure of existing templates
3. Add appropriate labels and validation
4. Update this README

### Modifying Workflows

1. Edit workflow files in `workflows/`
2. Test locally if possible (using [act](https://github.com/nektos/act))
3. Commit and push to trigger
4. Monitor in GitHub Actions tab

### Updating Labels

1. Modify `labels.yml`
2. Push to main/master
3. Label sync workflow runs automatically
4. Or run manually: `gh label sync -f .github/labels.yml`

## 🧪 Testing Templates

To test issue templates locally:

1. Create a new issue
2. Select the template
3. Fill out the form
4. Review the generated markdown
5. Adjust template as needed

## 📚 Resources

- [GitHub Docs - Issue Templates](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests)
- [GitHub Docs - Actions](https://docs.github.com/en/actions)
- [GitHub Docs - CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)

## 🤝 Contributing

To improve our GitHub templates and workflows:

1. Open an issue describing the improvement
2. Submit a PR with your changes
3. Update this README if needed

---

**Maintained by**: NexusAuth Team
**Questions?**: See [SUPPORT.md](./SUPPORT.md)
