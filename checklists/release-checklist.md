# 📋 Release Checklist

Use this checklist before releasing any MCP extension. All items must be checked for production releases.

## 🔍 Pre-Release Verification

### 📦 Package Structure
- [ ] `manifest.json` is valid JSON
- [ ] `manifest.json` validates with `dxt validate`
- [ ] All files referenced in manifest exist
- [ ] Icon file exists and is < 1MB
- [ ] No sensitive files in package (`.env`, `.git`, `node_modules`, etc.)
- [ ] Package size is reasonable (< 50MB unpacked)

### 🔒 Security Audit
- [ ] No hardcoded secrets (API keys, tokens, passwords)
- [ ] All user inputs validated with schemas
- [ ] Path traversal protection implemented
- [ ] Rate limiting configured
- [ ] Timeout enforcement working
- [ ] No `eval()`, `exec()`, or dynamic code execution
- [ ] Dependencies scanned for vulnerabilities
- [ ] Audit logging implemented (no PII)
- [ ] Error messages don't leak sensitive information
- [ ] Resource limits configured (memory, CPU, file size)

### ⚡ Performance
- [ ] Health check responds in < 100ms
- [ ] Simple operations complete in < 500ms
- [ ] Complex operations show progress
- [ ] Cancellation works within 1 second
- [ ] Memory usage stays under limit
- [ ] No memory leaks detected
- [ ] File handles properly closed
- [ ] Graceful degradation under load

### 🧪 Testing
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Code coverage > 80%
- [ ] Manual smoke test completed
- [ ] Tested on Windows
- [ ] Tested on macOS
- [ ] Tested on Linux
- [ ] Tested with minimum Claude Desktop version
- [ ] Tested with maximum file size limits
- [ ] Tested with malformed inputs
- [ ] Tested cancellation scenarios
- [ ] Tested error recovery

### 📝 Documentation
- [ ] README.md complete and accurate
- [ ] 3+ usage examples provided
- [ ] Configuration options documented
- [ ] Security considerations explained
- [ ] Troubleshooting section included
- [ ] API keys/setup instructions clear
- [ ] Screenshots/demos included
- [ ] CHANGELOG.md updated
- [ ] Version number bumped appropriately
- [ ] Migration guide (if breaking changes)

### 🎨 Code Quality
- [ ] Code follows style guide
- [ ] No linting errors
- [ ] No TypeScript/Python type errors
- [ ] Comments for complex logic
- [ ] Error handling comprehensive
- [ ] Logging at appropriate levels
- [ ] No console.log in production
- [ ] Dependencies up to date
- [ ] Unused dependencies removed
- [ ] Build artifacts excluded

### 🔧 Manifest Validation
- [ ] `name` follows naming convention (lowercase, hyphens)
- [ ] `display_name` is user-friendly
- [ ] `version` follows semver
- [ ] `description` is clear and concise
- [ ] `author` information complete
- [ ] `license` specified
- [ ] `compatibility` versions correct
- [ ] `categories` appropriate (max 3)
- [ ] All `tools` have descriptions
- [ ] All `prompts` have descriptions
- [ ] `user_config` has defaults where appropriate
- [ ] `resource_limits` are reasonable
- [ ] Platform overrides tested

### 🚀 Build & Package
- [ ] Clean build from fresh clone
- [ ] No build warnings
- [ ] Production build (minified, optimized)
- [ ] Source maps excluded from package
- [ ] Dev dependencies excluded
- [ ] `.dxt` file builds successfully
- [ ] `.dxt` file size is reasonable
- [ ] Package can be installed in Claude Desktop
- [ ] Extension loads without errors
- [ ] All tools appear in Claude

### 🔄 CI/CD
- [ ] All CI checks passing
- [ ] Security scan passing
- [ ] Dependency audit passing
- [ ] Build artifacts uploaded
- [ ] Release notes drafted
- [ ] Git tag created
- [ ] Previous version archived

