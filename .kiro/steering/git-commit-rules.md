# Git Commit Rules

## Commit Workflow for Task Development

**CRITICAL RULE**: Always commit your work incrementally as you develop each task. This creates an accurate development history and makes it easier to track changes.

### Workflow:

1. **After implementing core functionality:**
   - Add all new/modified files: `git add .`
   - Commit with descriptive message: `git commit -m "Implement [feature/component name]"`
   - Example: `git commit -m "Implement tournament manager with match and round progression"`

2. **After writing tests:**
   - Add test files: `git add .`
   - Commit: `git commit -m "Add tests for [feature/component name]"`
   - Example: `git commit -m "Add property-based tests for tournament manager"`

3. **After tests pass:**
   - If you made fixes to get tests passing, commit again
   - Commit: `git commit -m "Fix [issue] to pass tests"`
   - Example: `git commit -m "Fix state mutation issue in tournament advancement"`

4. **After completing a full task:**
   - Commit: `git commit -m "Complete task [task number]: [task name]"`
   - Example: `git commit -m "Complete task 4: Implement tournament manager"`

### Benefits:

- Creates clear development history
- Makes it easy to revert specific changes
- Documents the development process
- Helps identify when bugs were introduced
- Makes code review easier

### Commit Message Guidelines:

- Use present tense ("Add feature" not "Added feature")
- Be specific about what changed
- Reference task numbers when applicable
- Keep messages concise but descriptive

### When to Commit:

- ✅ After implementing a new module/component
- ✅ After writing tests
- ✅ After fixing bugs to pass tests
- ✅ After completing a task
- ✅ Before starting a new task
- ❌ Don't wait until everything is done to commit
- ❌ Don't commit broken/non-compiling code (unless explicitly debugging)
