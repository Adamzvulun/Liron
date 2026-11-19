// Reads an Anki package (.apkg) in the current format (Anki 2.1.50+): a zip holding a
// zstd-compressed SQLite collection, a zstd-compressed protobuf media map, and media files
// named 0, 1, 2… (each zstd-compressed). Uses only Node's built-ins (zlib zstd, node:sqlite).
import { readFileSync } from 'node:fs';
import { inflateRawSync, zstdDecompressSync } from 'node:zlib';

/** Reads every entry of a zip file into memory. Supports stored and deflated entries. */
export function readZip(buf: Buffer): Map<string, Buffer> {
  // The end-of-central-directory record sits in the last 64 KB.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Not a zip file');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = new Map<string, Buffer>();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Bad zip central directory');
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const dataStart = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(dataStart, dataStart + size);
    if (method === 0) entries.set(name, raw);
    else if (method === 8) entries.set(name, inflateRawSync(raw));
    else throw new Error(`Zip entry ${name}: unsupported compression ${method}`);
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/** Reads a protobuf varint at `pos`; returns the value and the next position. */
function varint(buf: Buffer, pos: number): [number, number] {
  let value = 0;
  let shift = 0;
  for (;;) {
    const b = buf[pos++];
    if (b === undefined) throw new Error('Truncated protobuf');
    value += (b & 0x7f) * 2 ** shift;
    if (b < 0x80) return [value, pos];
    shift += 7;
  }
}

/**
 * Anki's media map: `MediaEntries { repeated MediaEntry entries = 1 }`, where
 * `MediaEntry { string name = 1; uint32 size = 2; bytes sha1 = 3; }`. Entry i is zip file "i".
 */
export function readMediaMap(buf: Buffer): string[] {
  const names: string[] = [];
  let pos = 0;
  while (pos < buf.length) {
    const [key, afterKey] = varint(buf, pos);
    const [len, start] = varint(buf, afterKey);
    if (key !== 0x0a) throw new Error(`Unexpected media map field ${key}`);
    const entry = buf.subarray(start, start + len);
    let name = '';
    let q = 0;
    while (q < entry.length) {
      const [k, afterK] = varint(entry, q);
      const wire = k & 7;
      if (wire === 0) {
        q = varint(entry, afterK)[1];
      } else if (wire === 2) {
        const [l, s] = varint(entry, afterK);
        if (k >> 3 === 1) name = entry.toString('utf8', s, s + l);
        q = s + l;
      } else {
        throw new Error(`Unexpected wire type ${wire} in media map`);
      }
    }
    names.push(name);
    pos = start + len;
  }
  return names;
}

export interface AnkiNote {
  fields: string[];
  tags: string[];
}

export interface AnkiPackage {
  notes: AnkiNote[];
  /** Media file name → its bytes (decompressed). */
  media: Map<string, Buffer>;
}

/** Reads notes and media from an .apkg file. */
export async function readApkg(path: string): Promise<AnkiPackage> {
  const zip = readZip(readFileSync(path));
  const collection = zip.get('collection.anki21b');
  const mediaMap = zip.get('media');
  if (!collection || !mediaMap) throw new Error('Not a current-format Anki package (2.1.50+)');

  // node:sqlite needs a file; write the decompressed collection to a temp file.
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { DatabaseSync } = await import('node:sqlite');
  const dir = mkdtempSync(join(tmpdir(), 'apkg-'));
  const file = join(dir, 'collection.sqlite');
  // The try starts here: a deck that won't decompress or open leaves no copy behind.
  let db: InstanceType<typeof DatabaseSync> | undefined;
  try {
    writeFileSync(file, zstdDecompressSync(collection));
    db = new DatabaseSync(file, { readOnly: true });
    const rows = db.prepare('select flds, tags from notes order by id').all() as {
      flds: string;
      tags: string;
    }[];
    const notes = rows.map((r) => ({
      fields: r.flds.split('\x1f'),
      tags: r.tags.trim().split(/\s+/).filter(Boolean),
    }));
    const media = new Map<string, Buffer>();
    readMediaMap(zstdDecompressSync(mediaMap)).forEach((name, i) => {
      const data = zip.get(String(i));
      if (data) media.set(name, zstdDecompressSync(data));
    });
    return { notes, media };
  } finally {
    db?.close();
    rmSync(dir, { recursive: true, force: true });
  }
}
