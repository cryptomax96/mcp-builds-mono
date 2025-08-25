# Threat Model - MCP Desktop Extensions

## 🎯 System Overview

### Architecture
```
┌─────────────────┐         stdio          ┌──────────────────┐
│                 │ ◄─────────────────────► │                  │
│  Claude Desktop │      JSON-RPC 2.0       │  MCP Extension   │
│   (Host/Client) │                         │ (Server/Process) │
│                 │                         │                  │
└─────────────────┘                         └──────────────────┘
        ▲                                            ▲
        │                                            │
        ▼                                            ▼
┌─────────────────┐                         ┌──────────────────┐
│   User Config   │                         │  Local Resources │
│   (Settings)    │                         │  (Files, APIs)   │
└─────────────────┘                         └──────────────────┘
```

### Trust Boundaries
1. **Host ↔ Extension**: stdio pipe (trusted after spawn)
2. **Extension ↔ File System**: OS permissions
3. **Extension ↔ Network**: Optional, disabled by default
4. **Extension ↔ User Config**: Read-only access

## 🚨 Threat Categories

### 1. Input Validation Attacks

#### 1.1 Path Traversal
**Threat**: Attacker escapes sandbox using `../` or symlinks  
**Impact**: Read/write arbitrary files, exfiltrate secrets  
**Likelihood**: High  
**Risk**: Critical  

**Mitigations**:
```typescript
// Validate and resolve all paths
function sandboxPath(userPath: string, allowedDirs: string[]): string {
  const resolved = path.resolve(userPath);
  const realPath = fs.realpathSync(resolved);
  
  const isAllowed = allowedDirs.some(dir => 
    realPath.startsWith(path.resolve(dir))
  );
  
  if (!isAllowed) {
    throw new Error('Access denied: Outside sandbox');
  }
  return realPath;
}
```

#### 1.2 Command Injection
**Threat**: User input executed as system commands  
**Impact**: Full system compromise  
**Likelihood**: Medium (if exec used)  
**Risk**: Critical  

**Mitigations**:
- Never use `exec()`, `eval()`, or `new Function()`
- Use array arguments: `spawn('ffprobe', ['-i', file])`
- Validate all inputs against strict schemas

#### 1.3 JSON Injection
**Threat**: Malformed JSON crashes server or triggers bugs  
**Impact**: DoS, potential RCE via parser bugs  
**Likelihood**: Low  
**Risk**: Medium  

**Mitigations**:
```typescript
// Safe JSON parsing with size limits
function safeParseJSON(text: string, maxSize = 10_000_000): any {
  if (text.length > maxSize) {
    throw new Error('JSON too large');
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error('Invalid JSON');
  }
}
```

### 2. Resource Exhaustion

#### 2.1 Memory Exhaustion
**Threat**: Large file reads or infinite loops consume all RAM  
**Impact**: System freeze, OOM killer activation  
**Likelihood**: Medium  
**Risk**: High  

**Mitigations**:
```typescript
// Stream large files
async function readLargeFile(path: string): AsyncIterator<Buffer> {
  const stream = fs.createReadStream(path, {
    highWaterMark: 64 * 1024  // 64KB chunks
  });
  
  for await (const chunk of stream) {
    yield chunk;
  }
}

// Set process limits
if (process.platform !== 'win32') {
  process.setrlimit('AS', 512 * 1024 * 1024);  // 512MB
}
```

#### 2.2 CPU Exhaustion
**Threat**: Compute-intensive operations block event loop  
**Impact**: Unresponsive extension, poor UX  
**Likelihood**: Medium  
**Risk**: Medium  

**Mitigations**:
- Use worker threads for heavy computation
- Implement operation timeouts
- Yield periodically in long loops

#### 2.3 File Handle Exhaustion
**Threat**: Opening files without closing exhausts handles  
**Impact**: Cannot open new files, crashes  
**Likelihood**: Low  
**Risk**: Low  

**Mitigations**:
```typescript
// Always use try-finally or using statement
async function processFile(path: string) {
  let fd: number | null = null;
  try {
    fd = await fs.open(path, 'r');
    // Process file
  } finally {
    if (fd !== null) await fs.close(fd);
  }
}
```

### 3. Information Disclosure

#### 3.1 Secret Leakage
**Threat**: API keys, tokens exposed in logs or errors  
**Impact**: Account compromise, financial loss  
**Likelihood**: High (without care)  
**Risk**: Critical  

**Mitigations**:
```typescript
// Redact sensitive data
class SafeLogger {
  private sensitivePatterns = [
    /sk-[a-zA-Z0-9]{48}/g,  // API keys
    /[a-z0-9]{40}/g,         // GitHub tokens
    /password["\s]*[:=]["\s]*[^"\s]+/gi
  ];
  
  log(message: string): void {
    let safe = message;
    for (const pattern of this.sensitivePatterns) {
      safe = safe.replace(pattern, '[REDACTED]');
    }
    console.log(safe);
  }
}
```

#### 3.2 Path Disclosure
**Threat**: Full system paths exposed in errors  
**Impact**: Information gathering for attacks  
**Likelihood**: Medium  
**Risk**: Low  

**Mitigations**:
- Use relative paths in error messages
- Sanitize stack traces before logging
- Generic error messages to users

