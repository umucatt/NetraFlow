export const JSON_INTEGRITY_ALGORITHM = 'SHA-256' as const;

const bytesToHex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

export const sha256Hex = async (text: string) => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('SHA-256 crypto is unavailable.');
  }

  const digest = await globalThis.crypto.subtle.digest(
    JSON_INTEGRITY_ALGORITHM,
    new TextEncoder().encode(text)
  );

  return bytesToHex(digest);
};
