export type IvoryFileType = 'markdown' | 'canvas' | 'image' | null;

const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'bmp', 'ico'
]);

function extensionOf(path: string): string {
  const leaf = path.split('/').pop() ?? path;
  const index = leaf.lastIndexOf('.');
  return index >= 0 ? leaf.slice(index + 1).toLowerCase() : '';
}

export function getFileType(path: string): IvoryFileType {
  const extension = extensionOf(path);
  if (extension === 'md') return 'markdown';
  if (extension === 'canvas') return 'canvas';
  if (IMAGE_EXTENSIONS.has(extension)) return 'image';
  return null;
}

export function isMarkdownFile(path: string): boolean {
  return getFileType(path) === 'markdown';
}

export function isCanvasFile(path: string): boolean {
  return getFileType(path) === 'canvas';
}

export function isImageFile(path: string): boolean {
  return getFileType(path) === 'image';
}

export function isNativeExplorerFile(path: string): boolean {
  return getFileType(path) !== null;
}

// Backwards-compatible alias while older modules are migrated to getFileType().
export const nativeFileKind = getFileType;
