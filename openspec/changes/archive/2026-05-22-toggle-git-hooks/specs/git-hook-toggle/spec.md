## ADDED Requirements

### Requirement: Floating dropdown menu on project rows
Each project row in the menu window SHALL display a "More" (⋮) button on hover. Clicking the ⋮ button SHALL open a floating dropdown menu with project-level actions. Only one dropdown SHALL be open at a time; opening a second dropdown SHALL close the first.

#### Scenario: Hover reveals ⋮ button
- **WHEN** the user hovers over a project row
- **THEN** the ▶, ⚡, and ⋮ buttons become visible on that row

#### Scenario: Click ⋮ opens dropdown
- **WHEN** the user clicks the ⋮ button on a project row
- **THEN** a dropdown menu appears below the ⋮ button with the actions: Toggle Git Hooks, Open in File Explorer, Remove from List

#### Scenario: Click outside closes dropdown
- **WHEN** a dropdown is open and the user clicks anywhere outside it
- **THEN** the dropdown closes

### Requirement: Toggle Git hooks for a project
The system SHALL allow users to disable or re-enable Git hooks for an individual project by modifying the project's local Git config (`core.hooksPath`). When hooks are disabled, the system SHALL set `core.hooksPath` to a nonexistent path. When enabled, the system SHALL unset `core.hooksPath`.

#### Scenario: Disable hooks
- **WHEN** the user selects "Disable Git Hooks" from the dropdown
- **THEN** the system executes `git config --local core.hooksPath /dev/null` in the project directory
- **AND** the menu label changes to "Enable Git Hooks"
- **AND** the state is persisted

#### Scenario: Enable hooks
- **WHEN** the user selects "Enable Git Hooks" from the dropdown
- **THEN** the system executes `git config --local --unset core.hooksPath` in the project directory
- **AND** the menu label changes to "Disable Git Hooks"
- **AND** the state is persisted

### Requirement: Persist hook state per project
The system SHALL store the `disableHooks` flag for each project in `projects.json` alongside the project path. On read, the system SHALL normalize legacy string entries to objects with `disableHooks: false`.

#### Scenario: Load projects with hook state
- **WHEN** the system loads projects from `projects.json`
- **THEN** each project is represented as `{ path: string, disableHooks: boolean }`
- **AND** legacy string entries are coerced to `disableHooks: false`

#### Scenario: Save projects with hook state
- **WHEN** the system saves projects to `projects.json`
- **THEN** all entries are written as `{ path, disableHooks }` objects

### Requirement: Open project in file explorer
The dropdown SHALL provide an action to open the project's directory in the system file explorer.

#### Scenario: Open in explorer
- **WHEN** the user selects "Open in File Explorer" from the dropdown
- **THEN** the system opens the project path in the default file explorer

### Requirement: Remove project from list
The dropdown SHALL provide an action to remove the project from the launcher list without deleting any files.

#### Scenario: Remove project
- **WHEN** the user selects "Remove from List" from the dropdown
- **THEN** the project is removed from the in-memory list
- **AND** the updated list is saved to `projects.json`
- **AND** the menu re-renders without the removed project
