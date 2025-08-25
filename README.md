# 🚀 MCP Builds: Claude Desktop Extensions (DXT)

<div align="center">

[![CI](https://github.com/cryptomax96/mcp-builds-mono/actions/workflows/ci.yml/badge.svg)](https://github.com/cryptomax96/mcp-builds-mono/actions/workflows/ci.yml)
[![Security](https://img.shields.io/badge/Security-A%2B-brightgreen)](security/SECURITY.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![DXT Spec](https://img.shields.io/badge/DXT-0.1-blue)](https://modelcontextprotocol.io/docs)

**Building safe, composable MCP servers that extend Claude Desktop's capabilities through local tools.**

[Quick Start](#-quick-start) • [Extensions](#-available-extensions) • [Documentation](#-documentation) • [Contributing](#-contributing) • [Security](#-security)

</div>

---

## 🎯 Purpose

This mono-repo provides production-ready scaffolds for Claude Desktop Extensions (DXT) backed by Model Context Protocol (MCP) servers. Each extension is a sandboxed tool that safely extends Claude's capabilities through local system access.

## ✨ Features

- 🔒 **Security First**: Sandboxed file access, secrets management, audit logging
- 🚀 **Production Ready**: CI/CD, testing, monitoring, error handling
- 📦 **Easy Packaging**: One command to build distributable `.dxt` files
- 🧩 **Composable**: Extensions work together seamlessly
- 🌍 **Cross-Platform**: Windows, macOS, Linux support
- 📝 **Well Documented**: Comprehensive docs and examples

## 📁 Repository Structure

```
mcp-builds-mono/
├── extensions/           # Production-ready extensions
│   ├── fs-sandbox-node/     # File system access (TypeScript)
│   ├── fs-sandbox-python/   # File system access (Python)
│   ├── ffprobe-lite-python/ # Media metadata extraction
│   └── prompt-composer-node/# Prompt management
├── examples/            # Minimal implementation examples
├── templates/           # Extension templates
├── checklists/          # Quality and security checklists
├── security/            # Security policies and threat model
├── tooling/             # Development tools
│   ├── dxt-lint/           # Extension validator
│   └── host-sim/           # MCP host simulator
└── .github/workflows/   # CI/CD pipelines
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or Python 3.11+
- [Claude Desktop](https://claude.ai/download)
- DXT CLI: `npm install -g @anthropic-ai/dxt`

### Install an Extension

#### Option 1: From Release
1. Download `.dxt` file from [Releases](https://github.com/cryptomax96/mcp-builds-mono/releases)
2. Drag into Claude Desktop → Settings → Extensions
3. Configure required settings (API keys, directories)

#### Option 2: Build from Source

**TypeScript Extension:**
```bash
cd extensions/fs-sandbox-node
npm install
npm run build
npm test
dxt pack
# Drag fs-sandbox-node.dxt into Claude Desktop
```

**Python Extension:**
```bash
cd extensions/fs-sandbox-python
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m pytest
dxt pack
# Drag fs-sandbox-python.dxt into Claude Desktop
```

## 📦 Available Extensions

| Extension | Language | Description | Status |
|-----------|----------|-------------|--------|
| [fs-sandbox-node](extensions/fs-sandbox-node) | TypeScript | Sandboxed file system access | ✅ Stable |
| [fs-sandbox-python](extensions/fs-sandbox-python) | Python | Sandboxed file system access | ✅ Stable |
| [ffprobe-lite-python](extensions/ffprobe-lite-python) | Python | Media file metadata extraction | ✅ Stable |
| [prompt-composer-node](extensions/prompt-composer-node) | TypeScript | Prompt template management | 🚧 Beta |

## 🛠️ Development

### Create New Extension

```bash
# Using our template
npx dxt init my-extension --template=./templates/typescript-basic
cd my-extension

# Development workflow
npm run dev          # Start with hot reload
npm run dev:host     # Test with mock host
npm test            # Run tests
npm run lint        # Check code quality
dxt validate        # Validate manifest
dxt pack           # Build .dxt file
```

### Extension Structure

Every extension must have:
```
my-extension/
├── manifest.json       # DXT manifest (required)
├── server/            # MCP server implementation
│   ├── index.ts       # Entry point
│   └── lib/           # Internal modules
├── tests/             # Test suite
├── README.md          # User documentation
└── package.json       # Dependencies
```

### Required Tools

Every extension MUST implement these tools:

```typescript
// 1. Health Check
async function health_check(): Promise<HealthStatus> {
  return {
    status: "ok",
    version: "1.0.0",
    uptime_seconds: process.uptime(),
    memory_mb: process.memoryUsage().heapUsed / 1024 / 1024
  };
}

// 2. Capabilities
async function capabilities(): Promise<Capabilities> {
  return {
    tools: [...availableTools],
    prompts: [...availablePrompts],
    limits: {
      max_file_size: 100 * 1024 * 1024,
      rate_limit_per_minute: 60
    }
  };
}

// 3. Sandboxed File Access (if accessing files)
async function read_file_sandboxed(path: string): Promise<string> {
  validatePath(path, allowedDirectories);
  return await fs.readFile(path, 'utf-8');
}
```

## 🔒 Security

### Core Principles

1. **Zero Hardcoded Secrets**: Use `user_config` → OS keychain
2. **Path Sandboxing**: Strict allowlist enforcement
3. **Input Validation**: Zod/Pydantic schemas for all inputs
4. **Resource Limits**: Memory, CPU, file size caps
5. **Audit Logging**: Track all operations (no PII)

### Security Features

- 🛡️ Path traversal protection
- 🔐 Secrets management via OS keychain
- ⏱️ Timeout enforcement (30s default)
- 📊 Rate limiting (configurable)
- 📝 Structured audit logging
- 🚫 No eval() or dynamic code execution

See [SECURITY.md](security/SECURITY.md) and [THREAT_MODEL.md](security/THREAT_MODEL.md) for details.

## 📊 Quality Standards

### Before Release Checklist

- [ ] Manifest validates with `dxt pack`
- [ ] All tests pass (>80% coverage)
- [ ] Security scan passes
- [ ] Documentation complete
- [ ] 3+ usage examples
- [ ] Error messages helpful
- [ ] Resource limits configured
- [ ] Audit logging works
- [ ] Cross-platform tested

### Performance Requirements

| Operation | Target | Maximum |
|-----------|--------|---------|
| Simple ops (health_check) | <100ms | 500ms |
| File read (<10MB) | <500ms | 2s |
| Complex operations | Progress updates | 30s |
| Cancellation response | <1s | 2s |

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Process

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-extension`)
3. Follow coding standards (TypeScript/Python)
4. Write tests (>80% coverage)
5. Update documentation
6. Run quality checks:
   ```bash
   make lint
   make test
   make security-scan
   ```
7. Submit PR with description

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `test:` Tests
- `refactor:` Code refactoring
- `security:` Security improvements

## 📚 Documentation

- [Creating Your First Extension](docs/tutorials/first-extension.md)
- [Security Best Practices](security/SECURITY.md)
- [Threat Model](security/THREAT_MODEL.md)
- [API Reference](docs/api/README.md)
- [Testing Guide](docs/testing.md)
- [Deployment Guide](docs/deployment.md)

## 🎯 Roadmap

### Phase 1: Foundation (Current)
- ✅ Core extensions (filesystem, prompts)
- ✅ Security framework
- ✅ Testing infrastructure
- ✅ CI/CD pipeline

### Phase 2: Expansion
- 🚧 Database connectors
- 🚧 Cloud storage integration
- 🚧 API client extensions
- 🚧 Data transformation tools

### Phase 3: Ecosystem
- 📅 Extension marketplace
- 📅 Visual extension builder
- 📅 Community templates
- 📅 Enterprise features

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Anthropic](https://anthropic.com) for Claude and MCP
- [Model Context Protocol](https://modelcontextprotocol.io) community
- All contributors and extension developers

## 📮 Support

- 📖 [Documentation](https://github.com/cryptomax96/mcp-builds-mono/wiki)
- 💬 [Discussions](https://github.com/cryptomax96/mcp-builds-mono/discussions)
- 🐛 [Issue Tracker](https://github.com/cryptomax96/mcp-builds-mono/issues)
- 📧 Email: support@mcp-builds.dev

---

<div align="center">

**Built with ❤️ for the Claude Desktop community**

[⬆ Back to Top](#-mcp-builds-claude-desktop-extensions-dxt)

</div>
