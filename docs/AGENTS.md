# AGENT INSTRUCTIONS: LOCAL DOCUMENTATION SYSTEM

## 1. Main Goal

Create and maintain an organized documentation system inside the project folder.

**Primary rule:**
- Documentation files (`.md`) are the default output.
- Do not modify source code unless the user explicitly requests code changes.
- Do not modify configuration files, database schemas, dependencies, or other project files without permission.
- When code changes are explicitly requested, only modify files within the requested scope.

## 2. Documentation Location

All project documentation must be stored inside:

`/docs`

Do not create random documentation files outside `/docs`.

## 3. Required Folder Structure

Maintain the following structure:

```text
/docs
├── 00-overview/
│   ├── project-summary.md
│   └── setup-guide.md
│
├── 01-features/
│   ├── feature-list.md
│   └── feature-details.md
│
├── 02-database/
│   ├── database-schema.md
│   └── tables-and-fields.md
│
├── 03-api/
│   ├── api-routes.md
│   └── request-response.md
│
├── 04-ui/
│   ├── screens.md
│   ├── navigation.md
│   └── design-system.md
│
├── 05-development/
│   └── coding-rules.md
│
└── 06-decisions/
    ├── decisions.md
    └── future-plans.md
```

Additional documentation files may be created inside the appropriate existing folders when necessary.

## 4. Documentation Rules

1. Use Markdown (`.md`) files only.
2. Keep documentation organized, readable, and easy to scan.
3. Use headings, tables, bullet points, and code examples when appropriate.
4. Update existing documentation instead of creating duplicate files.
5. Never delete documentation files unless explicitly instructed.
6. Never create documentation outside `/docs`.
7. Do not document assumptions as confirmed facts.
8. Document actual implemented behavior, not imagined or planned functionality.
9. Clearly distinguish between implemented, incomplete, and planned features.
10. Never include passwords, API keys, access tokens, or other secrets in documentation.

## 5. Before Making Changes

Before working on any project task:

1. Read `/docs/00-overview/project-summary.md`.
2. Read the relevant documentation for the task.
3. Inspect the existing source code when necessary to understand actual behavior.
4. Check the existing database schema when the task involves database functionality.
5. Understand the existing architecture before proposing changes.
6. Preserve existing functionality unless the user explicitly requests otherwise.

Do not assume that existing documentation is always accurate. Verify important technical details against the actual implementation.

## 6. After Making Changes

After completing a project task:

1. Update the documentation related to the changes.
2. Check ALL documentation folders:
   - `00-overview`
   - `01-features`
   - `02-database`
   - `03-api`
   - `04-ui`
   - `05-development`
   - `06-decisions`
3. Identify documentation affected directly or indirectly.
4. Update every affected document.
5. Do not unnecessarily rewrite unrelated documentation.
6. Keep terminology and technical descriptions consistent across all documents.
7. Verify that documented behavior matches the actual implementation.
8. Report which documentation files were created or updated.

**Important:** Checking all documentation folders does not mean modifying every document. Only update documents affected by the task.

## 7. Required Documentation Content

### 7.1 project-summary.md

Must explain:

- What the project is.
- Main purpose.
- Technology stack.
- Main features.
- Overall architecture.
- Current development status.

### 7.2 setup-guide.md

Must explain:

- Installation instructions.
- How to run the project.
- Required dependencies.
- Environment variables (names only, never secret values).
- Database setup.
- Common errors and solutions.

### 7.3 feature-list.md

Maintain a list of project features with these statuses:

| Status | Meaning |
|---|---|
| Planned | Not implemented yet |
| In Progress | Currently being developed |
| Done | Implemented and verified |

Never mark a feature as Done without verifying its implementation.

### 7.4 decisions.md

Record important technical and architectural decisions.

Each entry should include:

- Decision.
- Reason.
- Date.
- Impact.
- Alternatives considered (when relevant).

### 7.5 Other Documentation

Maintain the following information where applicable:

- `feature-details.md`: Detailed feature behavior and workflows.
- `database-schema.md`: Database relationships and schema overview.
- `tables-and-fields.md`: Database tables, columns, and data types.
- `api-routes.md`: API endpoints, HTTP methods, and authorization.
- `request-response.md`: API request parameters, payloads, and responses.
- `screens.md`: Application screens and their responsibilities.
- `navigation.md`: Application navigation and routing.
- `design-system.md`: UI components, colors, typography, and design conventions.
- `coding-rules.md`: Project coding standards and development conventions.
- `future-plans.md`: Planned improvements and future functionality.

## 8. Notes and Unclear Information

If information does not fit an existing documentation file:

1. Check whether an existing document can accommodate it.
2. If not, create or update:

`/docs/05-development/notes.md`

3. Do not create duplicate documentation for information already documented elsewhere.
4. Mark unverified information clearly.

## 9. Agent Behavior

Every time you work on the project:

1. Check the project summary first.
2. Understand the existing implementation.
3. Check relevant documentation before making changes.
4. Follow the user's requested scope.
5. Preserve existing functionality.
6. Update affected documentation.
7. Check all documentation folders for indirect impacts.
8. Verify documentation accuracy.
9. Provide a summary of changes.

## 10. Final Restrictions

- Do not modify source code without explicit permission.
- Do not delete existing files without permission.
- Do not create duplicate documentation.
- Do not invent features, database fields, API endpoints, or implementation details.
- Do not mark incomplete features as Done.
- Do not silently change project architecture.
- Do not expose sensitive credentials in documentation.
- Do not place project documentation outside `/docs`.

**Final principle:**

Keep the project documentation accurate, consistent, organized, and synchronized with the actual implementation. Preserve existing project functionality and follow the user's instructions before making changes.