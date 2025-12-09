# Test Execution Policy

**CRITICAL RULE**: Do NOT execute tests unless explicitly requested.

## When to Run Tests

### ✅ Run tests ONLY when:
- The task explicitly states "run tests" or "verify with tests"
- The user explicitly asks you to run tests
- You're debugging a specific test failure
- The task is about fixing failing tests

### ❌ Do NOT run tests:
- Automatically after completing tasks
- Automatically after implementing features
- Automatically after fixing bugs
- Automatically before committing
- "Just to be safe"

## Rationale

- Test execution takes time and resources
- The user controls when tests should run
- Automatic test runs slow down the development workflow
- Tests should be intentional, not automatic

## Test Command

```bash
npm test
```

Use this command only when explicitly requested.
