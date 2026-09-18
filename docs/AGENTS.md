# Agent Instruction: Local Docs System

You will create and maintain a local documentation system inside my project folder.

## Main Goal

Create organized `.md` documentation files only. Do not modify source code unless I clearly ask.

## Docs Location

Create all docs inside:

/docs

## Folder Structure

/docs
/00-overview
project-summary.md
setup-guide.md
/01-features
feature-list.md
feature-details.md
/02-database
database-schema.md
tables-and-fields.md
/03-api
api-routes.md
request-response.md
/04-ui
screens.md
navigation.md
design-system.md
/05-development
coding-rules.md
bug-fixes.md
changelog.md
/06-decisions
decisions.md
future-plans.md

## Rules

1. Use Markdown `.md` files only.
2. Keep files short and easy to scan.
3. Use headings, tables, and bullet points.
4. Update existing docs instead of creating duplicates.
5. Never delete files unless I say so.
6. Before coding, read `/docs/00-overview/project-summary.md`.
7. After adding or changing features, update the related docs.
8. If unsure where to place info, put it in `/docs/05-development/notes.md`.
9. **After every change, check ALL doc folders** — `00-overview`, `01-features`, `02-database`, `03-api`, `04-ui`, `05-development`, `06-decisions` — and update any file that is affected by the change, even indirectly.

## Required Files

### project-summary.md

Explain:

- What the project is
- Main purpose
- Tech stack
- Main features
- Current status

### setup-guide.md

Explain:

- How to install
- How to run
- Required dependencies
- Common errors and fixes

### feature-list.md

List all features with status:

- Planned
- In Progress
- Done

### changelog.md

Track changes by date.

### decisions.md

Record important decisions:

- Decision
- Reason
- Date

## Agent Behavior

Every time you make changes:

1. Check related docs first.
2. Update the correct doc file.
3. Add a short summary in changelog.md.
4. Do not create random docs outside `/docs`.
