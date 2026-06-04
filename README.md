# FoldGen 📁

Cross-platform folder-structure generator — fast, modern and lightweight.
Design a tree of folders and files once, then create it on disk or export it as
a `.bat` (Windows) / `.sh` (macOS · Linux) script.

Built with [Wails v2](https://wails.io) (Go) + Vue 3, packaged as a single
native executable for every platform.

## ✨ Features

- **Tree editor** with drag & drop, multi-selection and spring-loaded folders
- **Templates**: save, rename, duplicate, import/export as JSON
- **Scan** an existing folder to turn it into a reusable template
- **Folder colors** — by depth, custom palette or single color
- Customizable **app tint**, light/dark theme, adjustable font size
- **Search** within the tree, expand/collapse by level, ASCII tree preview
- Real-time name validation, unsaved-changes protection, single-instance lock
- Generate the structure **on disk** or as a **`.bat` / `.sh`** script

## ⬇️ Download

Grab the latest build from the **[Releases](../../releases)** page:

| System | File |
|---|---|
| Windows x64 | `FoldGen-windows-amd64.exe` |
| Windows ARM64 | `FoldGen-windows-arm64.exe` |
| macOS (Intel + Apple Silicon) | `FoldGen-macos-universal.zip` |
| Linux x64 | `FoldGen-linux-amd64` |
| Linux ARM64 | `FoldGen-linux-arm64` |

### Install notes

- **Windows** — SmartScreen may warn (the app is unsigned): *More info → Run
  anyway*. Requires WebView2 (preinstalled on Windows 10/11).
- **macOS** — the app is not notarized: right-click → *Open*, or run
  `xattr -cr FoldGen.app` once.
- **Linux** — `chmod +x FoldGen-linux-*` then run. Requires WebKitGTK
  (`libwebkit2gtk-4.1`).

Templates and settings are stored per-user (`~/.config/FoldGen`,
`~/Library/Application Support/FoldGen`, `%AppData%\FoldGen`).

## 🛠️ Build from source

Requirements: **Go 1.22+**, **Node 20+**, and the
[Wails v2 CLI](https://wails.io/docs/gettingstarted/installation).

```bash
wails dev      # development with hot-reload
wails build    # build for the current platform
```

On Linux install the WebKitGTK dev packages first:
`libgtk-3-dev libwebkit2gtk-4.1-dev`.

Releases for all platforms are produced automatically by
[GitHub Actions](.github/workflows/release.yml) when a `v*` tag is pushed.

## 🧱 Tech stack

- **Backend**: Go + Wails v2
- **Frontend**: Vue 3, Vite, TypeScript, Tailwind CSS, Pinia

## 📄 License

[MIT](LICENSE) © 2026 Roberto Carito
