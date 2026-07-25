import * as pako from 'pako'

export function compressData(data: string): string {
  const compressed = pako.gzip(data)
  return btoa(String.fromCharCode(...compressed))
}

export function decompressData(data: string): string {
  const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
  return pako.ungzip(bytes, { to: 'string' })
}
