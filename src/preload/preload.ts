import { contextBridge, ipcRenderer } from 'electron';
import type { IvoryDesktopApi, VaultChange } from '../shared/desktop-api.js';

const api: IvoryDesktopApi = {
  chooseVault: () => ipcRenderer.invoke('ivory:vault:choose'),
  getVaultSnapshot: () => ipcRenderer.invoke('ivory:vault:snapshot'),
  readTextFile: (relativePath) => ipcRenderer.invoke('ivory:file:read', relativePath),
  writeTextFile: (relativePath, content) => ipcRenderer.invoke('ivory:file:write', relativePath, content),
  createMarkdown: (relativePath) => ipcRenderer.invoke('ivory:file:create-markdown', relativePath),
  createFolder: (relativePath) => ipcRenderer.invoke('ivory:file:create-folder', relativePath),
  renameResource: (fromPath, toPath) => ipcRenderer.invoke('ivory:file:rename', fromPath, toPath),
  deleteResource: (relativePath) => ipcRenderer.invoke('ivory:file:delete', relativePath),
  searchVault: (query) => ipcRenderer.invoke('ivory:vault:search', query),
  getAssetUrl: (relativePath) => ipcRenderer.invoke('ivory:file:asset-url', relativePath),
  windowControl: (action) => ipcRenderer.invoke('ivory:window:control', action),
  onVaultChange: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, change: VaultChange) => callback(change);
    ipcRenderer.on('ivory:vault:change', listener);
    return () => ipcRenderer.removeListener('ivory:vault:change', listener);
  }
};

contextBridge.exposeInMainWorld('ivory', api);
