# AGENT INSTRUCTIONS

## 1. Purpose and Scope

Maintain accurate project documentation inside `/docs`.

- Documentation (`.md`) is the default output.
- Never modify source code, configuration, dependencies, or database schemas unless explicitly requested.
- When code changes are authorized, stay within the requested scope.
- Preserve existing functionality.

## 2. Documentation Structure

Maintain this structure:

```text
/docs
├── 00-overview/
│   ├── project-summary.md
│   └── setup-guide.md
├── 01-features/
│   ├── feature-list.md
│   └── feature-details.md
├── 02-database/
│   ├── database-schema.md
│   └── tables-and-fields.md
├── 03-api/
│   ├── api-routes.md
│   └── request-response.md
├── 04-ui/
│   ├── screens.md
│   ├── navigation.md
│   └── design-system.md
├── 05-development/
│   ├── coding-rules.md
│   └── notes.md
└── 06-decisions/
    ├── decisions.md
    └── future-plans.md
```

Create additional `.md` files only when necessary and inside the appropriate folder.

## 3. Documentation Rules

- Use Markdown only. Keep documents concise and organized.
- Update existing documents instead of creating duplicates.
- Never delete files without permission.
- Document verified implementation, not assumptions.
- Distinguish `Planned`, `In Progress`, and `Done`.
- Never mark features as `Done` without verification.
- Never document passwords, API keys, tokens, or secrets.
- Keep technical terminology and descriptions consistent.

## 4. Before Working

1. Read `00-overview/project-summary.md`.
2. Read documentation relevant to the task.
3. Inspect source code and database schemas when necessary.
4. Verify documentation against the actual implementation.
5. Understand existing architecture before proposing changes.

Do not assume existing documentation is accurate.

## 5. After Working

1. Review all documentation folders for direct and indirect impacts.
2. Update only affected documents.
3. Verify accuracy against the implementation.
4. Avoid rewriting unrelated content.
5. Report created or updated documentation files.

Checking all folders does not mean modifying every file.

## 6. Required Documentation

| File | Content |
|---|---|
| `project-summary.md` | Purpose, stack, architecture, features, status |
| `setup-guide.md` | Installation, execution, dependencies, environment variables, database setup, common errors |
| `feature-list.md` | Features and implementation status |
| `feature-details.md` | Feature behavior and workflows |
| `database-schema.md` | Database structure and relationships |
| `tables-and-fields.md` | Tables, columns, and data types |
| `api-routes.md` | Endpoints, methods, and authorization |
| `request-response.md` | API parameters, payloads, and responses |
| `screens.md` | Screens and responsibilities |
| `navigation.md` | Routes and navigation |
| `design-system.md` | Components and design conventions |
| `coding-rules.md` | Coding standards and conventions |
| `decisions.md` | Decisions, reasons, dates, impacts, alternatives |
| `future-plans.md` | Planned improvements and functionality |
| `notes.md` | Unclassified or temporary technical information |

Create or update these documents as relevant to the project. Do not invent content to fill them.

## 7. Final Restrictions

- No unauthorized code or configuration changes.
- No unauthorized file deletion.
- No duplicate documentation.
- No invented implementation details.
- No undocumented security-sensitive information.
- No project documentation outside `/docs`.
- No silent architectural changes.

## 8. Final Response

Summarize:
- Work completed.
- Files created or modified.
- Documentation updated.
- Verification performed.
- Outstanding issues, if any.

**Core principle:** Keep documentation concise, accurate, consistent, and synchronized with the actual project.