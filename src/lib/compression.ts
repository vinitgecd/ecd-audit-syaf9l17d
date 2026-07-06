export async function compressData(data: unknown): Promise<string> {
  const json = JSON.stringify(data)
  const blob = new Blob([json])
  const stream = blob.stream().pipeThrough(new CompressionStream('gzip'))
  const compressed = await new Response(stream).arrayBuffer()
  return arrayBufferToBase64(compressed)
}

export async function decompressData(base64: string): Promise<unknown> {
  const bytes = base64ToUint8Array(base64)
  const blob = new Blob([bytes])
  const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'))
  const text = await new Response(stream).text()
  return JSON.parse(text)
}

export async function compressToBase64(data: unknown): Promise<string> {
  return compressData(data)
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
    binary += String.fromCharCode.apply(null, Array.from(chunk))
  }
  return btoa(binary)
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
