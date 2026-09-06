# skill-repo-sync

## Purpose

Defines the structure and conventions of the `ai-toolkit` remote repository — the authoritative source for personal Claude Code skills and Git hooks synced across machines and projects.

## Requirements

### Requirement: Repository directory structure
The system SHALL create a GitHub repository named `ai-toolkit` with a predefined directory structure.

#### Scenario: Directory skeleton exists
- **WHEN** the repository is initialized
- **THEN** it SHALL contain the following top-level directories: `skills/core-skills/`, `skills/experimental/`, `githooks/standalone/`, `githooks/project-specific/`

### Requirement: Skills directory organization
The `skills/` directory SHALL separate stable skills from experimental ones.

#### Scenario: Core skill placement
- **WHEN** a skill is stable and ready for daily use
- **THEN** it SHALL reside in `skills/core-skills/`

#### Scenario: Experimental skill placement
- **WHEN** a skill is under development or for testing
- **THEN** it SHALL reside in `skills/experimental/`

### Requirement: Githooks directory organization
The `githooks/` directory SHALL distinguish between reusable and context-specific hooks.

#### Scenario: Standalone hook placement
- **WHEN** a hook can be used by any Git repository without modification
- **THEN** it SHALL reside in `githooks/standalone/`

#### Scenario: Project-specific hook placement
- **WHEN** a hook depends on project type or specific tooling (e.g., Electron, Node.js)
- **THEN** it SHALL reside in `githooks/project-specific/`

### Requirement: README documentation
The repository SHALL include a README file explaining the directory layout and usage conventions.

#### Scenario: README contains structure
- **WHEN** a user opens the repository
- **THEN** the README SHALL document the purpose of each directory and naming conventions for skills and hooks