### 🌐 Integration Testing
- [ ] Extension works with other extensions
- [ ] No port conflicts
- [ ] No global namespace pollution
- [ ] Cleanup on uninstall works
- [ ] Settings persist across restarts
- [ ] Handles Claude Desktop restart gracefully
- [ ] Works with different user locales
- [ ] Handles network interruptions
- [ ] Works offline (if applicable)

## 📊 Performance Benchmarks

Record these metrics for the release:

| Metric | Target | Actual | Pass |
|--------|--------|--------|------|
| Startup time | < 1s | _____ms | ⬜ |
| Memory usage (idle) | < 50MB | _____MB | ⬜ |
| Memory usage (active) | < 200MB | _____MB | ⬜ |
| Health check response | < 100ms | _____ms | ⬜ |
| Simple operation | < 500ms | _____ms | ⬜ |
| File read (1MB) | < 200ms | _____ms | ⬜ |
| File read (10MB) | < 1s | _____ms | ⬜ |
| CPU usage (idle) | < 1% | _____% | ⬜ |
| CPU usage (active) | < 25% | _____% | ⬜ |

## 🎯 Release Readiness

### Required for ALL Releases
- [ ] All security checks passed
- [ ] All tests passing
- [ ] Documentation complete
- [ ] No critical bugs
- [ ] Performance acceptable

### Required for MAJOR Releases (x.0.0)
- [ ] Migration guide written
- [ ] Breaking changes documented
- [ ] Beta testing completed (min 1 week)
- [ ] Backwards compatibility verified
- [ ] Rollback plan documented

### Required for PUBLIC Releases
- [ ] Legal review completed
- [ ] Privacy policy updated
- [ ] Terms of service reviewed
- [ ] Open source licenses compatible
- [ ] Export compliance checked

## 🚢 Release Process

1. **Create Release Branch**
   ```bash
   git checkout -b release/v1.0.0
   ```

2. **Update Version Numbers**
   - [ ] manifest.json
   - [ ] package.json / pyproject.toml
   - [ ] README.md badges
   - [ ] CHANGELOG.md

3. **Run Final Checks**
   ```bash
   npm run test
   npm run lint
   npm run security:scan
   dxt validate
   dxt pack
   ```

4. **Test Installation**
   - [ ] Install in clean Claude Desktop
   - [ ] Verify all features work
   - [ ] Check for console errors

5. **Create Release**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

6. **Publish Release**
   - [ ] Upload .dxt file to GitHub Release
   - [ ] Write release notes
   - [ ] Announce in community channels

7. **Post-Release**
   - [ ] Monitor for issues (24 hours)
   - [ ] Respond to user feedback
   - [ ] Plan next iteration

## 📝 Sign-off

### Release Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | __________ | __________ | __________ |
| QA Tester | __________ | __________ | __________ |
| Security Review | __________ | __________ | __________ |
| Product Owner | __________ | __________ | __________ |

### Release Information

- **Version**: _________________
- **Release Date**: _________________
- **Release Type**: ⬜ Major ⬜ Minor ⬜ Patch ⬜ Hotfix
- **Risk Level**: ⬜ Low ⬜ Medium ⬜ High
- **Rollback Plan**: _________________

## 🆘 Rollback Procedure

If critical issues are discovered post-release:

1. **Immediate Actions** (< 5 minutes)
   - [ ] Mark release as pre-release on GitHub
   - [ ] Post warning in community channels
   - [ ] Create incident ticket

2. **Mitigation** (< 30 minutes)
   - [ ] Identify affected users
   - [ ] Provide workaround if possible
   - [ ] Prepare hotfix or rollback

3. **Resolution** (< 2 hours)
   - [ ] Deploy fix or previous version
   - [ ] Test thoroughly
   - [ ] Update all users
   - [ ] Post-mortem scheduled

## 📚 References

- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [MCP Documentation](https://modelcontextprotocol.io/docs)
- [DXT Specification](https://modelcontextprotocol.io/docs/dxt)

---

**Remember**: Quality > Speed. It's better to delay a release than ship broken code.
