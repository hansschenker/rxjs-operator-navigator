import generated from './data/operators.generated.json';
import { CLASSIFICATION, type Classification } from './data/classification';
import { fateOf, splitName, type Card, type Decides, type Fate, type Kind, type NameParts, type Strategy } from './model';

export interface Param {
  name: string;
  type: string | null;
  optional: boolean;
  rest: boolean;
  default: string | null;
}

export interface Signature {
  typeParameters: string[];
  params: Param[];
  returnType: string | null;
  text: string;
  deprecated: boolean;
}

export interface Operator extends Classification {
  name: string;
  file: string;
  fate: Fate;
  parts: NameParts;
  deprecated: boolean;
  aliasOf?: string;
  signatures: Signature[];
}

interface GeneratedOperator {
  name: string;
  file: string;
  deprecated: boolean;
  signatures: Signature[];
}

interface Generated {
  rxjsVersion: string;
  operators: GeneratedOperator[];
  aliases: { name: string; aliasOf: string; file: string; deprecated: boolean }[];
}

const data = generated as Generated;
export const RXJS_VERSION = data.rxjsVersion;

function build(): Operator[] {
  const byName = new Map<string, Operator>();
  for (const g of data.operators) {
    const cls = CLASSIFICATION[g.name];
    if (!cls) continue; // reported by the test
    byName.set(g.name, { ...cls, ...g, fate: fateOf(cls.kind), parts: splitName(g.name) });
  }
  const aliases: Operator[] = data.aliases.flatMap((a) => {
    const target = byName.get(a.aliasOf);
    if (!target) return [];
    return [{ ...target, name: a.name, file: a.file, deprecated: true, aliasOf: a.aliasOf, parts: splitName(a.name), note: `Deprecated alias of ${a.aliasOf}.` }];
  });
  return [...byName.values(), ...aliases].sort((a, b) => a.name.localeCompare(b.name));
}

export const OPERATORS: Operator[] = build();

export interface Filter {
  fate?: Fate;
  kind?: Kind;
  decides?: Decides;
  card?: Card;
  strategy?: Strategy;
  query: string;
  showDeprecated: boolean;
}

export type FacetKey = 'fate' | 'kind' | 'decides' | 'card' | 'strategy';

export const EMPTY_FILTER: Filter = { query: '', showDeprecated: false };

function matchesQuery(op: Operator, q: string): boolean {
  if (!q) return true;
  const s = q.toLowerCase();
  return op.name.toLowerCase().includes(s) || op.does.toLowerCase().includes(s);
}

export function matches(op: Operator, f: Filter, ignore?: FacetKey): boolean {
  if (!f.showDeprecated && op.deprecated) return false;
  if (!matchesQuery(op, f.query.trim())) return false;
  if (ignore !== 'fate' && f.fate && op.fate !== f.fate) return false;
  if (ignore !== 'kind' && f.kind && op.kind !== f.kind) return false;
  if (ignore !== 'decides' && f.decides && op.decides !== f.decides) return false;
  if (ignore !== 'card' && f.card && op.card !== f.card) return false;
  if (ignore !== 'strategy' && f.strategy && op.strategy !== f.strategy) return false;
  return true;
}

export function filterOperators(ops: Operator[], f: Filter): Operator[] {
  return ops.filter((op) => matches(op, f));
}

/** Count of operators that would remain if `key` were set to `value`, keeping all other answers. */
export function facetCount(ops: Operator[], f: Filter, key: FacetKey, value: string): number {
  // Choosing a fate clears the kind, so fate counts ignore the current kind.
  const base = key === 'fate' ? { ...f, kind: undefined } : f;
  return ops.filter((op) => matches(op, base, key) && (op as unknown as Record<string, unknown>)[key] === value).length;
}

/** Operators that share the verb or the suffix: the way to learn the name grammar. */
export function related(ops: Operator[], op: Operator): { sameVerb: Operator[]; sameSuffix: Operator[]; sameStrategy: Operator[] } {
  const others = ops.filter((o) => o.name !== op.name && !o.aliasOf);
  return {
    sameVerb: op.parts.suffix || others.some((o) => o.parts.verb === op.parts.verb) ? others.filter((o) => o.parts.verb === op.parts.verb) : [],
    sameSuffix: op.parts.suffix ? others.filter((o) => o.parts.suffix === op.parts.suffix) : [],
    sameStrategy: op.strategy ? others.filter((o) => o.strategy === op.strategy && o.kind === op.kind) : [],
  };
}
