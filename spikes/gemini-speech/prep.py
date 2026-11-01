"""Pick a fixed sample of clips from the Lingualism deck for the Gemini speech spike.

Usage: python3 -I prep.py   (needs the `zstd` CLI)
Writes clips/ (git-ignored audio) and manifest.json (text + metadata).
"""
import json, os, random, re, shutil, sqlite3, subprocess, tempfile, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
APKG = os.path.join(HERE, '..', '..', 'sources', 'arabic', 'lingualism-palestinian-vocabulary', 'lingualism-pcav.apkg')
HARD = set('حهعءأإؤئقخغصضطظ')

def varint(b, i):
    v = s = 0
    while True:
        c = b[i]; i += 1; v |= (c & 0x7f) << s; s += 7
        if c < 0x80: return v, i

def media_names(b):
    """The media map is protobuf: repeated entry {1: name, ...}. A file's number is its entry position.
    Parse every entry (the deck also holds a font), or the numbering shifts after it."""
    names, i = [], 0
    while i < len(b):
        assert b[i] == 0x0a; ln, i = varint(b, i + 1); entry = b[i:i + ln]; i += ln
        assert entry[0] == 0x0a; nl, j = varint(entry, 1); names.append(entry[j:j + nl].decode())
    return names

def main():
    tmp = tempfile.mkdtemp()
    with zipfile.ZipFile(APKG) as z:
        z.extractall(tmp)
    subprocess.run(['zstd', '-q', '-d', '-f', os.path.join(tmp, 'collection.anki21b'), '-o', os.path.join(tmp, 'col.sqlite')], check=True)
    subprocess.run(['zstd', '-q', '-d', '-f', os.path.join(tmp, 'media'), '-o', os.path.join(tmp, 'media.bin')], check=True)
    names = media_names(open(os.path.join(tmp, 'media.bin'), 'rb').read())
    index = {n: str(i) for i, n in enumerate(names)}
    db = sqlite3.connect(os.path.join(tmp, 'col.sqlite'))
    db.create_collation('unicase', lambda a, b: (a.lower() > b.lower()) - (a.lower() < b.lower()))
    notes = []
    for flds, tags in db.execute('select flds, tags from notes'):
        order, arabic, translit, english, audio, section = flds.split('\x1f')[:6]
        m = re.search(r'\[sound:(.+?)\]', audio)
        if not m or m.group(1) not in index:
            continue
        level = next((t for t in tags.split() if t in ('A1', 'A2', 'B1', 'B2')), '')
        notes.append(dict(id=order, arabic=arabic, translit=translit, english=english, section=section, level=level, file=m.group(1)))
    rnd = random.Random(42)
    sentences = [n for n in notes if re.search(r'[.?!]$', n['arabic'].strip()) and len(n['arabic'].split()) >= 3]
    words = [n for n in notes if len(n['arabic'].split()) == 1 and HARD & set(n['arabic'])]
    sample = [dict(n, kind='sentence') for n in rnd.sample(sentences, 30)] + [dict(n, kind='word') for n in rnd.sample(words, 20)]
    clips = os.path.join(HERE, 'clips'); os.makedirs(clips, exist_ok=True)
    for n in sample:
        src, dst = os.path.join(tmp, index[n['file']]), os.path.join(clips, n['file'])
        if open(src, 'rb').read(4) == b'\x28\xb5\x2f\xfd':  # anki21b also zstd-compresses each media file
            subprocess.run(['zstd', '-q', '-d', '-f', src, '-o', dst], check=True)
        else:
            shutil.copy(src, dst)
    json.dump(sample, open(os.path.join(HERE, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
    shutil.rmtree(tmp)
    print(f'{len(sample)} clips -> {clips}')

main()
