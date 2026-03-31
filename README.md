# Embedded Build Tools for VS Code

A Visual Studio Code extension that **provides embedded build tools** (ARM GCC, GDB, CMake, Ninja, Python) for embedded ARM development.

This extension has **no views**.  It exposes an API and VS Code commands that other extensions and launch configurations can use to obtain the paths to the packaged tools, and downloads the correct platform-specific bundle on first use.

## Tools Provided

| Tool | Version |
|------|---------|
| `arm-none-eabi-gcc` / `arm-none-eabi-gdb` | 15.2.1-1.1 |
| `cmake` | 3.28.6-1 |
| `ninja` | 1.12.1-1 |
| `python` (portable) | 3.12.6+20240909 |

## Supported Platforms

- Windows x64
- Linux x64
- Linux arm64
- macOS x64 (Intel)
- macOS arm64 (Apple Silicon)

## How It Works

On first activation, the extension automatically starts downloading the appropriate pre-built bundle from the [embedded-build-tools releases](https://github.com/mylonics/embedded-build-tools/releases) in the background (with a progress notification). The bundle is stored in VS Code's global storage directory and persists across extension updates.

It always downloads the **latest release** of `mylonics/embedded-build-tools`.

You can also manually trigger (re-)installation via the Command Palette:

```
Embedded Build Tools: Install / Update Tools
```

## Using Paths in Launch Configurations

All tool paths are exposed as VS Code commands, allowing them to be used directly in `launch.json` via the `${command:...}` syntax:

```jsonc
// .vscode/launch.json
{
  "configurations": [
    {
      "name": "Debug (BMP)",
      "type": "cortex-debug",
      "request": "launch",
      "miDebuggerPath": "${command:embeddedBuildTools.getGdbPath}",
      "miDebuggerArgs": "--interpreter=mi2"
    }
  ]
}
```

### Available Commands

| Command | Returns |
|---------|---------|
| `embeddedBuildTools.getGccPath` | Full path to `arm-none-eabi-gcc` |
| `embeddedBuildTools.getGppPath` | Full path to `arm-none-eabi-g++` |
| `embeddedBuildTools.getGdbPath` | Full path to `arm-none-eabi-gdb` |
| `embeddedBuildTools.getObjcopyPath` | Full path to `arm-none-eabi-objcopy` |
| `embeddedBuildTools.getSizePath` | Full path to `arm-none-eabi-size` |
| `embeddedBuildTools.getCmakePath` | Full path to `cmake` |
| `embeddedBuildTools.getNinjaPath` | Full path to `ninja` |
| `embeddedBuildTools.getPythonPath` | Full path to portable `python` |
| `embeddedBuildTools.getGccBinDir` | Directory containing **all** ARM GCC binaries |
| `embeddedBuildTools.installTools` | Install / update tools (no return value) |

`getGccBinDir` is useful when you need to construct a path to any binary that is not individually exposed (e.g. `arm-none-eabi-nm`, `arm-none-eabi-strip`) — just join the returned directory with the binary filename.

## API for Extension Authors

Other extensions (e.g. [bmp-debug](https://github.com/mylonics/bmp-debug)) can consume this extension's API to obtain tool paths without bundling the binaries themselves:

```typescript
import type { EmbeddedBuildToolsApi } from 'mylonics.embedded-build-tools';

const ext = vscode.extensions.getExtension<EmbeddedBuildToolsApi>(
  'mylonics.embedded-build-tools'
);

if (ext) {
  const api = await ext.activate();

  // Ensure tools are downloaded (shows progress notification if needed)
  const ok = await api.ensureToolsInstalled();

  if (ok) {
    const gdbPath    = await api.getGdbPath();    // arm-none-eabi-gdb
    const gccPath    = await api.getGccPath();    // arm-none-eabi-gcc
    const gppPath    = await api.getGppPath();    // arm-none-eabi-g++
    const cmakePath  = await api.getCmakePath();  // cmake
    const ninjaPath  = await api.getNinjaPath();  // ninja
    const pythonPath = await api.getPythonPath(); // portable python

    // Directory containing all ARM GCC binaries
    const gccBinDir  = await api.getGccBinDir();

    // Root directory containing all tool sub-directories
    const toolsDir   = api.getToolsDir();
  }
}
```

### Full API Reference

```typescript
interface EmbeddedBuildToolsApi {
  /** Download tools if not already present.  Returns true on success. */
  ensureToolsInstalled(): Promise<boolean>;

  getGccPath():     Promise<string | undefined>;  // arm-none-eabi-gcc
  getGppPath():     Promise<string | undefined>;  // arm-none-eabi-g++
  getGdbPath():     Promise<string | undefined>;  // arm-none-eabi-gdb
  getObjcopyPath(): Promise<string | undefined>;  // arm-none-eabi-objcopy
  getSizePath():    Promise<string | undefined>;  // arm-none-eabi-size
  getCmakePath():   Promise<string | undefined>;  // cmake
  getNinjaPath():   Promise<string | undefined>;  // ninja
  getPythonPath():  Promise<string | undefined>;  // portable python

  /** Directory containing all ARM GCC binaries (arm-none-eabi-*). */
  getGccBinDir():   Promise<string | undefined>;

  /** Root directory that contains all tool sub-directories. */
  getToolsDir(): string;
}
```

## Building

```bash
npm install
npm run compile      # development build
npm run package      # production build (for packaging)
```

## License

MIT — see [LICENSE](LICENSE).
