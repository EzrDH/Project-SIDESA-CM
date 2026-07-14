import { sha384 } from '@noble/hashes/sha512';
import { concatBytes, utf8ToBytes } from '@noble/hashes/utils';

export function hash(data: Uint8Array): Uint8Array {
  return sha384(data);
}

export function hashUtf8(text: string): Uint8Array {
  return sha384(utf8ToBytes(text));
}

function lenPrefixed(b: Uint8Array): Uint8Array {
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, b.length, false); // big-endian length
  return concatBytes(len, b);
}

export function domainHash(domain: string, ...parts: Uint8Array[]): Uint8Array {
  const chunks: Uint8Array[] = [lenPrefixed(utf8ToBytes(domain))];
  for (const p of parts) chunks.push(lenPrefixed(p));
  return sha384(concatBytes(...chunks));
}
