import { describe, expect, it } from 'vitest';
import { videoId } from './link';
import { parseLrc, parseSung, parseTime } from './lrc';
import { markWords } from './mark';
import { currentLine, currentWord } from './timing';

const ID = 'abcDEF123_-';

describe('videoId', () => {
  it.each([
    `https://www.youtube.com/watch?v=${ID}&t=5`,
    `https://youtu.be/${ID}?si=x`,
    `https://music.youtube.com/watch?v=${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
  ])('reads %s', (link) => expect(videoId(link)).toBe(ID));

  it.each([
    '',
    'nonsense',
    `https://youtu.be/short`,
    `https://youtu.be/${ID}x`,
    `https://evil.com/watch?v=${ID}`,
    `javascript:alert(1)`,
    `https://www.youtube.com/watch?v=${ID}!`,
    `https://youtube.com.evil.com/watch?v=${ID}`,
    `https://www.youtube.com@evil.com/watch?v=${ID}`,
    `data:text/html,https://youtu.be/${ID}`,
  ])('refuses %j', (link) => expect(videoId(link)).toBeNull());
});

describe('parseTime', () => {
  it('reads minutes and hours', () => {
    expect(parseTime('1:07')).toBe(67);
    expect(parseTime('01:07.5')).toBe(67.5);
    expect(parseTime('1:02:03.5')).toBe(3723.5);
  });
  it('refuses bare seconds and junk', () => {
    for (const t of ['107', '1:7', '1:75', 'a:bc', '']) expect(parseTime(t)).toBeNull();
  });
});

describe('parseLrc', () => {
  it('reads stamps, repeats and skips tags and empty lines', () => {
    const lrc = '[ar:Nobody]\n[00:12.50] سلام\n[00:01.00][00:30.00]مرحبا بك\n[00:40.00]\n';
    expect(parseLrc(lrc)).toEqual([
      { time: 1, text: 'مرحبا بك' },
      { time: 12.5, text: 'سلام' },
      { time: 30, text: 'مرحبا بك' },
    ]);
  });
});

describe('parseSung', () => {
  const row = (start: string, end: string) => ({ start, end, text: 'x' });
  it('accepts lines in order', () => {
    expect(parseSung([row('0:01.0', '0:03.0'), row('0:03.0', '0:05.5')], 60)).toHaveLength(2);
  });
  it('rejects backwards, past the end, and unreadable times', () => {
    expect(parseSung([row('0:10.0', '0:12.0'), row('0:05.0', '0:07.0')], 60)).toBeNull();
    // A bad read of the video's length fails closed.
    expect(parseSung([row('0:01.0', '0:03.0')], NaN)).toBeNull();
    expect(parseSung([row('0:10.0', '0:08.0')], 60)).toBeNull();
    expect(parseSung([row('0:50.0', '1:10.0')], 60)).toBeNull();
    expect(parseSung([row('107', '0:12.0')], 200)).toBeNull();
  });
});

describe('timing', () => {
  const starts = [2, 10, 20];
  it('finds the line, with the nudge', () => {
    expect(currentLine(starts, 1)).toBe(-1);
    expect(currentLine(starts, 10)).toBe(1);
    expect(currentLine(starts, 19.6)).toBe(1);
    expect(currentLine(starts, 19.6, 0.5)).toBe(2);
    expect(currentLine([], 5)).toBe(-1);
  });
  it('spreads the line over its words by length', () => {
    const w = ['ab', 'cdefgh']; // 2 of 8 letters: first quarter
    expect(currentWord(w, 0, 8, 0)).toBe(0);
    expect(currentWord(w, 0, 8, 1.9)).toBe(0);
    expect(currentWord(w, 0, 8, 2)).toBe(1);
    expect(currentWord(w, 0, 8, 99)).toBe(1);
    expect(currentWord([], 0, 8, 1)).toBe(-1);
  });
});

describe('markWords', () => {
  it('marks by normalized spelling: marks, ة/ه, alef forms', () => {
    const known = new Set(['كَتَاب']);
    const met = new Set(['مدرسه', 'أمل']);
    const got = markWords('كتاب، مدرسة امل جديد !', known, met);
    expect(got.map((g) => g.status)).toEqual(['known', 'met', 'met', 'new']);
    expect(got[0]?.word).toBe('كتاب،');
  });
});
