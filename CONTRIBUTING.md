# Contributing to MCP Builds

Thank you for your interest in contributing to MCP Builds! This document provides guidelines and instructions for contributing to our mono-repo of Claude Desktop Extensions.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Security Guidelines](#security-guidelines)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please read our Code of Conduct:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Respect differing viewpoints and experiences
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 18+ or Python 3.11+
- Git
- DXT CLI: `npm install -g @anthropic-ai/dxt`
- Claude Desktop (for testing)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/yourusername/mcp-builds-mono.git
   cd mcp-builds-mono
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/mcp-builds/mcp-builds-mono.git
   ```

### Development Setup

```bash
# Install tooling dependencies
npm install

# Install pre-commit hooks
npm run setup:hooks

# Verify setup
npm run validate:all
```

## Development Process

### 1. Choose or Create an Issue

- Check existing issues for something to work on
- For new features, create an issue first to discuss
- For bugs, ensure it's reproducible and not already reported

### 2. Create a Feature Branch

```bash
git checkout -b feature/extension-name
# or
git checkout -b fix/issue-description
```

### 3. Follow the Extension Structure

Every extension MUST have:
```
extensions/your-extension/
├── manifest.json       # DXT manifest (REQUIRED)
├── server/            # MCP server implementation
│   ├── index.ts/main.py
│   └── lib/
├── tests/             # Test suite (REQUIRED)
│   ├── unit/
│   └── integration/
├── docs/
│   └── README.md      # User documentation (REQUIRED)
├── package.json or requirements.txt
└── screenshots/       # UI examples (if applicable)
```

### 4. Implement Required Features

Every extension MUST implement:

#### Health Check Tool
```typescript
async function health_check(): Promise<{
  status: 'ok' | 'degraded' | 'error';
  version: string;
  uptime_seconds: number;
  memory_mb: number;
}> {
  // Implementation
}
```

#### Capabilities Tool
```typescript
async function capabilities(): Promise<{
  tools: Tool[];
  prompts: Prompt[];
  limits: ResourceLimits;
}> {
  // Implementation
}
```

#### Sandboxed File Access (if accessing files)
```typescript
async function read_file_sandboxed(path: string): Promise<string> {
  validatePath(path, allowedDirectories);
  // Implementation
}
```

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript for all new Node.js extensions
- Enable strict mode in tsconfig.json
- Use ESLint and Prettier
- Follow naming conventions:
  - Files: `kebab-case.ts`
  - Classes: `PascalCase`
  - Functions/variables: `camelCase`
  - Constants: `SCREAMING_SNAKE_CASE`

### Python

- Use Python 3.11+ with type hints
- Follow PEP 8
- Use Black for formatting
- Use Ruff for linting
- Use mypy for type checking
- Follow naming conventions:
  - Files: `snake_case.py`
  - Classes: `PascalCase`
  - Functions/variables: `snake_case`
  - Constants: `SCREAMING_SNAKE_CASE`

### Common Requirements

- **No hardcoded secrets**: Use `user_config` for all sensitive data
- **Path validation**: Always validate file paths against allowlists
- **Input validation**: Use Zod (TS) or Pydantic (Python) for all inputs
- **Error handling**: Comprehensive try-catch/except blocks
- **Audit logging**: Log all operations (no PII)
- **Resource limits**: Enforce memory, CPU, and file size limits
- **Timeouts**: 30s default, configurable
- **Rate limiting**: Implement token bucket algorithm

## Testing Requirements

### Unit Tests (Required)

- Minimum 80% code coverage
- Test all public functions
- Test error conditions
- Test edge cases

```bash
# TypeScript
npm test

# Python
pytest --cov=server --cov-report=term-missing
```

### Integration Tests (Required)

- Test MCP protocol compliance
- Test tool execution
- Test resource cleanup
- Test cancellation

### Security Tests (Required)

- Path traversal attempts
- Input validation
- Resource exhaustion
- Secret scanning

### Performance Tests (Recommended)

- Response time measurements
- Memory usage monitoring
- Stress testing

## Security Guidelines

### Never Do This

```typescript
// ❌ Hardcoded secrets
const API_KEY = "sk-abc123";

// ❌ Direct environment access
process.env.MY_SECRET;

// ❌ Unvalidated file access
fs.readFile(userPath);

// ❌ Dynamic code execution
eval(userCode);
new Function(userCode);

// ❌ Logging sensitive data
console.log(`Token: ${apiToken}`);
```

### Always Do This

```typescript
// ✅ Use user_config for secrets
const apiKey = config.get('api_key');

// ✅ Validate all paths
const safePath = validatePath(userPath, allowedDirs);

// ✅ Use schemas for input validation
const validated = InputSchema.parse(userInput);

// ✅ Implement rate limiting
checkRateLimit(clientId);

// ✅ Audit log without PII
auditLog('tool_name', 'success', { path_hash: hash(path) });
```

## Pull Request Process

### Before Submitting

1. **Run all checks locally**:
   ```bash
   npm run lint
   npm run test
   npm run security:scan
   npx dxt-lint ./extensions/your-extension
   dxt validate
   dxt pack
   ```

2. **Update documentation**:
   - Update README.md
   - Add/update usage examples
   - Document any breaking changes
   - Update CHANGELOG.md

3. **Test on all platforms**:
   - Windows
   - macOS
   - Linux

### PR Requirements

- **Title**: Use conventional commits format
  - `feat(extension-name): add new feature`
  - `fix(extension-name): fix specific issue`
  - `docs(extension-name): update documentation`
  - `test(extension-name): add tests`

- **Description**: Include:
  - What changes were made
  - Why changes were necessary
  - How to test changes
  - Screenshots (if UI changes)
  - Related issues

- **Checklist**: Complete PR template

### Review Process

1. Automated checks must pass
2. Code review by maintainer
3. Security review (if applicable)
4. Testing on multiple platforms
5. Documentation review

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):
- MAJOR (x.0.0): Breaking changes
- MINOR (0.x.0): New features, backward compatible
- PATCH (0.0.x): Bug fixes

### Release Steps

1. **Update version**:
   ```bash
   npm version patch|minor|major
   ```

2. **Update CHANGELOG.md**:
   ```markdown
   ## [1.0.0] - 2024-01-15
   ### Added
   - New feature description
   ### Fixed
   - Bug fix description
   ### Changed
   - Breaking change description
   ```

3. **Create release**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

4. **GitHub Release**:
   - Attach .dxt file
   - Include changelog
   - Mark pre-release if beta

## Quality Standards

### Extension must have:

- ✅ Valid manifest.json
- ✅ Health check implementation
- ✅ Capabilities listing
- ✅ Path sandboxing (if file access)
- ✅ Input validation
- ✅ Error handling
- ✅ Audit logging
- ✅ Rate limiting
- ✅ README with 3+ examples
- ✅ 80%+ test coverage
- ✅ Security considerations documented
- ✅ No hardcoded secrets
- ✅ Resource limits configured

### Performance targets:

- Health check: < 100ms
- Simple operations: < 500ms
- File operations: < 2s
- Memory usage: < 512MB
- CPU usage: < 25%

## Getting Help

- 📖 [Documentation](https://github.com/mcp-builds/mcp-builds-mono/wiki)
- 💬 [Discussions](https://github.com/mcp-builds/mcp-builds-mono/discussions)
- 🐛 [Issues](https://github.com/mcp-builds/mcp-builds-mono/issues)
- 📧 Email: team@mcp-builds.dev

## Recognition

We value all contributions! Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Given credit in documentation

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to MCP Builds! Your efforts help create a secure, reliable ecosystem of Claude Desktop extensions.
