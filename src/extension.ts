/**
 * VS Code extension entry point for Embedded Build Tools.
 *
 * This extension has no views.  It exposes an API that other extensions
 * (e.g. bmp-debug) can use to obtain the paths to the bundled build tools:
 * GCC, GDB, G++, CMake, Ninja, Python, objcopy, and size.
 *
 * It also registers VS Code commands for every path so that launch
 * configurations can reference them with the ${command:...} syntax, e.g.:
 *
 *   "miDebuggerPath": "${command:embeddedBuildTools.getGdbPath}"
 *
 * Usage from a dependent extension:
 *
 *   const ext = vscode.extensions.getExtension<EmbeddedBuildToolsApi>(
 *     'mylonics.embedded-build-tools'
 *   );
 *   if (ext) {
 *     const api = await ext.activate();
 *     const gdbPath = await api.getGdbPath();
 *   }
 */

import * as vscode from 'vscode';
import { ToolManager } from './toolManager';

/** Public API surface exported by this extension. */
export interface EmbeddedBuildToolsApi {
  /** Ensure tools are installed (download if needed). Returns true on success. */
  ensureToolsInstalled(): Promise<boolean>;

  /** Full path to arm-none-eabi-gcc, or undefined if not installed. */
  getGccPath(): Promise<string | undefined>;

  /** Full path to arm-none-eabi-g++, or undefined if not installed. */
  getGppPath(): Promise<string | undefined>;

  /** Full path to arm-none-eabi-gdb, or undefined if not installed. */
  getGdbPath(): Promise<string | undefined>;

  /** Full path to arm-none-eabi-objcopy, or undefined if not installed. */
  getObjcopyPath(): Promise<string | undefined>;

  /** Full path to arm-none-eabi-size, or undefined if not installed. */
  getSizePath(): Promise<string | undefined>;

  /** Full path to cmake, or undefined if not installed. */
  getCmakePath(): Promise<string | undefined>;

  /** Full path to ninja, or undefined if not installed. */
  getNinjaPath(): Promise<string | undefined>;

  /** Full path to portable python, or undefined if not installed. */
  getPythonPath(): Promise<string | undefined>;

  /**
   * Directory containing all ARM GCC binaries (arm-none-eabi-gcc, gdb, g++, …).
   * Use this when you need the bin dir rather than individual executable paths.
   */
  getGccBinDir(): Promise<string | undefined>;

  /** The directory that contains all unpacked tool subdirectories. */
  getToolsDir(): string;
}

let manager: ToolManager | undefined;

/** Resolve the storage directory from settings, falling back to the extension global storage. */
function resolveStoragePath(globalStoragePath: string): string {
  const configured = vscode.workspace
    .getConfiguration('embeddedBuildTools')
    .get<string>('toolsPath', '')
    .trim();
  return configured || globalStoragePath;
}

