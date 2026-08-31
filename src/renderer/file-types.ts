const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'bmp', 'ico'
]);

function extensionOf(path: string): string {
  const leaf = path.split('/').pop() ?? path;
  const index = leaf.lastIndexOf('.');
  return index >= 0 ? leaf.slice(index + 1).toLowerCase() : '';
}

export function isMarkdownFile(path: string): boolean {
  return extensionOf(path) === 'md';
}

export function isCanvasFile(path: string): boolean {
  return extensionOf(path) === 'canvas';
}

export function isImageFile(path: string): boolean {
  return IMAGE_EXTENSIONS.has(extensionOf(path));
}

export function isNativeExplorerFile(path: string): boolean {
  return isMarkdownFile(path) || isCanvasFile(path) || isImageFile(path);
}

export function nativeFileKind(path: string): 'markdown' | 'canvas' | 'image' | null {
  if (isMarkdownFile(path)) return 'markdown';
  if (isCanvasFile(path)) return 'canvas';
  if (isImageFile(path)) return 'image';
  return null;
}
