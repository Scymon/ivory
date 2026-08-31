import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chokidar, { type FSWatcher } from 'chokidar';
import type { OpenVaultResult, SearchHit, VaultChange, VaultEntry, VaultSnapshot } from '../shared/desktop-api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let vaultRoot: string | null = null;
let vaultWatcher: FSWatcher | null = null;
let mainWindow: BrowserWindow | null = null;

function portablePath(value: string): string {
  return value.split(path.sep).join('/');
}

async function scanDirectory(root: string, current = root): Promise<VaultEntry[]> {
  const dirents = await fs.readdir(current, { withFileTypes: true });
  const entries: VaultEntry[] = [];

  for (const dirent of dirents) {
    if (dirent.name === '.git' || dirent.name === 'node_modules') continue;

    const absolute = path.join(current, dirent.name);
    const relative = portablePath(path.relative(root, absolute));

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
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Path escapes the open vault.');
  return target;
}

async function snapshot(): Promise<VaultSnapshot | null> {
  if (!vaultRoot) return null;
  return { root: vaultRoot, name: path.basename(vaultRoot), entries: await scanDirectory(vaultRoot) };
}

async function startWatcher(): Promise<void> {
  await vaultWatcher?.close();
  vaultWatcher = null;
  if (!vaultRoot) return;

  vaultWatcher = chokidar.watch(vaultRoot, {
    ignoreInitial: true,
    ignored: [/(^|[/\\])\.git([/\\]|$)/, /(^|[/\\])node_modules([/\\]|$)/],
    awaitWriteFinish: { stabilityThreshold: 180, pollInterval: 50 }
  });

  const emit = (type: VaultChange['type'], absolutePath: string) => {
    if (!vaultRoot || !mainWindow || mainWindow.isDestroyed()) return;
    const relative = portablePath(path.relative(vaultRoot, absolutePath));
    if (!relative || relative.startsWith('..')) return;
    mainWindow.webContents.send('ivory:vault:change', { type, path: relative } satisfies VaultChange);
  };

  vaultWatcher
    .on('add', (file) => emit('add', file))
    .on('change', (file) => emit('change', file))
    .on('unlink', (file) => emit('unlink', file))
    .on('addDir', (dir) => emit('addDir', dir))
    .on('unlinkDir', (dir) => emit('unlinkDir', dir));
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
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

  mainWindow.on('closed', () => { mainWindow = null; });
  await mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

ipcMain.handle('ivory:vault:choose', async (): Promise<OpenVaultResult | null> => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (result.canceled || !result.filePaths[0]) return null;
  vaultRoot = result.filePaths[0];
  await startWatcher();
  return snapshot();
});

ipcMain.handle('ivory:vault:snapshot', () => snapshot());
ipcMain.handle('ivory:file:read', async (_event, relativePath: string) => fs.readFile(resolveVaultPath(relativePath), 'utf8'));
ipcMain.handle('ivory:file:write', async (_event, relativePath: string, content: string) => fs.writeFile(resolveVaultPath(relativePath), content, 'utf8'));

ipcMain.handle('ivory:file:create-markdown', async (_event, relativePath: string) => {
  const normalized = relativePath.toLowerCase().endsWith('.md') ? relativePath : `${relativePath}.md`;
  const target = resolveVaultPath(normalized);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, '', { encoding: 'utf8', flag: 'wx' });
});

ipcMain.handle('ivory:file:create-folder', async (_event, relativePath: string) => {
  await fs.mkdir(resolveVaultPath(relativePath), { recursive: false });
});

ipcMain.handle('ivory:file:rename', async (_event, fromPath: string, toPath: string) => {
  await fs.rename(resolveVaultPath(fromPath), resolveVaultPath(toPath));
});

ipcMain.handle('ivory:file:delete', async (_event, relativePath: string) => {
  await fs.rm(resolveVaultPath(relativePath), { recursive: true, force: false });
});

ipcMain.handle('ivory:vault:search', async (_event, query: string): Promise<SearchHit[]> => {
  if (!vaultRoot || !query.trim()) return [];
  const needle = query.toLocaleLowerCase();
  const results: SearchHit[] = [];

  async function walk(entries: VaultEntry[]): Promise<void> {
    for (const entry of entries) {
      if (results.length >= 100) return;
      if (entry.kind === 'folder') {
        await walk(entry.children ?? []);
        continue;
      }
      if (!entry.path.toLowerCase().endsWith('.md')) continue;
      const content = await fs.readFile(resolveVaultPath(entry.path), 'utf8').catch(() => '');
      const lines = content.split(/\r?\n/);
      for (let index = 0; index < lines.length && results.length < 100; index += 1) {
        if (lines[index].toLocaleLowerCase().includes(needle)) {
          results.push({ path: entry.path, line: index + 1, preview: lines[index].trim().slice(0, 180) });
        }
      }
    }
  }

  await walk(await scanDirectory(vaultRoot));
  return results;
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

app.on('before-quit', () => { void vaultWatcher?.close(); });