export function activate(
  context: vscode.ExtensionContext,
): EmbeddedBuildToolsApi {
  const globalStoragePath = context.globalStorageUri.fsPath;
  manager = new ToolManager(resolveStoragePath(globalStoragePath));

  // Start background install immediately so tools are ready as soon as possible.
  // This is non-blocking — activation completes instantly.
  manager.ensureInstalled();

  // Re-create the ToolManager when the toolsPath setting changes.
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('embeddedBuildTools.toolsPath')) {
        manager = new ToolManager(resolveStoragePath(globalStoragePath));
        manager.ensureInstalled();
      }
    }),
  );

  // ── Commands ─────────────────────────────────────────────────────────────

  // Install / update command (visible in the Command Palette)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'embeddedBuildTools.installTools',
      async () => {
        if (!manager) { return; }
        await manager.ensureInstalled();
      },
    ),
  );

  // Helper to register a command that resolves a path after ensuring install.
  const registerPathCommand = (
    commandId: string,
    getter: () => Promise<string | undefined>,
  ) => {
    context.subscriptions.push(
      vscode.commands.registerCommand(commandId, getter),
    );
  };

  registerPathCommand('embeddedBuildTools.getGccPath', async () => {
    if (!manager) { return undefined; }
    await manager.ensureInstalled();
    return manager.getToolPaths().gcc;
  });

  registerPathCommand('embeddedBuildTools.getGppPath', async () => {
    if (!manager) { return undefined; }
    await manager.ensureInstalled();
    return manager.getToolPaths().gpp;
  });

  registerPathCommand('embeddedBuildTools.getGdbPath', async () => {
    if (!manager) { return undefined; }
    await manager.ensureInstalled();
    return manager.getToolPaths().gdb;
  });

  registerPathCommand('embeddedBuildTools.getObjcopyPath', async () => {
    if (!manager) { return undefined; }
    await manager.ensureInstalled();
    return manager.getToolPaths().objcopy;
  });

  registerPathCommand('embeddedBuildTools.getSizePath', async () => {
    if (!manager) { return undefined; }
    await manager.ensureInstalled();
    return manager.getToolPaths().size;
  });

  registerPathCommand('embeddedBuildTools.getCmakePath', async () => {
    if (!manager) { return undefined; }
    await manager.ensureInstalled();
    return manager.getToolPaths().cmake;
  });

  registerPathCommand('embeddedBuildTools.getNinjaPath', async () => {
    if (!manager) { return undefined; }
    await manager.ensureInstalled();
    return manager.getToolPaths().ninja;
  });

  registerPathCommand('embeddedBuildTools.getPythonPath', async () => {
    if (!manager) { return undefined; }
    await manager.ensureInstalled();
    return manager.getToolPaths().python;
  });

  registerPathCommand('embeddedBuildTools.getGccBinDir', async () => {
    if (!manager) { return undefined; }
    await manager.ensureInstalled();
    return manager.getToolPaths().gccBinDir;
  });

  // ── API object returned to dependent extensions ───────────────────────────

  const api: EmbeddedBuildToolsApi = {
    ensureToolsInstalled(): Promise<boolean> {
      if (!manager) {
        return Promise.reject(new Error('Embedded Build Tools extension is not activated'));
      }
      return manager.ensureInstalled();
    },

    async getGccPath(): Promise<string | undefined> {
      if (!manager) { return undefined; }
      await manager.ensureInstalled();
      return manager.getToolPaths().gcc;
    },

    async getGppPath(): Promise<string | undefined> {
      if (!manager) { return undefined; }
      await manager.ensureInstalled();
      return manager.getToolPaths().gpp;
    },

    async getGdbPath(): Promise<string | undefined> {
      if (!manager) { return undefined; }
      await manager.ensureInstalled();
      return manager.getToolPaths().gdb;
    },

    async getObjcopyPath(): Promise<string | undefined> {
      if (!manager) { return undefined; }
      await manager.ensureInstalled();
      return manager.getToolPaths().objcopy;
    },

    async getSizePath(): Promise<string | undefined> {
      if (!manager) { return undefined; }
      await manager.ensureInstalled();
      return manager.getToolPaths().size;
    },

    async getCmakePath(): Promise<string | undefined> {
      if (!manager) { return undefined; }
      await manager.ensureInstalled();
      return manager.getToolPaths().cmake;
    },

    async getNinjaPath(): Promise<string | undefined> {
      if (!manager) { return undefined; }
      await manager.ensureInstalled();
      return manager.getToolPaths().ninja;
    },

    async getPythonPath(): Promise<string | undefined> {
      if (!manager) { return undefined; }
      await manager.ensureInstalled();
      return manager.getToolPaths().python;
    },

    async getGccBinDir(): Promise<string | undefined> {
      if (!manager) { return undefined; }
      await manager.ensureInstalled();
      return manager.getToolPaths().gccBinDir;
    },

    getToolsDir(): string {
      if (!manager) {
        throw new Error('Embedded Build Tools extension is not activated');
      }
      return manager.getToolPaths().toolsDir;
    },
  };

  return api;
}

export function deactivate(): void {
  manager = undefined;
}
