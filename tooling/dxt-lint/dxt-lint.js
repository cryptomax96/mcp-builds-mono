#!/usr/bin/env node

/**
 * dxt-lint - MCP Extension Validator
 * Validates extensions against MCP Builds quality and security standards
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Validation rules
const RULES = {
  // Manifest rules
  MANIFEST_VALID_JSON: { severity: 'error', category: 'manifest' },
  MANIFEST_REQUIRED_FIELDS: { severity: 'error', category: 'manifest' },
  MANIFEST_VERSION_SEMVER: { severity: 'error', category: 'manifest' },
  MANIFEST_NAME_FORMAT: { severity: 'error', category: 'manifest' },
  MANIFEST_TOOLS_DESCRIBED: { severity: 'warning', category: 'manifest' },
  MANIFEST_ICON_EXISTS: { severity: 'warning', category: 'manifest' },
  MANIFEST_CATEGORIES_VALID: { severity: 'warning', category: 'manifest' },
  
  // Security rules
  SECURITY_NO_HARDCODED_SECRETS: { severity: 'error', category: 'security' },
  SECURITY_PATH_VALIDATION: { severity: 'error', category: 'security' },
  SECURITY_INPUT_VALIDATION: { severity: 'error', category: 'security' },
  SECURITY_NO_EVAL: { severity: 'error', category: 'security' },
  SECURITY_RATE_LIMITING: { severity: 'warning', category: 'security' },
  SECURITY_AUDIT_LOGGING: { severity: 'warning', category: 'security' },
  
  // Code quality rules
  CODE_HEALTH_CHECK_EXISTS: { severity: 'error', category: 'code' },
  CODE_CAPABILITIES_EXISTS: { severity: 'error', category: 'code' },
  CODE_ERROR_HANDLING: { severity: 'warning', category: 'code' },
  CODE_TIMEOUT_HANDLING: { severity: 'warning', category: 'code' },
  CODE_RESOURCE_CLEANUP: { severity: 'warning', category: 'code' },
  
  // Documentation rules
  DOCS_README_EXISTS: { severity: 'error', category: 'docs' },
  DOCS_THREE_EXAMPLES: { severity: 'warning', category: 'docs' },
  DOCS_CONFIGURATION: { severity: 'warning', category: 'docs' },
  DOCS_SECURITY_SECTION: { severity: 'warning', category: 'docs' },
  DOCS_TROUBLESHOOTING: { severity: 'info', category: 'docs' },
  
  // Performance rules
  PERF_PACKAGE_SIZE: { severity: 'warning', category: 'performance' },
  PERF_DEPENDENCY_COUNT: { severity: 'info', category: 'performance' },
  PERF_MEMORY_LIMITS: { severity: 'warning', category: 'performance' },
};

class ExtensionLinter {
  constructor(extensionPath) {
    this.path = path.resolve(extensionPath);
    this.results = {
      errors: [],
      warnings: [],
      info: [],
      passed: [],
    };
    this.manifest = null;
  }

  log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
  }

  addResult(rule, passed, message) {
    const result = {
      rule: rule,
      message: message,
      severity: RULES[rule].severity,
      category: RULES[rule].category,
    };

    if (passed) {
      this.results.passed.push(result);
    } else {
      switch (RULES[rule].severity) {
        case 'error':
          this.results.errors.push(result);
          break;
        case 'warning':
          this.results.warnings.push(result);
          break;
        case 'info':
          this.results.info.push(result);
          break;
      }
    }
  }

  // Load and validate manifest.json
  async validateManifest() {
    const manifestPath = path.join(this.path, 'manifest.json');
    
    // Check if manifest exists
    if (!fs.existsSync(manifestPath)) {
      this.addResult('MANIFEST_VALID_JSON', false, 'manifest.json not found');
      return false;
    }

    // Validate JSON
    try {
      const content = fs.readFileSync(manifestPath, 'utf8');
      this.manifest = JSON.parse(content);
      this.addResult('MANIFEST_VALID_JSON', true, 'Valid JSON');
    } catch (error) {
      this.addResult('MANIFEST_VALID_JSON', false, `Invalid JSON: ${error.message}`);
      return false;
    }

    // Check required fields
    const requiredFields = ['name', 'display_name', 'version', 'description', 'server'];
    for (const field of requiredFields) {
      if (!this.manifest[field]) {
        this.addResult('MANIFEST_REQUIRED_FIELDS', false, `Missing required field: ${field}`);
      }
    }

    // Validate version (semver)
    const semverRegex = /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/;
    if (this.manifest.version && !semverRegex.test(this.manifest.version)) {
      this.addResult('MANIFEST_VERSION_SEMVER', false, `Invalid version format: ${this.manifest.version}`);
    } else {
      this.addResult('MANIFEST_VERSION_SEMVER', true, 'Valid semver');
    }

    // Validate name format (lowercase, hyphens)
    const nameRegex = /^[a-z0-9-]+$/;
    if (this.manifest.name && !nameRegex.test(this.manifest.name)) {
      this.addResult('MANIFEST_NAME_FORMAT', false, `Invalid name format: ${this.manifest.name}`);
    } else {
      this.addResult('MANIFEST_NAME_FORMAT', true, 'Valid name format');
    }

    // Check if tools have descriptions
    if (this.manifest.tools) {
      for (const tool of this.manifest.tools) {
        if (!tool.description) {
          this.addResult('MANIFEST_TOOLS_DESCRIBED', false, `Tool "${tool.name}" missing description`);
        }
      }
    }

    // Check if icon exists
    if (this.manifest.icon) {
      const iconPath = path.join(this.path, this.manifest.icon);
      if (!fs.existsSync(iconPath)) {
        this.addResult('MANIFEST_ICON_EXISTS', false, `Icon file not found: ${this.manifest.icon}`);
      } else {
        this.addResult('MANIFEST_ICON_EXISTS', true, 'Icon exists');
      }
    }

    // Validate categories
    const validCategories = [
      'developer-tools', 'productivity', 'data-analysis', 'communication',
      'file-management', 'creative-tools', 'research', 'system-admin'
    ];
    if (this.manifest.categories) {
      for (const category of this.manifest.categories) {
        if (!validCategories.includes(category)) {
          this.addResult('MANIFEST_CATEGORIES_VALID', false, `Invalid category: ${category}`);
        }
      }
    }

    return true;
  }

  // Check for security issues
  async validateSecurity() {
    const serverPath = path.join(this.path, 'server');
    if (!fs.existsSync(serverPath)) {
      return;
    }

    // Get all source files
    const sourceFiles = this.getSourceFiles(serverPath);
    
    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for hardcoded secrets
      const secretPatterns = [
        /(['"])sk-[a-zA-Z0-9]{48}\1/g,  // API keys
        /(['"])ghp_[a-zA-Z0-9]{36}\1/g,  // GitHub tokens
        /password\s*=\s*(['"])[^'"]+\1/gi,  // Hardcoded passwords
        /api[_-]?key\s*=\s*(['"])[^'"]+\1/gi,  // API keys
      ];
      
      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          this.addResult('SECURITY_NO_HARDCODED_SECRETS', false, `Potential hardcoded secret in ${path.basename(file)}`);
        }
      }
      
      // Check for eval usage
      if (/\beval\s*\(/.test(content) || /new\s+Function\s*\(/.test(content)) {
        this.addResult('SECURITY_NO_EVAL', false, `Dangerous eval/Function usage in ${path.basename(file)}`);
      }
      
      // Check for path validation
      if (/validatePath|sandboxPath|checkPath/i.test(content)) {
        this.addResult('SECURITY_PATH_VALIDATION', true, 'Path validation found');
      }
      
      // Check for input validation
      if (/zod|pydantic|joi|ajv|schema/i.test(content)) {
        this.addResult('SECURITY_INPUT_VALIDATION', true, 'Input validation library found');
      }
      
      // Check for rate limiting
      if (/rate[_-]?limit|throttle|limiter/i.test(content)) {
        this.addResult('SECURITY_RATE_LIMITING', true, 'Rate limiting implementation found');
      }
      
      // Check for audit logging
      if (/audit[_-]?log|auditLog/i.test(content)) {
        this.addResult('SECURITY_AUDIT_LOGGING', true, 'Audit logging found');
      }
    }
  }

  // Check code quality
  async validateCode() {
    const serverPath = path.join(this.path, 'server');
    if (!fs.existsSync(serverPath)) {
      return;
    }

    const sourceFiles = this.getSourceFiles(serverPath);
    let healthCheckFound = false;
    let capabilitiesFound = false;
    let errorHandlingFound = false;
    let timeoutHandlingFound = false;
    let resourceCleanupFound = false;

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for required tools
      if (/health[_-]?check/i.test(content)) {
        healthCheckFound = true;
      }
      if (/capabilities/i.test(content)) {
        capabilitiesFound = true;
      }
      
      // Check error handling
      if (/try\s*{|\.catch\(|except\s*:/i.test(content)) {
        errorHandlingFound = true;
      }
      
      // Check timeout handling
      if (/timeout|setTimeout|asyncio\.timeout/i.test(content)) {
        timeoutHandlingFound = true;
      }
      
      // Check resource cleanup
      if (/finally\s*{|\.finally\(|finally\s*:/i.test(content)) {
        resourceCleanupFound = true;
      }
    }

    this.addResult('CODE_HEALTH_CHECK_EXISTS', healthCheckFound, 
      healthCheckFound ? 'health_check tool found' : 'health_check tool not found');
    this.addResult('CODE_CAPABILITIES_EXISTS', capabilitiesFound,
      capabilitiesFound ? 'capabilities tool found' : 'capabilities tool not found');
    this.addResult('CODE_ERROR_HANDLING', errorHandlingFound,
      errorHandlingFound ? 'Error handling found' : 'No error handling found');
    this.addResult('CODE_TIMEOUT_HANDLING', timeoutHandlingFound,
      timeoutHandlingFound ? 'Timeout handling found' : 'No timeout handling found');
    this.addResult('CODE_RESOURCE_CLEANUP', resourceCleanupFound,
      resourceCleanupFound ? 'Resource cleanup found' : 'No resource cleanup found');
  }

  // Check documentation
  async validateDocumentation() {
    const readmePath = path.join(this.path, 'README.md');
    
    // Check if README exists
    if (!fs.existsSync(readmePath)) {
      this.addResult('DOCS_README_EXISTS', false, 'README.md not found');
      return;
    }
    
    this.addResult('DOCS_README_EXISTS', true, 'README.md exists');
    
    const content = fs.readFileSync(readmePath, 'utf8');
    
    // Check for examples (look for Example or Usage)
    const exampleCount = (content.match(/###?\s*(Example|Usage|Demo)/gi) || []).length;
    if (exampleCount >= 3) {
      this.addResult('DOCS_THREE_EXAMPLES', true, `${exampleCount} examples found`);
    } else {
      this.addResult('DOCS_THREE_EXAMPLES', false, `Only ${exampleCount} examples found (need 3)`);
    }
    
    // Check for configuration section
    if (/###?\s*(Configuration|Config|Settings)/i.test(content)) {
      this.addResult('DOCS_CONFIGURATION', true, 'Configuration section found');
    } else {
      this.addResult('DOCS_CONFIGURATION', false, 'No configuration section');
    }
    
    // Check for security section
    if (/###?\s*(Security|Privacy)/i.test(content)) {
      this.addResult('DOCS_SECURITY_SECTION', true, 'Security section found');
    } else {
      this.addResult('DOCS_SECURITY_SECTION', false, 'No security section');
    }
    
    // Check for troubleshooting
    if (/###?\s*(Troubleshooting|FAQ|Issues)/i.test(content)) {
      this.addResult('DOCS_TROUBLESHOOTING', true, 'Troubleshooting section found');
    } else {
      this.addResult('DOCS_TROUBLESHOOTING', false, 'No troubleshooting section');
    }
  }

  // Check performance considerations
  async validatePerformance() {
    // Check package size
    try {
      const stats = this.getDirectorySize(this.path);
      const sizeMB = stats.size / (1024 * 1024);
      
      if (sizeMB > 50) {
        this.addResult('PERF_PACKAGE_SIZE', false, `Package too large: ${sizeMB.toFixed(2)}MB (max 50MB)`);
      } else {
        this.addResult('PERF_PACKAGE_SIZE', true, `Package size OK: ${sizeMB.toFixed(2)}MB`);
      }
    } catch (error) {
      this.addResult('PERF_PACKAGE_SIZE', false, 'Could not determine package size');
    }
    
    // Check dependency count
    const packageJsonPath = path.join(this.path, 'package.json');
    const requirementsPath = path.join(this.path, 'requirements.txt');
    
    let depCount = 0;
    
    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      depCount = Object.keys(pkg.dependencies || {}).length;
    } else if (fs.existsSync(requirementsPath)) {
      const content = fs.readFileSync(requirementsPath, 'utf8');
      depCount = content.split('\n').filter(line => line.trim() && !line.startsWith('#')).length;
    }
    
    if (depCount > 20) {
      this.addResult('PERF_DEPENDENCY_COUNT', false, `High dependency count: ${depCount} (consider reducing)`);
    } else {
      this.addResult('PERF_DEPENDENCY_COUNT', true, `Dependency count OK: ${depCount}`);
    }
    
    // Check resource limits in manifest
    if (this.manifest && this.manifest.resource_limits) {
      const limits = this.manifest.resource_limits;
      if (limits.max_memory_mb && limits.max_memory_mb <= 512) {
        this.addResult('PERF_MEMORY_LIMITS', true, `Memory limit set: ${limits.max_memory_mb}MB`);
      } else {
        this.addResult('PERF_MEMORY_LIMITS', false, 'Memory limit too high or not set');
      }
    } else {
      this.addResult('PERF_MEMORY_LIMITS', false, 'No resource limits defined');
    }
  }

  // Helper: Get all source files
  getSourceFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        files.push(...this.getSourceFiles(fullPath));
      } else if (stat.isFile() && /\.(js|ts|py)$/.test(item)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  // Helper: Get directory size
  getDirectorySize(dir) {
    let size = 0;
    let fileCount = 0;
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && item !== '__pycache__') {
        const subdir = this.getDirectorySize(fullPath);
        size += subdir.size;
        fileCount += subdir.fileCount;
      } else if (stat.isFile()) {
        size += stat.size;
        fileCount++;
      }
    }
    
    return { size, fileCount };
  }

  // Run all validations
  async validate() {
    this.log('\n🔍 MCP Extension Linter\n', colors.cyan);
    this.log(`Validating: ${this.path}\n`);
    
    // Run all validations
    await this.validateManifest();
    await this.validateSecurity();
    await this.validateCode();
    await this.validateDocumentation();
    await this.validatePerformance();
    
    // Print results
    this.printResults();
    
    // Return exit code
    return this.results.errors.length === 0 ? 0 : 1;
  }

  // Print validation results
  printResults() {
    this.log('\n' + '='.repeat(60));
    this.log('VALIDATION RESULTS', colors.cyan);
    this.log('='.repeat(60) + '\n');
    
    // Group results by category
    const categories = {};
    for (const result of [...this.results.errors, ...this.results.warnings, ...this.results.info]) {
      if (!categories[result.category]) {
        categories[result.category] = [];
      }
      categories[result.category].push(result);
    }
    
    // Print by category
    for (const [category, results] of Object.entries(categories)) {
      if (results.length > 0) {
        this.log(`\n📁 ${category.toUpperCase()}`, colors.blue);
        this.log('-'.repeat(40));
        
        for (const result of results) {
          const icon = result.severity === 'error' ? '❌' : 
                       result.severity === 'warning' ? '⚠️' : 'ℹ️';
          const color = result.severity === 'error' ? colors.red : 
                        result.severity === 'warning' ? colors.yellow : colors.cyan;
          
          this.log(`${icon} [${result.severity.toUpperCase()}] ${result.message}`, color);
        }
      }
    }
    
    // Print summary
    this.log('\n' + '='.repeat(60));
    this.log('SUMMARY', colors.cyan);
    this.log('='.repeat(60) + '\n');
    
    const errorCount = this.results.errors.length;
    const warningCount = this.results.warnings.length;
    const infoCount = this.results.info.length;
    const passedCount = this.results.passed.length;
    const totalChecks = errorCount + warningCount + infoCount + passedCount;
    
    this.log(`Total Checks: ${totalChecks}`);
    this.log(`✅ Passed: ${passedCount}`, colors.green);
    this.log(`❌ Errors: ${errorCount}`, errorCount > 0 ? colors.red : colors.green);
    this.log(`⚠️  Warnings: ${warningCount}`, warningCount > 0 ? colors.yellow : colors.green);
    this.log(`ℹ️  Info: ${infoCount}`, colors.cyan);
    
    this.log('');
    
    if (errorCount === 0) {
      this.log('✨ Extension passed validation!', colors.green);
    } else {
      this.log('❌ Extension failed validation. Fix errors before release.', colors.red);
    }
    
    // Provide score
    const score = Math.round((passedCount / totalChecks) * 100);
    const scoreColor = score >= 90 ? colors.green : score >= 70 ? colors.yellow : colors.red;
    this.log(`\n📊 Quality Score: ${score}%`, scoreColor);
    
    if (score >= 90) {
      this.log('🏆 Excellent quality!', colors.green);
    } else if (score >= 70) {
      this.log('👍 Good quality, but room for improvement.', colors.yellow);
    } else {
      this.log('⚠️  Needs significant improvement.', colors.red);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
${colors.cyan}MCP Extension Linter${colors.reset}

Usage: dxt-lint [extension-path]

Validates MCP extensions against quality and security standards.

Options:
  -h, --help     Show this help message
  --json         Output results as JSON
  --strict       Treat warnings as errors

Examples:
  dxt-lint ./extensions/my-extension
  dxt-lint . 
  dxt-lint --strict ./extensions/my-extension

Exit codes:
  0 - All checks passed
  1 - Validation errors found
    `);
    process.exit(0);
  }
  
  const extensionPath = args[0];
  const linter = new ExtensionLinter(extensionPath);
  
  try {
    const exitCode = await linter.validate();
    process.exit(exitCode);
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = ExtensionLinter;
