import { contextBridge, ipcRenderer } from 'electron';
import type { IvoryDesktopApi } from '../shared/desktop-api.js';

const api: IvoryDesktopApi = {
  chooseVault: () => ipcRenderer.invoke('ivory:vault:choose'),
  readTextFile: (relativePath) => ipcRenderer.invoke('ivory:file:read', relativePath),
  writeTextFile: (relativePath, content) => ipcRenderer.invoke('ivory:file:write', relativePath, content)
};

contextBridge.exposeInMainWorld('ivory', api);
