# Changelog

## [1.0.0] - 2026-03-31

### Added

- Initial release
- Downloads and caches platform-specific ARM embedded build tools from [mylonics/embedded-build-tools](https://github.com/mylonics/embedded-build-tools) on first activation
- Exposes typed `EmbeddedBuildToolsApi` for use by dependent extensions
- VS Code commands for every tool path, usable in `launch.json` via `${command:embeddedBuildTools.getGdbPath}`
- `getGccBinDir()` — exposes the ARM GCC binary directory so any binary can be accessed without individual getters
- Progress notification during download and extraction
- Automatic background install on activation
- macOS Gatekeeper quarantine attribute removal via `xattr -cr`
- Supports Windows x64, Linux x64/arm64, macOS x64/arm64
