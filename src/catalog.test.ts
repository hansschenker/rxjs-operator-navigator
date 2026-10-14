import { describe, expect, it } from 'vitest';
import generated from './data/operators.generated.json';
import { CLASSIFICATION } from './data/classification';
import { EMPTY_FILTER, OPERATORS, facetCount, filterOperators, related } from './catalog';
import { CARDS, DECIDES, KINDS, STRATEGIES, splitName } from './model';

describe('classification', () => {
  it('classifies every operator extracted from the RxJS source', () => {
    const missing = generated.operators.map((o) => o.name).filter((n) => !CLASSIFICATION[n]);
    expect(missing).toEqual([]);
  });

  it('has no classification for operators that do not exist', () => {
    const names = new Set(generated.operators.map((o) => o.name));
    expect(Object.keys(CLASSIFICATION).filter((n) => !names.has(n))).toEqual([]);
  });

  it('uses only known facet values', () => {
    const kinds = new Set(KINDS.map((k) => k.key));
    const decides = new Set(DECIDES.map((d) => d.key));
    const cards = new Set(CARDS.map((c) => c.key));
    const strategies = new Set(STRATEGIES.map((s) => s.key));
    for (const [name, c] of Object.entries(CLASSIFICATION)) {
      expect(kinds.has(c.kind), `${name}.kind`).toBe(true);
      expect(decides.has(c.decides), `${name}.decides`).toBe(true);
      expect(cards.has(c.card), `${name}.card`).toBe(true);
      if (c.strategy) expect(strategies.has(c.strategy), `${name}.strategy`).toBe(true);
    }
  });

  it('gives every flattening operator a strategy', () => {
    for (const op of OPERATORS.filter((o) => o.kind === 'unpack' || o.kind === 'combine')) {
      expect(op.strategy, op.name).toBeDefined();
    }
  });
});

describe('name grammar', () => {
  it('splits verb and suffix', () => {
    expect(splitName('switchMap')).toEqual({ verb: 'switch', suffix: 'Map' });
    expect(splitName('concatMapTo')).toEqual({ verb: 'concat', suffix: 'MapTo' });
    expect(splitName('combineLatestAll')).toEqual({ verb: 'combineLatest', suffix: 'All' });
    expect(splitName('bufferTime')).toEqual({ verb: 'buffer', suffix: 'Time' });
    expect(splitName('take')).toEqual({ verb: 'take', suffix: '' });
    expect(splitName('map')).toEqual({ verb: 'map', suffix: '' });
  });

  it('finds the flattening siblings of switchMap by suffix', () => {
    const op = OPERATORS.find((o) => o.name === 'switchMap')!;
    const names = related(OPERATORS, op).sameSuffix.map((o) => o.name);
    expect(names).toEqual(expect.arrayContaining(['mergeMap', 'concatMap', 'exhaustMap']));
  });
});

describe('navigation', () => {
  it('hides deprecated operators by default', () => {
    const visible = filterOperators(OPERATORS, EMPTY_FILTER);
    expect(visible.some((o) => o.name === 'pluck')).toBe(false);
    expect(visible.some((o) => o.name === 'map')).toBe(true);
  });

  it('answers "collect into arrays every 500 ms" with bufferTime', () => {
    const result = filterOperators(OPERATORS, { ...EMPTY_FILTER, kind: 'bundle', decides: 'clock' });
    expect(result.map((o) => o.name)).toEqual(['bufferTime']);
  });

  it('answers "new request per keystroke, cancel the previous" with switchMap', () => {
    const result = filterOperators(OPERATORS, { ...EMPTY_FILTER, kind: 'unpack', decides: 'valueTime', strategy: 'switch' });
    expect(result.map((o) => o.name)).toEqual(['switchMap']);
  });

  it('counts what each answer would leave', () => {
    const f = { ...EMPTY_FILTER, kind: 'select' as const };
    expect(facetCount(OPERATORS, f, 'decides', 'clock')).toBe(4);
  });
});
