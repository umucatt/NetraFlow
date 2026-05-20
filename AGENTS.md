# Project Notes

## Overview
- This is an Electron + React + TypeScript app built with Vite and npm.
- The Electron main process lives in `electron/main.ts` and compiles to `dist-electron/main.js`.
- The renderer entry is `src/main.tsx`; the main UI currently lives mostly in `src/App.tsx`.
- Global styles live in `src/styles.css`.

## Commands
- Install dependencies: `npm install`
- Start development: `npm run dev`
- Build and type-check: `npm run build`
- Build then start Electron: `npm start`

If the global `npm` command is unavailable in this workspace, use the bundled runtime:

```powershell
$env:Path="$PWD\.tools\node-v22.22.2-win-x64;$env:Path"
& ".tools\node-v22.22.2-win-x64\npm.cmd" run build
```

## Implementation Guidelines
- Keep changes focused and incremental; do not rebuild or replace the project structure unless explicitly asked.
- Preserve localStorage compatibility for existing asset/account data.
- Do not add SQLite, routes, backend services, or heavy dependencies unless the user explicitly requests them.
- Prefer local UI changes in `src/App.tsx` for the current asset overview workflow.
- Keep the interface minimal, centered, and lightweight.

## Current Product Behavior
- The renderer is an asset overview app, not the original placeholder page.
- Data is mocked and persisted with localStorage.
- Accounts support add, edit balance, adjust balance, archive, delete, restore, custom abbreviation, and history records.
- Negative input is blocked for user-entered amounts; debt values are stored/displayed as negative through group logic.
