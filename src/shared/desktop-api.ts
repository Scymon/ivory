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

export interface IvoryDesktopApi {
  chooseVault(): Promise<OpenVaultResult | null>;
  readTextFile(relativePath: string): Promise<string>;
  writeTextFile(relativePath: string, content: string): Promise<void>;
}

declare global {
  interface Window {
    ivory: IvoryDesktopApi;
  }
}
