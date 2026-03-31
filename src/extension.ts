/**
 * VS Code extension entry point for Embedded Build Tools.
 *
 * This extension has no views.  It exposes an API that other extensions
 * (e.g. bmp-debug) can use to obtain the paths to the bundled build tools:
 * GCC, GDB, G++, CMake, Ninja, Python, objcopy, and size.
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

  /** The directory that contains all unpacked tool subdirectories. */
  getToolsDir(): string;
}

let manager: ToolManager | undefined;

export function activate(
  context: vscode.ExtensionContext,
): EmbeddedBuildToolsApi {
  manager = new ToolManager(context.globalStorageUri.fsPath);

  // Register the install/update command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'embeddedBuildTools.installTools',
      async () => {
        if (!manager) {
          return;
        }
        // Force a fresh check (not cached) by removing the existing tools dir
        // if the user explicitly asks to update.
        await manager.ensureInstalled();
      },
    ),
  );

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
