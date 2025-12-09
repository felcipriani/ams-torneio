# Cleanup Rules

## Temporary Validation Files

**CRITICAL RULE**: All files created for validation, verification, or testing purposes MUST be deleted immediately after their purpose is served.

### Examples of files that should be deleted after use:
- Verification scripts (e.g., `verify-setup.js`, `check-*.js`)
- Temporary test files created just to verify functionality
- Debug scripts
- One-time validation utilities

### Process:
1. Create validation file
2. Run validation
3. **IMMEDIATELY DELETE** the validation file
4. Never leave temporary files in the project

### Exception:
- Files that are part of the actual project structure (like test suites, build scripts in package.json, etc.) should remain
- Only delete truly temporary validation files

This keeps the project clean and prevents clutter.

## Documentation Files

**CRITICAL RULE**: Do NOT create unnecessary markdown documentation files (like SETUP.md, SUMMARY.md, etc.).

### Guidelines:
- The chat history already documents what was done
- Only update the README.md if there's genuinely useful information to add
- Do NOT create redundant documentation files that just summarize work
- Do NOT create files like SETUP.md, IMPLEMENTATION.md, SUMMARY.md, etc.

### When to update README.md:
- Adding important setup instructions
- Documenting new features or usage
- Adding critical configuration notes

### When NOT to create files:
- Summarizing what you just did (chat history covers this)
- Creating "status" or "progress" documents
- Duplicating information that's already elsewhere
