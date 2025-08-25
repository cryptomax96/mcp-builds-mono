# Changelog

All notable changes to the MCP Builds mono-repo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial repository structure and documentation
- Core extensions:
  - `fs-sandbox-node`: Sandboxed file system access (TypeScript)
  - `fs-sandbox-python`: Sandboxed file system access (Python)
  - `ffprobe-lite-python`: Media metadata extraction
  - `prompt-composer-node`: Prompt template management
- Security framework:
  - Comprehensive threat model
  - Security policy and incident response
  - Path traversal protection
  - Secrets management via OS keychain
- Development tooling:
  - `dxt-lint`: Extension validation tool
  - `host-sim`: MCP host simulator for testing
  - GitHub Actions CI/CD pipeline
  - Pre-commit hooks
- Documentation:
  - README with quick start guide
  - Contributing guidelines
  - Extension templates
  - Release checklist
- Examples:
  - Minimal TypeScript server implementation
  - Minimal Python server implementation
  - Basic and advanced manifest examples

### Security
- Implemented sandboxing for all file operations
- Added rate limiting and resource controls
- Configured audit logging without PII
- Set up dependency vulnerability scanning

## [0.1.0] - TBD

### Added
- Initial public release
- Production-ready MCP extensions for Claude Desktop
- Comprehensive testing and validation
- Full documentation and examples

### Changed
- N/A (initial release)

### Deprecated
- N/A (initial release)

### Removed
- N/A (initial release)

### Fixed
- N/A (initial release)

### Security
- All extensions follow security best practices
- No hardcoded secrets
- Path sandboxing enforced
- Rate limiting implemented

## Release Types

- **Major (x.0.0)**: Breaking changes that require migration
- **Minor (0.x.0)**: New features, backward compatible
- **Patch (0.0.x)**: Bug fixes and minor improvements

## Version History

| Version | Date | Type | Description |
|---------|------|------|-------------|
| 0.1.0 | TBD | Initial | First public release |

---

For more details on changes, see the [commit history](https://github.com/yourusername/mcp-builds-mono/commits/main).
