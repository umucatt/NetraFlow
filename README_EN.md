<p align="center">
  <img src="docs/assets/netraflow-icon.png" alt="NetraFlow icon" width="128" />
</p>

<h1 align="center">NetraFlow</h1>

<p align="center">
  A local asset change tracking application
</p>

<p align="center">
  <a href="README.md">简体中文</a> · <strong>English</strong>
</p>

## Overview

NetraFlow (净流) is a local asset change tracking desktop application, primarily for Windows. It helps users record account balances, asset changes, and historical movement over time. It is designed for people who want to keep asset data on their own machine, maintain it manually, and review changes by date.

The application is built with Electron, React, TypeScript, and Vite, with npm used for dependency management, development, testing, and packaging.

## Features

- Manage asset and liability account types, plus the accounts under each type.
- Record account creation, balance edits, deletion, archiving, reactivation, and other history.
- Review home asset stats, asset allocation, asset trends, and account-level charts.
- Use single-account quick entry and Flash Note to fill balances or net-worth changes across multiple dates.
- Import externally summarized JSON after local account matching and risk review.
- Search accounts, history records, snapshot records, and settings with global search.
- Export and import manual snapshots, configure automatic snapshots, and optionally encrypt snapshot files with a snapshot password.
- Configure theme, charts, search, data backup, and security-related settings.

## Download and Installation

Regular users should download published builds from [GitHub Releases](https://github.com/umucatt/NetraFlow/releases).

Windows builds provide two artifact types:

- Setup: `NetraFlow_<version>_Setup.exe`, for installation through an installer wizard.
- Portable: `NetraFlow_<version>_Portable.zip`, unzip it and run `NetraFlow.exe`.

Current Windows builds are not code signed. Windows or security software may show a source warning on first launch, so verify that the file came from this repository's Releases page before continuing.

## Basic Usage

1. Create asset or liability account types, then add accounts under those types.
2. Enter balances and changes through account actions, single-account quick entry, or Flash Note.
3. Review changes from the home page, asset overview, account details, and history.
4. Use charts to inspect asset allocation, asset trends, and account trends.
5. Export snapshots before larger edits or imports, and restore from a snapshot when needed.
6. When using summary import, review the JSON format, account matching results, and import risks before writing data locally.

## Data and Privacy

NetraFlow stores current data locally. It does not provide cloud sync and does not automatically upload asset data. Users can back up data through manual snapshots and automatic snapshots.

Current local data uses schema 1. The application migrates older data formats. If it detects a future schema version, it refuses to read it so an older app version does not overwrite newer-format data. Storage writes maintain a validated `previous` copy, which can be used to recover when the current data is missing or damaged.

The development runtime and userdata are isolated from the production application, so development data does not pollute normal user data. Current local data is not encrypted by default; manually exported and automatically generated snapshot files can be encrypted with the configured snapshot password.

## Current Limitations

- The application is primarily built for Windows; macOS and Linux are not current release targets.
- Windows builds are not code signed, so the system may display security warnings.
- Automatic updates are not provided. Users need to download new versions from Releases manually.
- Asset data is mainly entered manually or imported from local files. Automatic bank, brokerage, or market account sync is not provided.
- Local current data is not the same as a cloud backup. Export snapshots regularly and keep them somewhere safe.

## Development

### Requirements

- Node.js 22 LTS
- npm
- A Windows environment for validating the Windows desktop app and building Windows artifacts

### Get the Source

```bash
git clone https://github.com/umucatt/NetraFlow.git
cd NetraFlow
```

### Install Dependencies

```bash
npm ci
```

### Start the Development Environment

```bash
npm run dev
```

This command starts the Vite renderer development server, then launches Electron after the server is ready. Development runs with a separate application identity, runtime, and userdata.

### Type Checking

```bash
npm run typecheck
```

### Run Tests

```bash
npm test
```

### Production Build

```bash
npm run build
```

This command runs TypeScript checks, builds with Vite, and generates build outputs for the Electron main process and preload script.

### Local Release Check

```bash
npm run release:check
```

Use the strict release check before publishing:

```bash
npm run release:check -- --strict
```

Non-strict mode reports a dirty worktree as a warning. Strict mode treats a dirty worktree as an error.

### Windows Artifacts

Run the production build first:

```bash
npm run build
```

Then build the artifacts as needed:

```bash
npm run dist:installer
npm run dist:portable
```

Default artifact names are:

- `release/installer/<version>/NetraFlow_<version>_Setup.exe`
- `release/portable/<version>/NetraFlow_<version>_Portable.zip`

If an output directory for the same version already exists, the release scripts append a numeric suffix to the directory name.

### Versioning Rules

- Versions in `package.json` and `package-lock.json` must stay in sync.
- Release versions use `major.minor.patch` and may include a suffix.
- Release tags use `v<version>` and must point to the release commit.
- When the version is lower than `1.0.0`, or the suffix contains `beta` / `rc`, the Release is marked as a Pre-release.

### Automated Workflows

- A normal push to `main`, a pull request targeting `main`, or a manual dispatch runs Verify Windows.
- Verify Windows uses Node.js 22 and runs `npm ci`, `npm run typecheck`, `npm test`, and `npm run build` in order.
- Version tags matching `v*.*.*` or `v*.*.*-*` trigger Release Windows.
- Release Windows validates the tag and version, runs `npm run release:check -- --strict`, type checks, tests, builds, creates Setup and Portable artifacts, and verifies release files.
- GitHub Releases are created as Draft by default.
- Versions lower than `1.0.0`, or version suffixes containing `beta` / `rc`, are created as Pre-release.

## Project Structure

| Path | Description |
| --- | --- |
| `electron/` | Electron main process, preload script, local storage, and window-related logic |
| `src/` | React renderer, pages, feature modules, styles, and tests |
| `public/icons/` | Application icon source files; Windows packaging continues to use `netraflow.ico` |
| `docs/assets/` | Assets used by README and documentation |
| `scripts/` | Development startup, release checks, packaging, artifact verification, and release-note scripts |
| `build/` | Installer script resources and license files bundled with releases |
| `.github/workflows/` | Windows verification and release workflows |

## Extension Development Notes

- Changes to the local data structure need to preserve schema versioning, migration logic, future-schema refusal, and the `previous` copy recovery path.
- Do not package development runtime, userdata, caches, logs, or user data into release artifacts.
- The Windows application icon source remains `public/icons/netraflow.ico`; `docs/assets/netraflow-icon.png` is only for README and documentation display.
- Release-flow changes should update `scripts/`, `.github/workflows/`, related tests, and README documentation together.
- Import, snapshot, and security-related features should continue to prioritize format validation, integrity checks, and recoverability tests.

## License

NetraFlow is licensed under GPL-3.0-only. See [LICENSE](LICENSE) for details.
