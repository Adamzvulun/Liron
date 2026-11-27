import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import exceptions from '../content/arabic/latin-exceptions.json' with { type: 'json' };
import { agrees } from './support/latinAgree.ts';

// Our own Arabic agrees with its Latin (#515): consonant by consonant, by sound class, with the
// real sound changes allowed. Needs no deck, so CI runs it. How to run it: content/README.md.

describe('the sound rules', () => {
  const ok = (arabic: string, latin: string) =>
    expect(agrees(arabic, latin), `${arabic} / ${latin}`).toBe(true);
  const no = (arabic: string, latin: string) =>
    expect(agrees(arabic, latin), `${arabic} / ${latin}`).toBe(false);

  it('match plain letters and ignore vowels, spaces and punctuation', () => {
    ok('كتاب', 'ktāb');
    ok('أنا سليم.', 'ána salīm.');
    no('كتاب', 'ktām');
    no('كتاب', 'kt'); // a letter missing
    no('كتاب', 'ktābk'); // an extra consonant
  });
  it('keep ح ع غ خ ص ض ط ظ apart from their light twins', () => {
    ok('حمص', 'ɧummuʂ');
    no('حمص', 'hummus');
    no('طالب', 'tālib');
    ok('طالب', 'ʈālib');
    no('خبز', 'ɣubz');
  });
  it('n -> m before b (jamb)', () => {
    ok('جنب', 'jamb');
    ok('جنب', 'janb');
    no('جنم', 'jamb');
  });
  it('drop the l of il- before a sun letter, in il-, bi-l- and ha-l-', () => {
    ok('الشمس', 'iššams');
    ok('الشمس', 'ilšams');
    ok('بالطيارة', 'bi-ʈʈayyāra');
    ok('هالسنة', 'ha-ssána');
    ok('الجاج', 'ijjāj'); // ج assimilates in Gaza
    ok('القمر', 'ilgámar'); // a moon letter keeps its l
    no('القمر', 'igámar');
  });
  it('allow ث as t or s, ذ as d or z, ق as g, ʔ or q', () => {
    ok('ثلاثة', 'talāta');
    ok('ثلاثة', 'salāsa');
    ok('ثلاثة', 'ŧalāŧa');
    ok('ذهب', 'dáhab');
    ok('ذهب', 'záhab');
    ok('قلب', 'galb');
    ok('قلب', 'ʔalb');
    ok('قلب', "'alb");
    ok('موسيقى', 'musīqa');
    no('ثلاثة', 'xalāxa');
  });
  it('say the tanwin as -an', () => {
    ok('شكراً', 'šúkran');
    no('شكراً', 'šúkra');
  });
  it('say ة as a, or -it before an ending', () => {
    ok('قهوة', 'gáhwa');
    ok('قهوتك', 'gahwitak');
    no('قهوة', 'gáhwab');
  });
  it('allow the other Levantine changes', () => {
    ok('اتجوز', 'idjáwwaz'); // ت is voiced before ج
    ok('اتطلع', 'iʈʈálla3'); // ت becomes ط beside ط
    ok('نظارات', 'naɖɖārāt'); // ظ said ɖ
    ok('متضايق', 'miɖɖāyag'); // ت beside ض
    ok('اتصل', 'iʂʂál');
    no('متضايق', 'middāyag');
    ok('زائد', 'zāyid'); // ئ as y
    ok('اسمه', 'ísmu'); // a final -h of his is silent
    ok('الله', 'alla');
    ok('لا', 'laʔ');
    ok('على البحر', '3a -lbáɧar');
    ok('على', '3ála');
    ok('للامتحان', 'la-lʔimtiɧān');
  });
  it('allow the loan sounds p, v and g', () => {
    ok('فيزا', 'vīza');
    ok('راب', 'rāp');
    ok('غوان', 'gōn');
    ok('سيجار', 'sīgār');
    no('فيزا', 'tīza');
  });
  it('count a doubled consonant once, but not a missing one', () => {
    ok('كلّ', 'kull');
    ok('أنت', 'ínta');
    no('كلب', 'kb');
  });
});

type Line = { id: string; arabic: string; latin: string };

/** Every line with an Arabic and a Latin in content/arabic: own sentences, tales, the finale. Grammar, phrases and the guide hold no pair (their Arabic is the deck's, by id). */
const lines = (): Line[] => {
  const dir = new URL('../content/arabic/', import.meta.url);
  const out: Line[] = [];
  const walk = (o: unknown, id: string) => {
    if (Array.isArray(o)) o.forEach((x, i) => walk(x, `${id}#${i}`));
    else if (o && typeof o === 'object') {
      const r = o as Record<string, unknown>;
      if (typeof r.arabic === 'string' && typeof r.latin === 'string')
        out.push({ id, arabic: r.arabic, latin: r.latin });
      for (const v of Object.values(r)) walk(v, typeof r.id === 'string' ? r.id : id);
    }
  };
  for (const f of readdirSync(dir))
    if (f.endsWith('.json')) walk(JSON.parse(readFileSync(new URL(f, dir), 'utf8')), f);
  return out;
};

describe('our own Arabic and Latin', () => {
  const all = lines();
  const listed = Object.fromEntries(exceptions.items.map((i) => [i.data.line, i.data.reason]));

  it('covers every own sentence, tale line and finale name', () => {
    expect(all.length).toBeGreaterThan(3500);
  });
  it('agree, or the line is on the exceptions list with a reason', () => {
    const bad = all.filter((l) => !agrees(l.arabic, l.latin) && !listed[l.id]);
    expect(bad.map((l) => `${l.id}: ${l.arabic} / ${l.latin}`)).toEqual([]);
  });
  it('lists only lines that exist', () => {
    const ids = new Set(all.map((l) => l.id));
    expect(Object.keys(listed).filter((id) => !ids.has(id))).toEqual([]);
  });
  it('keep the exceptions list honest: every entry has a reason and still disagrees', () => {
    const disagree = new Set(all.filter((l) => !agrees(l.arabic, l.latin)).map((l) => l.id));
    for (const [id, reason] of Object.entries(listed)) {
      expect(reason.length, id).toBeGreaterThan(10);
      expect(disagree.has(id), `${id} agrees now: remove it from latin-exceptions.json`).toBe(true);
    }
  });
});
