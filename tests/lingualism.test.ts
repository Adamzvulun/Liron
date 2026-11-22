import { existsSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { readMediaMap, readZip } from '../scripts/content/apkg.ts';
import { buildLingualism, cleanField, LINGUALISM_APKG } from '../scripts/content/lingualism.ts';
import { checkPack } from '../src/core/content/schema.ts';

describe('zip and media-map readers', () => {
  /** A one-entry zip, stored or deflated, built by hand. */
  function zip(name: string, body: Buffer, deflate: boolean): Buffer {
    const data = deflate ? deflateRawSync(body) : body;
    const n = Buffer.from(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(deflate ? 8 : 0, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(body.length, 22);
    local.writeUInt16LE(n.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(deflate ? 8 : 0, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(body.length, 24);
    central.writeUInt16LE(n.length, 28);
    central.writeUInt32LE(0, 42);
    const cdStart = local.length + n.length + data.length;
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(1, 8);
    end.writeUInt16LE(1, 10);
    end.writeUInt32LE(central.length + n.length, 12);
    end.writeUInt32LE(cdStart, 16);
    return Buffer.concat([local, n, data, central, n, end]);
  }

  it('reads stored and deflated entries', () => {
    const body = Buffer.from('hello hello hello');
    expect(readZip(zip('a.txt', body, false)).get('a.txt')).toEqual(body);
    expect(readZip(zip('b.txt', body, true)).get('b.txt')).toEqual(body);
    expect(() => readZip(Buffer.from('nope'))).toThrow(/Not a zip/);
  });

  it('reads media names in order', () => {
    const entry = (name: string) => {
      const n = Buffer.from(name);
      const inner = Buffer.concat([Buffer.from([0x0a, n.length]), n, Buffer.from([0x10, 0x05])]);
      return Buffer.concat([Buffer.from([0x0a, inner.length]), inner]);
    };
    expect(readMediaMap(Buffer.concat([entry('a.mp3'), entry('b.mp3')]))).toEqual([
      'a.mp3',
      'b.mp3',
    ]);
  });
});

describe('cleanField', () => {
  it('turns Anki HTML into plain text', () => {
    expect(cleanField('05 The Human Body &amp; Describing\nPeople')).toBe(
      '05 The Human Body & Describing People',
    );
    expect(cleanField('<b>a</b><br>b&#39;s &#x41;')).toBe("a b's A");
  });
});

// The deck is never in git (ADR 0054), so this runs only where someone has put their copy in
// sources/: on Adam's machine, or a session he sent it to. CI skips it.
describe('the Lingualism deck', () => {
  it.skipIf(!existsSync(LINGUALISM_APKG))(
    'becomes a valid private pack: 4,823 items in 57 sections, each with its audio',
    async () => {
      const { pack, media } = await buildLingualism();
      expect(checkPack(pack, { public: false })).toEqual([]);
      expect(pack.items).toHaveLength(4823);
      expect(pack.lessons).toHaveLength(57);
      expect(media.size).toBe(4823);
      expect(pack.items[2]).toEqual({
        id: 'pcav:0003',
        subject: 'arabic',
        type: 'vocab',
        data: {
          order: 3,
          arabic: 'أنا عايِش في غزّة.',
          pronunciation: 'ána 3āyiš fi ɣázza.',
          english: 'I live in Gaza.',
          section: 1,
        },
        media: [{ kind: 'audio', store: 'private', path: 'lingualism-pcav/pcav01-3.mp3' }],
        tags: ['A1', 'section:01'],
      });
      expect(pack.lessons[0]).toMatchObject({ id: 'pcav-section:01', title: 'Life and Death' });
      expect(pack.lessons[4]?.title).toBe('The Human Body & Describing People');
      // Every audio file is a real MP3 (ID3 tag or MPEG frame sync).
      for (const file of media.values()) {
        expect(file[0] === 0x49 || file[0] === 0xff).toBe(true);
      }
      const levels = pack.items.map((i) => i.tags[0]);
      expect(levels.filter((l) => l === 'A1')).toHaveLength(1394);
    },
  );
});