### 4. Privilege Escalation

#### 4.1 Host Escape
**Threat**: Extension breaks out of sandbox  
**Impact**: Access to Claude Desktop privileges  
**Likelihood**: Very Low  
**Risk**: Critical  

**Mitigations**:
- Run extensions in separate process
- Minimal process privileges
- No shared memory with host
- Capability-based security model

#### 4.2 Config Manipulation
**Threat**: Extension modifies its own permissions  
**Impact**: Bypass security controls  
**Likelihood**: Low  
**Risk**: High  

**Mitigations**:
- Config files read-only to extension
- Validate config on each load
- Sign configs with HMAC

### 5. Supply Chain Attacks

#### 5.1 Malicious Dependencies
**Threat**: npm/PyPI package compromised  
**Impact**: Backdoor in all extensions using it  
**Likelihood**: Low  
**Risk**: Critical  

**Mitigations**:
```json
// package-lock.json with integrity hashes
{
  "dependencies": {
    "example": {
      "version": "1.0.0",
      "integrity": "sha512-abc123..."
    }
  }
}
```

- Pin all dependency versions
- Use lock files with checksums
- Regular security audits
- Vendor critical dependencies

#### 5.2 Build Pipeline Compromise
**Threat**: CI/CD system injected malicious code  
**Impact**: All builds compromised  
**Likelihood**: Very Low  
**Risk**: Critical  

**Mitigations**:
- Sign releases with GPG
- Reproducible builds
- Build from tagged commits only
- Multiple reviewers for releases

## 🛡️ Security Controls Matrix

| Control | Path Traversal | Injection | Resource | Info Leak | Supply Chain |
|---------|---------------|-----------|----------|-----------|--------------|
| Input Validation | ✅ | ✅ | ✅ | ⚪ | ⚪ |
| Sandboxing | ✅ | ✅ | ⚪ | ✅ | ⚪ |
| Rate Limiting | ⚪ | ⚪ | ✅ | ⚪ | ⚪ |
| Audit Logging | ✅ | ✅ | ✅ | ⚪ | ⚪ |
| Code Signing | ⚪ | ⚪ | ⚪ | ⚪ | ✅ |
| Dep Scanning | ⚪ | ⚪ | ⚪ | ⚪ | ✅ |
| Secrets Mgmt | ⚪ | ⚪ | ⚪ | ✅ | ⚪ |

## 🎯 Attack Scenarios

### Scenario 1: Malicious Prompt
```typescript
// User sends: "Read file ../../../../etc/passwd"
// Extension must:
1. Resolve path to absolute
2. Check against allowlist
3. Reject with clear error
4. Log attempt (without path details)
```

### Scenario 2: Resource Bomb
```typescript
// User requests: "Process this 10GB file"
// Extension must:
1. Check file size before reading
2. Stream if size > threshold
3. Implement read timeout
4. Track memory usage
```

### Scenario 3: Confused Deputy
```typescript
// User tricks extension into acting on their behalf
// Extension must:
1. Never reuse user credentials
2. Validate all transitive actions
3. Maintain clear audit trail
4. Principle of least privilege
```

## 📊 Risk Matrix

```
Impact
  ▲
  │ Critical │ Path      │ Command   │ Supply    │
  │          │ Traversal │ Injection │ Chain     │
  ├──────────┼───────────┼───────────┼───────────┤
  │ High     │ Memory    │ Config    │           │
  │          │ Exhaust   │ Manip     │           │
  ├──────────┼───────────┼───────────┼───────────┤
  │ Medium   │ CPU       │ JSON      │           │
  │          │ Exhaust   │ Injection │           │
  ├──────────┼───────────┼───────────┼───────────┤
  │ Low      │ File      │ Path      │           │
  │          │ Handles   │ Disclosure│           │
  └──────────┴───────────┴───────────┴───────────┘
            Low        Medium      High      Critical
                      Likelihood ───────►
```

## 🔒 Defense in Depth Layers

1. **Input Layer**: Validate everything
2. **Process Layer**: Sandbox and isolate
3. **Resource Layer**: Limit and monitor
4. **Output Layer**: Sanitize responses
5. **Audit Layer**: Log security events

## 📋 Security Testing Checklist

- [ ] Fuzzing with malformed inputs
- [ ] Path traversal attempts
- [ ] Resource exhaustion tests
- [ ] Injection attack vectors
- [ ] Error message inspection
- [ ] Dependency vulnerability scan
- [ ] Permission boundary tests
- [ ] Rate limit verification
- [ ] Timeout enforcement
- [ ] Audit log completeness

## 🚀 Incident Response Plan

1. **Detect**: Monitoring alerts or user report
2. **Triage**: Assess severity and scope
3. **Contain**: Disable affected extensions
4. **Investigate**: Root cause analysis
5. **Remediate**: Patch and test fix
6. **Recover**: Re-enable with fix
7. **Learn**: Update threat model

## 📚 References

- [STRIDE Threat Modeling](https://docs.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats)
- [OWASP Threat Modeling](https://owasp.org/www-community/Threat_Modeling)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE Top 25](https://cwe.mitre.org/top25/)

---

**Last Updated**: January 2025  
**Review Schedule**: Quarterly  
**Owner**: Security Team