# Embedded Build Tools for VS Code

A Visual Studio Code extension that **provides embedded build tools** (ARM GCC, GDB, CMake, Ninja, Python) for embedded ARM development.

This extension has **no views**.  It exposes an API that other extensions can use to obtain the paths to the packaged tools, and downloads the correct platform-specific bundle on first use.

## Tools Provided

| Tool | Version |
|------|---------|
| `arm-none-eabi-gcc` / `arm-none-eabi-gdb` | 13.3.1-1.1 |
| `cmake` | 3.28.6-1 |
| `ninja` | 1.12.1-1 |
| `python` (portable) | 3.12.6-1 |

## Supported Platforms

- Windows x64
- Linux x64
- Linux arm64
- macOS x64 (Intel)
- macOS arm64 (Apple Silicon)

## How It Works

On first use, the extension downloads the appropriate pre-built bundle from the [embedded-build-tools releases](https://github.com/mylonics/embedded-build-tools/releases) and stores it in VS Code's global storage directory.  Subsequent calls use the cached copy.

You can also manually trigger (re-)installation via the Command Palette:

```
Embedded Build Tools: Install / Update Tools
```

## API for Extension Authors

Other extensions (e.g. [bmp-debug](https://github.com/mylonics/bmp-debug)) can consume this extension's API to obtain tool paths without bundling the binaries themselves:

```typescript
import type { EmbeddedBuildToolsApi } from 'mylonics.embedded-build-tools';

const ext = vscode.extensions.getExtension<EmbeddedBuildToolsApi>(
  'mylonics.embedded-build-tools'
);

if (ext) {
  const api = await ext.activate();

  // Ensure tools are downloaded (shows progress notification)
  const ok = await api.ensureToolsInstalled();

  if (ok) {
    const gdbPath    = await api.getGdbPath();    // arm-none-eabi-gdb
    const gccPath    = await api.getGccPath();    // arm-none-eabi-gcc
    const gppPath    = await api.getGppPath();    // arm-none-eabi-g++
    const cmakePath  = await api.getCmakePath();  // cmake
    const ninjaPath  = await api.getNinjaPath();  // ninja
    const pythonPath = await api.getPythonPath(); // portable python

    // Directory containing all tool sub-directories
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
