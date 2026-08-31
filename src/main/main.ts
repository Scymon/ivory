import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { OpenVaultResult, VaultEntry } from '../shared/desktop-api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let vaultRoot: string | null = null;

async function scanDirectory(root: string, current = root): Promise<VaultEntry[]> {
  const dirents = await fs.readdir(current, { withFileTypes: true });
  const entries: VaultEntry[] = [];

  for (const dirent of dirents) {
    if (dirent.name === '.git' || dirent.name === 'node_modules') continue;

    const absolute = path.join(current, dirent.name);
    const relative = path.relative(root, absolute).split(path.sep).join('/');

    if (dirent.isDirectory()) {
      entries.push({
        name: dirent.name,
        path: relative,
        kind: 'folder',
        children: await scanDirectory(root, absolute)
      });
    } else if (dirent.isFile()) {
      entries.push({ name: dirent.name, path: relative, kind: 'file' });
    }
  }

  return entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function resolveVaultPath(relativePath: string): string {
  if (!vaultRoot) throw new Error('No vault is open.');
  const root = path.resolve(vaultRoot);
  const target = path.resolve(root, relativePath);
  const relative = path.relative(root, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Path escapes the open vault.');
  }
  return target;
}

async function createWindow(): Promise<void> {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#1e1e1e',
    title: 'Ivory',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  await win.loadFile(path.join(__dirname, 'index.html'));
}

ipcMain.handle('ivory:vault:choose', async (): Promise<OpenVaultResult | null> => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (result.canceled || !result.filePaths[0]) return null;

  vaultRoot = result.filePaths[0];
  return {
    root: vaultRoot,
    name: path.basename(vaultRoot),
    entries: await scanDirectory(vaultRoot)
  };
});

ipcMain.handle('ivory:file:read', async (_event, relativePath: string) => {
  return fs.readFile(resolveVaultPath(relativePath), 'utf8');
});

ipcMain.handle('ivory:file:write', async (_event, relativePath: string, content: string) => {
  await fs.writeFile(resolveVaultPath(relativePath), content, 'utf8');
});

app.whenReady().then(async () => {
  await createWindow();
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
