#!/bin/bash

# GitHub Repository Setup Script for MCP Builds Mono Repo
# This script helps you create and configure a GitHub repository

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ASCII Art Banner
echo -e "${CYAN}"
cat << "EOF"
 __  __  ____ ____    ____        _ _     _     
|  \/  |/ ___|  _ \  | __ ) _   _(_) | __| |___ 
| |\/| | |   | |_) | |  _ \| | | | | |/ _` / __|
| |  | | |___|  __/  | |_) | |_| | | | (_| \__ \
|_|  |_|\____|_|     |____/ \__,_|_|_|\__,_|___/
                                                 
    Claude Desktop Extensions Setup
EOF
echo -e "${NC}"

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if required tools are installed
check_requirements() {
    print_info "Checking requirements..."
    
    local missing_tools=()
    
    # Check for git
    if ! command -v git &> /dev/null; then
        missing_tools+=("git")
    fi
    
    # Check for GitHub CLI (optional but recommended)
    if ! command -v gh &> /dev/null; then
        print_warning "GitHub CLI (gh) not found. Install it for easier repo creation:"
        echo "  brew install gh  # macOS"
        echo "  Or visit: https://cli.github.com/"
    fi
    
    # Check for Node.js
    if ! command -v node &> /dev/null; then
        missing_tools+=("node")
    fi
    
    # Check for Python
    if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
        missing_tools+=("python")
    fi
    
    # Check for DXT CLI
    if ! command -v dxt &> /dev/null; then
        print_warning "DXT CLI not found. Install with: npm install -g @anthropic-ai/dxt"
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_info "Please install them and run this script again."
        exit 1
    fi
    
    print_success "All required tools are installed!"
}

# Initialize git repository
init_git_repo() {
    print_info "Initializing git repository..."
    
    if [ -d .git ]; then
        print_warning "Git repository already initialized"
    else
        git init
        print_success "Git repository initialized"
    fi
    
    # Add all files
    git add .
    print_success "Files staged for commit"
}

# Create initial commit
create_initial_commit() {
    print_info "Creating initial commit..."
    
    # Check if there are any commits
    if git rev-parse HEAD &> /dev/null; then
        print_warning "Repository already has commits"
    else
        git commit -m "feat: Initial commit - MCP Builds mono-repo setup

- Added core extensions (fs-sandbox, ffprobe, prompt-composer)
- Configured CI/CD pipeline
- Added security policies and threat model
- Implemented dxt-lint validation tool
- Added comprehensive documentation and examples"
        
        print_success "Initial commit created"
    fi
}

# Setup GitHub repository
setup_github_repo() {
    print_info "Setting up GitHub repository..."
    
    # Check if gh CLI is available
    if command -v gh &> /dev/null; then
        echo ""
        echo "Do you want to create a GitHub repository using GitHub CLI? (y/n)"
        read -r create_repo
        
        if [ "$create_repo" = "y" ] || [ "$create_repo" = "Y" ]; then
            echo "Enter repository name (default: mcp-builds-mono):"
            read -r repo_name
            repo_name=${repo_name:-mcp-builds-mono}
            
            echo "Enter repository description:"
            read -r repo_description
            repo_description=${repo_description:-"Production-ready MCP servers for Claude Desktop Extensions"}
            
            echo "Make repository public? (y/n, default: y):"
            read -r is_public
            
            if [ "$is_public" = "n" ] || [ "$is_public" = "N" ]; then
                visibility="private"
            else
                visibility="public"
            fi
            
            # Create repository
            gh repo create "$repo_name" \
                --description "$repo_description" \
                --$visibility \
                --source=. \
                --remote=origin \
                --push
            
            print_success "GitHub repository created and pushed!"
            
            # Set up additional GitHub features
            echo "Enable GitHub features? (issues, wiki, projects) (y/n):"
            read -r enable_features
            
            if [ "$enable_features" = "y" ] || [ "$enable_features" = "Y" ]; then
                gh repo edit --enable-issues --enable-wiki --enable-projects
                print_success "GitHub features enabled"
            fi
            
            # Add topics
            gh repo edit --add-topic "mcp" --add-topic "claude" --add-topic "claude-desktop" --add-topic "extensions" --add-topic "ai"
            print_success "Repository topics added"
            
        fi
    else
        print_info "Manual GitHub setup instructions:"
        echo ""
        echo "1. Go to https://github.com/new"
        echo "2. Repository name: mcp-builds-mono"
        echo "3. Description: Production-ready MCP servers for Claude Desktop Extensions"
        echo "4. Make it public (recommended)"
        echo "5. Don't initialize with README (we already have one)"
        echo "6. Create repository"
        echo ""
        echo "7. Then run these commands:"
        echo -e "${CYAN}"
        echo "git remote add origin https://github.com/YOUR_USERNAME/mcp-builds-mono.git"
        echo "git branch -M main"
        echo "git push -u origin main"
        echo -e "${NC}"
    fi
}

# Setup branch protection
setup_branch_protection() {
    if command -v gh &> /dev/null; then
        print_info "Setting up branch protection rules..."
        
        echo "Set up branch protection for main branch? (y/n):"
        read -r setup_protection
        
        if [ "$setup_protection" = "y" ] || [ "$setup_protection" = "Y" ]; then
            # This requires gh api calls
            gh api repos/:owner/:repo/branches/main/protection \
                --method PUT \
                --field required_status_checks='{"strict":true,"contexts":["continuous-integration"]}' \
                --field enforce_admins=false \
                --field required_pull_request_reviews='{"dismiss_stale_reviews":true,"require_code_owner_reviews":true,"required_approving_review_count":1}' \
                --field restrictions=null \
                2>/dev/null || print_warning "Could not set branch protection (may need admin rights)"
        fi
    fi
}

# Setup GitHub Actions secrets
setup_secrets() {
    if command -v gh &> /dev/null; then
        print_info "Setting up GitHub Actions secrets..."
        
        echo "Add GitHub Actions secrets? (y/n):"
        read -r add_secrets
        
        if [ "$add_secrets" = "y" ] || [ "$add_secrets" = "Y" ]; then
            echo "Enter NPM_TOKEN (for publishing, press enter to skip):"
            read -rs npm_token
            if [ -n "$npm_token" ]; then
                gh secret set NPM_TOKEN --body="$npm_token"
                print_success "NPM_TOKEN added"
            fi
            
            echo "Enter CODECOV_TOKEN (for coverage reports, press enter to skip):"
            read -rs codecov_token
            if [ -n "$codecov_token" ]; then
                gh secret set CODECOV_TOKEN --body="$codecov_token"
                print_success "CODECOV_TOKEN added"
            fi
        fi
    fi
}

# Install dependencies
install_dependencies() {
    print_info "Installing dependencies..."
    
    # Install Node dependencies for each extension
    for extension_dir in extensions/*/; do
        if [ -f "$extension_dir/package.json" ]; then
            print_info "Installing dependencies for $(basename "$extension_dir")..."
            (cd "$extension_dir" && npm install) || print_warning "Failed to install dependencies for $(basename "$extension_dir")"
        fi
    done
    
    # Install Python dependencies
    for extension_dir in extensions/*/; do
        if [ -f "$extension_dir/requirements.txt" ]; then
            print_info "Setting up Python environment for $(basename "$extension_dir")..."
            if command -v python3 &> /dev/null; then
                (cd "$extension_dir" && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt) || print_warning "Failed to setup Python for $(basename "$extension_dir")"
            fi
        fi
    done
    
    print_success "Dependencies installed!"
}

# Run initial validation
run_validation() {
    print_info "Running initial validation..."
    
    # Install dxt-lint dependencies
    if [ -f "tooling/dxt-lint/package.json" ]; then
        (cd tooling/dxt-lint && npm install) || print_warning "Failed to install dxt-lint dependencies"
    fi
    
    # Run validation on each extension
    for extension_dir in extensions/*/; do
        print_info "Validating $(basename "$extension_dir")..."
        node tooling/dxt-lint/dxt-lint.js "$extension_dir" || print_warning "Validation issues in $(basename "$extension_dir")"
    done
}

# Create development environment file
create_env_file() {
    print_info "Creating development environment file..."
    
    if [ ! -f .env.example ]; then
        cat > .env.example << 'EOL'
# Development Environment Variables
# Copy this to .env and fill in your values

# GitHub Integration
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_USERNAME=your-username

# API Keys (stored in OS keychain in production)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Development Settings
NODE_ENV=development
LOG_LEVEL=debug
DEBUG=mcp:*

# Rate Limiting
RATE_LIMIT=60
MAX_FILE_SIZE=104857600

# Allowed Directories (comma-separated)
ALLOWED_DIRS=~/Documents,~/Projects,~/Desktop

# Feature Flags
ENABLE_TELEMETRY=false
ENABLE_EXPERIMENTAL=false
EOL
        print_success "Created .env.example"
    fi
}

# Generate README badges
update_readme_badges() {
    print_info "Updating README badges..."
    
    echo "Enter your GitHub username:"
    read -r github_username
    
    if [ -n "$github_username" ]; then
        # Update README.md with correct username
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/yourusername/$github_username/g" README.md
        else
            # Linux
            sed -i "s/yourusername/$github_username/g" README.md
        fi
        print_success "README badges updated"
    fi
}

# Main setup flow
main() {
    echo -e "${GREEN}Welcome to MCP Builds Repository Setup!${NC}"
    echo ""
    
    # Check we're in the right directory
    if [ ! -f "README.md" ] || [ ! -d "extensions" ]; then
        print_error "Please run this script from the mcp-builds-mono directory"
        exit 1
    fi
    
    # Run setup steps
    check_requirements
    echo ""
    
    init_git_repo
    create_initial_commit
    echo ""
    
    create_env_file
    echo ""
    
    update_readme_badges
    echo ""
    
    install_dependencies
    echo ""
    
    run_validation
    echo ""
    
    setup_github_repo
    setup_branch_protection
    setup_secrets
    echo ""
    
    # Print summary
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎉 Setup Complete!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    print_success "Your MCP Builds repository is ready!"
    echo ""
    echo "Next steps:"
    echo "1. Review and customize the extensions in the 'extensions/' directory"
    echo "2. Run tests: make test"
    echo "3. Build extensions: make build"
    echo "4. Create your first release: git tag v0.1.0 && git push --tags"
    echo ""
    echo "Useful commands:"
    echo "  make help          - Show all available commands"
    echo "  make lint          - Run linters on all code"
    echo "  make test          - Run all tests"
    echo "  make build         - Build all extensions"
    echo "  make security-scan - Run security scanning"
    echo ""
    print_info "Documentation: https://github.com/$github_username/mcp-builds-mono"
    print_info "MCP Docs: https://modelcontextprotocol.io/docs"
    echo ""
    echo -e "${CYAN}Happy building! 🚀${NC}"
}

# Run main function
main

