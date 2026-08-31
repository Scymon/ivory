export interface VaultEntry {
  name: string;
  path: string;
  kind: 'file' | 'folder';
  children?: VaultEntry[];
}

export interface OpenVaultResult {
  root: string;
  name: string;
  entries: VaultEntry[];
}

export interface VaultSnapshot {
  root: string;
  name: string;
  entries: VaultEntry[];
}

export interface VaultChange {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  path: string;
}

export interface SearchHit {
  path: string;
  line: number;
  preview: string;
}

export interface IvoryDesktopApi {
  chooseVault(): Promise<OpenVaultResult | null>;
  getVaultSnapshot(): Promise<VaultSnapshot | null>;
  readTextFile(relativePath: string): Promise<string>;
  writeTextFile(relativePath: string, content: string): Promise<void>;
  createMarkdown(relativePath: string): Promise<void>;
  createFolder(relativePath: string): Promise<void>;
  renameResource(fromPath: string, toPath: string): Promise<void>;
  deleteResource(relativePath: string): Promise<void>;
  searchVault(query: string): Promise<SearchHit[]>;
  onVaultChange(callback: (change: VaultChange) => void): () => void;
}

declare global {
  interface Window {
    ivory: IvoryDesktopApi;
  }
}
