/**
 * Tool manager for embedded build tools.
 *
 * Downloads and caches platform-specific tool bundles from the
 * mylonics/embedded-build-tools GitHub releases.  Tools are stored
 * in the extension's global storage directory so they survive extension
 * updates.
 */

import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';
import * as child_process from 'child_process';
import * as vscode from 'vscode';

const RELEASES_BASE =
  'https://github.com/mylonics/embedded-build-tools/releases/latest/download';

/** Map Node.js platform/arch to the embedded-build-tools artifact platform string. */
function getPlatformKey(): string | undefined {
  const platform = process.platform; // 'win32' | 'linux' | 'darwin'
  const arch = process.arch; // 'x64' | 'arm64'
  if (arch !== 'x64' && arch !== 'arm64') {
    return undefined;
  }
  if (platform === 'win32' || platform === 'linux' || platform === 'darwin') {
    return `${platform}-${arch}`;
  }
  return undefined;
}

/** Return the artifact filename for the current platform. */
function getArtifactName(platformKey: string): string {
  const ext = platformKey.startsWith('win32') ? 'zip' : 'tar.gz';
  return `embedded-build-tools-${platformKey}.${ext}`;
}

export interface ToolPaths {
  gcc: string | undefined;
  gpp: string | undefined;
  gdb: string | undefined;
  objcopy: string | undefined;
  size: string | undefined;
  cmake: string | undefined;
  ninja: string | undefined;
  python: string | undefined;
  /** Directory containing all ARM GCC binaries (arm-none-eabi-gcc, gdb, etc.). */
  gccBinDir: string | undefined;
  toolsDir: string;
}

export class ToolManager {
  private readonly storageDir: string;
  private readonly toolsDir: string;
  private installPromise: Promise<boolean> | undefined;

  constructor(globalStoragePath: string) {
    this.storageDir = globalStoragePath;
    this.toolsDir = path.join(globalStoragePath, 'tools');
  }

  /** Returns true if the tools directory exists and looks populated. */
  isInstalled(): boolean {
    const gccDir = path.join(this.toolsDir, 'arm-none-eabi-gcc', 'bin');
    return fs.existsSync(gccDir);
  }

  /**
   * Ensure tools are installed, downloading and extracting them if needed.
   * Shows VS Code progress notification during download/extraction.
   * Concurrent callers share a single in-progress install.
   */
  ensureInstalled(): Promise<boolean> {
    if (this.installPromise) {
      return this.installPromise;
    }
    if (this.isInstalled()) {
      return Promise.resolve(true);
    }
    this.installPromise = this._downloadAndInstall().finally(() => {
      this.installPromise = undefined;
    });
    return this.installPromise;
  }

  /** Return paths to all tools (undefined for binaries not yet present). */
  getToolPaths(): ToolPaths {
    const isWin = process.platform === 'win32';
    const exe = isWin ? '.exe' : '';
    const t = this.toolsDir;

    const resolve = (relPath: string): string | undefined => {
      const full = path.join(t, relPath);
      return fs.existsSync(full) ? full : undefined;
    };

    const pythonPath =
      isWin
        // python-build-standalone on Windows extracts as python/python/python.exe
        // (double-nested: tools/python/ → python/ sub-dir → python.exe)
        ? resolve(`python${path.sep}python${path.sep}python${exe}`)
        : resolve(`python${path.sep}bin${path.sep}python3`);

    return {
      gcc: resolve(`arm-none-eabi-gcc${path.sep}bin${path.sep}arm-none-eabi-gcc${exe}`),
      gpp: resolve(`arm-none-eabi-gcc${path.sep}bin${path.sep}arm-none-eabi-g++${exe}`),
      gdb: resolve(`arm-none-eabi-gcc${path.sep}bin${path.sep}arm-none-eabi-gdb${exe}`),
      objcopy: resolve(`arm-none-eabi-gcc${path.sep}bin${path.sep}arm-none-eabi-objcopy${exe}`),
      size: resolve(`arm-none-eabi-gcc${path.sep}bin${path.sep}arm-none-eabi-size${exe}`),
      cmake: resolve(`cmake${path.sep}bin${path.sep}cmake${exe}`),
      ninja: resolve(`ninja-build${path.sep}bin${path.sep}ninja${exe}`),
      python: pythonPath,
      gccBinDir: resolve(`arm-none-eabi-gcc${path.sep}bin`),
      toolsDir: this.toolsDir,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private async _downloadAndInstall(): Promise<boolean> {
    const platformKey = getPlatformKey();
    if (!platformKey) {
      vscode.window.showErrorMessage(
        `Embedded Build Tools: unsupported platform ${process.platform}/${process.arch}.`,
      );
      return false;
    }

    const artifactName = getArtifactName(platformKey);
    const downloadUrl = `${RELEASES_BASE}/${artifactName}`;

    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Embedded Build Tools',
        cancellable: false,
      },
      async (progress) => {
        try {
          // Ensure storage dir exists
          fs.mkdirSync(this.storageDir, { recursive: true });

          const archivePath = path.join(this.storageDir, artifactName);

          progress.report({ message: `Downloading ${artifactName} …` });
          let lastPercent = -1;
          let lastReportedMB = -1;
          await this._download(downloadUrl, archivePath, (downloaded, total) => {
            if (total) {
              const percent = Math.floor((downloaded / total) * 100);
              if (percent !== lastPercent) {
                lastPercent = percent;
                const downloadedMB = (downloaded / (1024 * 1024)).toFixed(1);
                const totalMB = (total / (1024 * 1024)).toFixed(1);
                progress.report({
                  message: `Downloading ${artifactName} … ${percent}% (${downloadedMB} / ${totalMB} MB)`,
                });
              }
            } else {
              const currentMB = Math.floor(downloaded / (1024 * 1024));
              if (currentMB !== lastReportedMB) {
                lastReportedMB = currentMB;
                progress.report({
                  message: `Downloading ${artifactName} … ${currentMB} MB`,
                });
              }
            }
          });

          progress.report({ message: 'Extracting tools …' });
          await this._extract(archivePath, this.storageDir, platformKey);

          // Clean up archive
          fs.rmSync(archivePath, { force: true });

          // macOS: remove Gatekeeper quarantine attribute so unsigned binaries run
          if (process.platform === 'darwin') {
            await this._removeQuarantine(this.toolsDir);
          }

          progress.report({ message: 'Done.' });
          vscode.window.showInformationMessage(
            'Embedded Build Tools installed successfully.',
          );
          return true;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(
            `Embedded Build Tools: installation failed — ${msg}`,
          );
          return false;
        }
      },
    );
  }

