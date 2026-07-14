<p align="center">
  <img src="src/assets/brand/netraflow-logo.svg" alt="NetraFlow" width="128" />
</p>

<h1 align="center">NetraFlow</h1>

<p align="center">A local desktop tool for tracking asset changes</p>

<p align="center">
  <a href="README.md">简体中文</a> · <strong>English</strong>
</p>

## Project Overview

NetraFlow is a local desktop tool for tracking changes in personal assets. It is designed for manually maintaining asset and liability accounts, recording balance and net-worth changes, and reviewing those changes over time through history views and charts.

This project was developed with assistance from Codex and is my first project, created primarily to meet a personal need.

## Main Features

- Manage asset and liability categories and their accounts
- Record balances, net worth, and historical changes
- Review asset allocation, trends, and account details
- Add data across multiple dates with Quick Entry and Flash Note
- Import prepared summary data
- Search accounts, history records, snapshots, and settings
- Create manual and automatic snapshots
- Protect local data with a login password
- Store important backups as encrypted snapshots
- Configure themes, charts, backups, and security options
- Explore the app in Example Mode without affecting real data

## Download and Installation

Regular users can download release builds from [GitHub Releases](https://github.com/umucatt/NetraFlow/releases).

NetraFlow provides 64-bit desktop builds. The macOS build is available only for Apple Silicon.

| Platform | Architecture | Format | Filename |
| --- | --- | --- | --- |
| Windows | x64 | Installer | `NetraFlow_<version>_x64_Setup.exe` |
| Windows | x64 | Portable | `NetraFlow_<version>_x64_Portable.zip` |
| macOS | Apple Silicon arm64 | DMG | `NetraFlow_<version>_arm64.dmg` |
| Linux | x64 | AppImage | `NetraFlow_<version>_x64.AppImage` |
| Linux | x64 | DEB | `NetraFlow_<version>_x64.deb` |

### Windows

Use the setup wizard to install the installer build.

For the portable build, extract the archive and run `NetraFlow.exe`. No installation is required.

### macOS

Open the DMG, drag NetraFlow into the Applications folder, and launch it from there.

### Linux

AppImage:

```bash
chmod +x NetraFlow_<version>_x64.AppImage
./NetraFlow_<version>_x64.AppImage
```

DEB:

```bash
sudo apt install ./NetraFlow_<version>_x64.deb
```

Installing the DEB package requires package-management privileges. Normal use of NetraFlow does not require administrator or root privileges.

## Data and Privacy

NetraFlow is a local tool. Accounts, history records, settings, snapshots, and other content are stored in NetraFlow's data directory on the device.

User data is stored in `userdata/`, while caches, logs, and other runtime files are stored in `runtime/`. Each platform uses its own local location, which is managed by the application.

Create manual snapshots from time to time based on how frequently you use the app, or enable automatic snapshots. Automatic snapshots are checked when the application starts and run according to your settings. NetraFlow does not start automatically or register system-level scheduled tasks or wake events.

When exporting data for use outside NetraFlow, moving data to another environment, or creating a general-purpose backup before uninstalling, disable login password protection or snapshot encryption and export a plaintext snapshot. Encrypted snapshots are intended mainly for restoration within NetraFlow and cannot be read directly by third-party applications.

Please note:

- Disk failure, accidental deletion, uninstallation, or data clearing may result in data loss
- Data protected by a login password may be unrecoverable if the password is forgotten
- Older encrypted snapshots may require the password that was used when they were created
- Plaintext exports are not protected by the login password and must be stored securely
- Before major changes, bulk imports, device migration, or uninstallation, create a snapshot and copy it to another location

### File Integrity Warnings

NetraFlow checks the integrity of local data and imported files within the application's managed directories.

If NetraFlow detects changes that may not have been produced through normal application operations, or finds inconsistent content, it displays a risk warning and avoids overwriting existing data while the state is uncertain. When this happens, keep the current files and any existing snapshots before verifying the source and contents of the data.

### Clearing Local Data

The in-app Clear All feature removes the `userdata/` and `runtime/` directories managed by NetraFlow, then exits the application.

The following also applies to each distribution format:

- The Windows installer uninstaller selects local user-data removal by default; clear that option to retain the data
- In the Windows portable build, `userdata/` and `runtime/` are stored in the extracted directory and can also be removed manually after exiting the application, either by deleting those directories or the entire portable folder
- On macOS and Linux, use Clear All in the application before uninstalling if you also need to remove local data
- Removing the application itself and removing local data are separate actions; confirm whether snapshots need to be retained before uninstalling

## Uninstallation

Before uninstalling, read the clearing and backup guidance in Data and Privacy.

### Windows

The installer build can be removed through Windows Settings → Apps or from the uninstall entry in the Start menu.

For the portable build, exit the application and delete the extracted directory.

### macOS

Exit NetraFlow, then move `NetraFlow.app` from the Applications folder to the Trash.

### Linux

For the AppImage build, exit the application and delete the AppImage file.

For the DEB build:

```bash
sudo apt remove netraflow
```

---

## Source Development and Self-Building

NetraFlow is built with Electron, React, TypeScript, and Vite. Windows, macOS, and Linux share a single business-code base.

### Requirements

- Node.js 22
- npm
- The target operating system for the package being built

Release packages should be built and verified on their respective target platforms.

### Get the Source

```bash
git clone https://github.com/umucatt/NetraFlow.git
cd NetraFlow
npm ci
```

### Development and Checks

```bash
npm run dev
npm run typecheck
npm test
npm run build
```

Additional pre-release checks:

```bash
npm run release:check
npm run release:check -- --strict
```

Strict checks also validate the release context and Git state.

### Local Builds

Run the following before packaging:

```bash
npm run build
```

Windows:

```bash
npm run dist:installer
npm run dist:portable
```

macOS:

```bash
npm run dist:mac
```

Linux:

```bash
npm run dist:linux
npm run dist:deb
```

Windows, macOS, and Linux release packages should each be built and verified on their corresponding platform.

## Main Directories

| Path | Description |
| --- | --- |
| `electron/` | Electron main process and desktop platform integration |
| `src/` | Application UI and shared business logic |
| `src/assets/brand/` | Brand source files |
| `public/` | Static assets and platform icons |
| `scripts/` | Development, checks, build, and packaging tools |
| `build/` | Packaging configuration and release resources |
| `.github/workflows/` | Automated checks and release workflows |

## Development Notes

- Keep a single shared business-code base and centralize platform-specific behavior
- Do not break existing platform behavior when adding support for another platform
- Consider compatibility and migration when changing data formats or data directories
- Do not include user data, test data, caches, or logs in release packages
- Do not rely on privilege elevation or hidden scripts during normal application runtime
- Confirm that new dependencies are necessary and keep the lockfile consistent
- Run at least type checking, tests, and a production build after making changes
- Validate platform-specific behavior and release packages on the target platform
- Read [AGENTS.md](AGENTS.md) before contributing

## Development and Test Platforms

The following environments are used for the project's primary development and testing. They are not minimum system requirements and do not indicate complete compatibility coverage for all similar devices.

| Platform | Primary Environment |
| --- | --- |
| Windows | Windows 11 IoT Enterprise LTSC 2024 (24H2), Intel Core i5-13600KF, 32 GB RAM |
| macOS | MacBook Pro, Apple M1 Pro, 16 GB RAM |
| Linux | Ubuntu 26.04 LTS x64, dual-booted on the same machine as Windows |

## License

NetraFlow is licensed under the [GNU General Public License v3.0 only](LICENSE).
