# 🚀 Setting Up Your MCP Builds GitHub Repository

Follow these steps to create and configure your GitHub repository for the MCP Builds mono-repo.

## Prerequisites

- Git installed on your machine
- GitHub account
- (Optional) GitHub CLI (`gh`) for easier setup

## Quick Setup (Automated)

We've created a setup script that automates most of the process:

```bash
# Make the script executable (if not already)
chmod +x setup-github-repo.sh

# Run the setup script
./setup-github-repo.sh
```

The script will:
- ✅ Check requirements
- ✅ Initialize git repository  
- ✅ Create initial commit
- ✅ Install dependencies
- ✅ Run validation
- ✅ Help create GitHub repository
- ✅ Configure branch protection
- ✅ Set up secrets

## Manual Setup (Step by Step)

### 1. Initialize Local Repository

```bash
# Navigate to your project directory
cd /Users/videopost/Downloads/mcp-builds-mono

# Initialize git
git init

# Add all files
git add .

# Create initial commit
git commit -m "feat: Initial commit - MCP Builds mono-repo setup"
```

### 2. Create GitHub Repository

#### Option A: Using GitHub CLI (Recommended)
```bash
# Install GitHub CLI if needed
brew install gh  # macOS
# or visit: https://cli.github.com/

# Authenticate
gh auth login

# Create repository
gh repo create mcp-builds-mono \
  --description "Production-ready MCP servers for Claude Desktop Extensions" \
  --public \
  --source=. \
  --remote=origin \
  --push
```

#### Option B: Using GitHub Web Interface
1. Go to https://github.com/new
2. Repository name: `mcp-builds-mono`
3. Description: `Production-ready MCP servers for Claude Desktop Extensions`
4. Set to **Public** (recommended)
5. **DON'T** initialize with README (we already have one)
6. Click "Create repository"
7. Run these commands locally:
```bash
git remote add origin https://github.com/YOUR_USERNAME/mcp-builds-mono.git
git branch -M main
git push -u origin main
```

### 3. Configure Repository Settings

#### Add Topics
Go to your repository settings and add these topics:
- `mcp`
- `claude`
- `claude-desktop`
- `extensions`
- `ai`
- `typescript`
- `python`

#### Enable Features
In Settings → General:
- ✅ Issues
- ✅ Projects
- ✅ Wiki (optional)
- ✅ Discussions (recommended)

#### Set up Branch Protection
In Settings → Branches → Add rule:
- Branch name pattern: `main`
- ✅ Require pull request reviews before merging
- ✅ Dismiss stale pull request approvals
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date
- ✅ Include administrators

### 4. Set up GitHub Actions Secrets (Optional)

In Settings → Secrets and variables → Actions:

Add these secrets if you plan to:
- **NPM_TOKEN**: For publishing to npm
- **CODECOV_TOKEN**: For code coverage reports
- **SLACK_WEBHOOK**: For notifications

### 5. Configure GitHub Pages (Optional)

For documentation hosting:
1. Settings → Pages
2. Source: Deploy from a branch
3. Branch: main
4. Folder: /docs

### 6. Create Initial Release

```bash
# Tag the initial version
git tag v0.1.0

# Push tags
git push --tags

# Create release on GitHub
gh release create v0.1.0 \
  --title "Initial Release v0.1.0" \
  --notes "First release of MCP Builds mono-repo with core extensions" \
  --draft
```

## Post-Setup Tasks

### 1. Update README Badges
Replace `yourusername` in README.md with your actual GitHub username:
```bash
sed -i '' 's/yourusername/YOUR_ACTUAL_USERNAME/g' README.md  # macOS
# or
sed -i 's/yourusername/YOUR_ACTUAL_USERNAME/g' README.md     # Linux
```

### 2. Install Dependencies
```bash
make setup
```

### 3. Run Tests
```bash
make test
```

### 4. Build Extensions
```bash
make build
```

### 5. Package Extensions
```bash
make pack-all
```

## Verification Checklist

- [ ] Repository created on GitHub
- [ ] Local repository connected to GitHub
- [ ] All files pushed successfully
- [ ] CI/CD pipeline running (check Actions tab)
- [ ] README badges showing correctly
- [ ] Can clone repository from another location
- [ ] Dependencies install successfully
- [ ] Tests pass
- [ ] Extensions can be packaged

## Useful Commands

```bash
# Check repository status
git status

# View remote configuration
git remote -v

# Run all CI checks locally
make ci

# View all available commands
make help

# Clean everything and start fresh
make clean
```

## Troubleshooting

### Permission Denied
If you get permission denied when pushing:
```bash
# Check your authentication
gh auth status

# Re-authenticate
gh auth login
```

### CI Failing
Check the Actions tab on GitHub for detailed error messages.

### Dependencies Not Installing
```bash
# Clear cache and reinstall
make clean-deps
make install-deps
```

## Next Steps

1. **Customize Extensions**: Modify the extensions in `extensions/` directory
2. **Add Your Features**: Implement your specific functionality
3. **Write Tests**: Add comprehensive test coverage
4. **Update Documentation**: Keep README and docs current
5. **Create Releases**: Use semantic versioning for releases

## Support

- 📖 [MCP Documentation](https://modelcontextprotocol.io/docs)
- 💬 [GitHub Discussions](https://github.com/yourusername/mcp-builds-mono/discussions)
- 🐛 [Issue Tracker](https://github.com/yourusername/mcp-builds-mono/issues)

---

🎉 **Congratulations!** Your MCP Builds repository is ready for development!
