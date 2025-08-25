# Security Policy

## 🔒 Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Extensions only access what they explicitly need
3. **Zero Trust**: Validate all inputs, trust nothing by default
4. **Secure by Default**: Safe configurations out of the box

## 🚨 Reporting Vulnerabilities

### DO NOT create public issues for security vulnerabilities

Instead:
1. Email: security@mcp-builds.dev (PGP: [key-id])
2. Use GitHub Security Advisories (private)
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

**Response Time**:
- Critical: 24 hours
- High: 3 days  
- Medium: 7 days
- Low: 14 days

## 🛡️ Security Requirements

### Secrets Management
```typescript
// ❌ NEVER
const API_KEY = "sk-abc123";  // Hardcoded secret
process.env.MY_SECRET;        // Direct env access

// ✅ ALWAYS
const apiKey = config.get('github_token');  // From user_config
// Secrets stored in OS keychain, never in files
```

### Path Sandboxing
```typescript
// Validate all file paths
function validatePath(requestedPath: string): void {
  const resolved = path.resolve(requestedPath);
  const allowed = config.get('allowed_directories');
  
  if (!allowed.some(dir => resolved.startsWith(path.resolve(dir)))) {
    throw new SecurityError('PATH_OUTSIDE_SANDBOX');
  }
  
  // Reject symlinks that escape sandbox
  const realPath = fs.realpathSync(resolved);
  if (!allowed.some(dir => realPath.startsWith(path.resolve(dir)))) {
    throw new SecurityError('SYMLINK_ESCAPE');
  }
}
```

### Input Validation
```typescript
// Use Zod/Pydantic for ALL inputs
const InputSchema = z.object({
  path: z.string().max(4096),
  content: z.string().max(10 * 1024 * 1024), // 10MB max
  options: z.object({
    encoding: z.enum(['utf8', 'base64']),
    timeout: z.number().min(100).max(30000)
  })
});

// Validate before processing
const validated = InputSchema.parse(userInput);
```

### Rate Limiting
```typescript
const limiter = new RateLimiter({
  windowMs: 60000,  // 1 minute
  max: config.get('rate_limit', 60),  // Default 60 req/min
  message: 'Rate limit exceeded. Try again later.'
});

// Apply to all tool calls
server.use(limiter.middleware());
```

### Audit Logging
```typescript
// Log all operations (no sensitive data!)
audit.log({
  timestamp: new Date().toISOString(),
  tool: 'read_file',
  duration_ms: 45,
  input_size: 1024,
  outcome: 'success',
  user_hash: sha256(userId),  // Hash PII
  // NEVER log: passwords, tokens, file contents, PII
});
```

## 🔍 Security Checklist

Before each release, verify:

### Code Security
- [ ] No hardcoded secrets (use `gitleaks` scan)
- [ ] All inputs validated with schemas
- [ ] Path traversal protection implemented
- [ ] No eval() or dynamic code execution
- [ ] Dependencies scanned for vulnerabilities
- [ ] Error messages don't leak sensitive info

### Runtime Security  
- [ ] Rate limiting configured
- [ ] Timeouts on all operations
- [ ] Memory limits enforced
- [ ] Graceful handling of malicious input
- [ ] Audit logs contain no PII
- [ ] Process runs with minimal privileges

### Data Security
- [ ] Secrets in OS keychain only
- [ ] No sensitive data in logs
- [ ] Temporary files cleaned up
- [ ] File permissions restricted (600/700)
- [ ] Network requests use HTTPS only
- [ ] Data encrypted at rest if stored

## 🚫 Security Anti-Patterns

### Never Do This:
```typescript
// ❌ Executing user input
eval(userCode);
exec(userCommand);
new Function(userString);

// ❌ Unrestricted file access
fs.readFile(userPath);  // No validation

// ❌ Logging sensitive data
console.log(`Token: ${apiToken}`);
logger.info({ password: user.password });

// ❌ Ignoring security errors
try {
  riskyOperation();
} catch {
  // Silently continue - NO!
}

// ❌ Trusting user input
const sql = `SELECT * FROM users WHERE id = ${userId}`;
```

## 🔐 Secure Defaults

All extensions ship with:
```json
{
  "resource_limits": {
    "max_memory_mb": 512,
    "max_cpu_percent": 25,
    "max_file_size_mb": 100,
    "max_concurrent_ops": 5
  },
  "security": {
    "sandbox_enabled": true,
    "network_enabled": false,
    "telemetry_opt_in": false,
    "audit_logging": true
  }
}
```

## 📊 Security Metrics

Track and monitor:
- Failed authentication attempts
- Rate limit violations  
- Sandbox escape attempts
- Abnormal resource usage
- Error rates by type
- Mean time to patch vulnerabilities

## 🆘 Incident Response

If you discover active exploitation:

1. **Contain**: Disable affected extension immediately
2. **Assess**: Determine scope and impact
3. **Notify**: Email security team within 2 hours
4. **Patch**: Deploy fix with forced update
5. **Review**: Post-mortem within 72 hours

## 📚 Security Resources

- [OWASP Top 10](https://owasp.org/Top10/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Python Security](https://python.readthedocs.io/en/latest/library/security.html)
- [MCP Security Guide](https://modelcontextprotocol.io/docs/security)

---

**Remember**: Security is everyone's responsibility. When in doubt, ask for review.