  /** Download a URL to a local file, following redirects. */
  private _download(
    url: string,
    dest: string,
    onProgress?: (downloaded: number, total: number | undefined) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const doRequest = (currentUrl: string) => {
        https
          .get(currentUrl, (res) => {
            if (
              res.statusCode &&
              res.statusCode >= 300 &&
              res.statusCode < 400 &&
              res.headers.location
            ) {
              // Follow redirect
              doRequest(res.headers.location);
              return;
            }
            if (res.statusCode !== 200) {
              reject(new Error(`HTTP ${res.statusCode} fetching ${currentUrl}`));
              return;
            }

            const contentLength = res.headers['content-length'];
            const totalBytes = contentLength ? parseInt(contentLength, 10) : undefined;
            let downloadedBytes = 0;

            const file = fs.createWriteStream(dest);

            res.on('data', (chunk: Buffer) => {
              downloadedBytes += chunk.length;
              if (onProgress) {
                onProgress(downloadedBytes, totalBytes);
              }
            });

            res.pipe(file);
            file.on('finish', () => file.close(() => resolve()));
            file.on('error', (e) => {
              fs.rmSync(dest, { force: true });
              reject(e);
            });
          })
          .on('error', reject);
      };
      doRequest(url);
    });
  }

  /** Extract a downloaded archive into destDir. */
  private _extract(
    archivePath: string,
    destDir: string,
    platformKey: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let cmd: string;
      let args: string[];

      if (platformKey.startsWith('win32')) {
        // Use PowerShell's Expand-Archive (available on Windows 10+).
        // The artifact zip does not have a top-level wrapper folder.
        const escapedSrc = archivePath.replace(/'/g, "''");
        const escapedDest = destDir.replace(/'/g, "''");
        cmd = 'powershell';
        args = [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          `Expand-Archive -Force -Path '${escapedSrc}' -DestinationPath '${escapedDest}'`,
        ];
      } else {
        // The artifact tar.gz does not have a top-level wrapper folder;
        // extract directly into destDir.
        cmd = 'tar';
        args = ['-xzf', archivePath, '-C', destDir];
      }

      const proc = child_process.spawn(cmd, args, { stdio: 'pipe' });
      let stderr = '';
      proc.stderr?.on('data', (d: Buffer) => (stderr += d.toString()));
      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Extraction exited with code ${code}: ${stderr}`));
        } else {
          resolve();
        }
      });
      proc.on('error', reject);
    });
  }

  /** Remove macOS Gatekeeper quarantine attribute from downloaded binaries. */
  private _removeQuarantine(dir: string): Promise<void> {
    return new Promise((resolve) => {
      const proc = child_process.spawn('xattr', ['-cr', dir], { stdio: 'pipe' });
      proc.on('close', () => resolve()); // non-fatal — ignore errors
      proc.on('error', () => resolve());
    });
  }
}
