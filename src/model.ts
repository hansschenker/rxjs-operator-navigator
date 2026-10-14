// The pattern model: four questions that place any RxJS operator.
//
// Q1  kind      What happens to the packages?
// Q2  decides   What decides?
// Q3  card      How many come out? (Cω cardinality)
// Q4  strategy  When several streams meet: which strategy?
//
// A package is one value on the stream. The operator cannot open it (T is a
// type parameter); only callbacks you pass in can.

export type Kind =
  | 'select'
  | 'retime'
  | 'add'
  | 'repeat'
  | 'share'
  | 'observe'
  | 'control'
  | 'bundle'
  | 'split'
  | 'combine'
  | 'transform'
  | 'accumulate'
  | 'summarize'
  | 'unpack';

export type Decides = 'value' | 'position' | 'clock' | 'signal' | 'valueTime' | 'subscription' | 'none';

export type Card =
  | 'preserving'
  | 'mayDropAll'
  | 'atMostOne'
  | 'exactlyOne'
  | 'nonEmpty'
  | 'appends'
  | 'repeats'
  | 'empty'
  | 'dependsNotifier'
  | 'dependsOther'
  | 'dependsInner';

export type Strategy = 'merge' | 'concat' | 'switch' | 'exhaust' | 'race' | 'latest' | 'zip' | 'sample';

export type Fate = 'sealed' | 'opened' | 'unpacked';

export interface Option<K extends string> {
  key: K;
  label: string;
  hint: string;
}

export interface KindOption extends Option<Kind> {
  fate: Fate;
}

export const FATES: { key: Fate; label: string; hint: string }[] = [
  { key: 'sealed', label: 'Package stays sealed', hint: 'The operator never opens a package. It drops, delays, repeats, wraps or groups packages as they are.' },
  { key: 'opened', label: 'Package is opened', hint: 'A callback opens the package and something new is packed.' },
  { key: 'unpacked', label: 'Package is a stream', hint: 'Each package is itself a stream; it is opened by subscribing to it.' },
];

export const KINDS: KindOption[] = [
  { key: 'select', fate: 'sealed', label: 'Select', hint: 'Let some packages through, drop the rest.' },
  { key: 'retime', fate: 'sealed', label: 'Re-time', hint: 'Same packages, delivered later or on another scheduler.' },
  { key: 'add', fate: 'sealed', label: 'Add packages', hint: 'Mix in packages you supply or packages from other streams.' },
  { key: 'repeat', fate: 'sealed', label: 'Repeat / retry', hint: 'Subscribe to the source again.' },
  { key: 'share', fate: 'sealed', label: 'Share', hint: 'One delivery for several subscribers.' },
  { key: 'observe', fate: 'sealed', label: 'Observe', hint: 'Look at packages or teardown, change nothing.' },
  { key: 'control', fate: 'sealed', label: 'Control the end', hint: 'Deadlines and empty-stream errors.' },
  { key: 'bundle', fate: 'sealed', label: 'Bundle', hint: 'Pack several packages into one array or tuple.' },
  { key: 'split', fate: 'sealed', label: 'Split into streams', hint: 'Sort packages into new streams.' },
  { key: 'combine', fate: 'sealed', label: 'Combine streams', hint: 'Pair packages from several streams into tuples.' },
  { key: 'transform', fate: 'opened', label: 'Transform 1:1', hint: 'One new package for each package.' },
  { key: 'accumulate', fate: 'opened', label: 'Accumulate', hint: 'Fold packages into running state.' },
  { key: 'summarize', fate: 'opened', label: 'Summarize', hint: 'One package that answers a question about the stream.' },
  { key: 'unpack', fate: 'unpacked', label: 'Unpack (flatten)', hint: 'Subscribe to streams and deliver their packages.' },
];

export const DECIDES: Option<Decides>[] = [
  { key: 'value', label: 'Contents', hint: 'Your callback opens the package: (value: T) => boolean | K | R' },
  { key: 'position', label: 'Position / count', hint: 'Logical time: the index of a package, or the end of the stream. Parameter: number' },
  { key: 'clock', label: 'Clock', hint: 'Physical time. Parameters: number, SchedulerLike' },
  { key: 'signal', label: 'Signal stream', hint: 'Another stream decides. Parameter: ObservableInput<any>' },
  { key: 'valueTime', label: 'Value → time / stream', hint: 'Your callback opens the package and returns a stream. Parameter: (value: T) => ObservableInput' },
  { key: 'subscription', label: 'Subscription', hint: 'Who subscribes, restarts, errors and teardown.' },
  { key: 'none', label: 'Nothing', hint: 'Every package is treated the same way.' },
];

export const CARDS: (Option<Card> & { map: string; cw: string })[] = [
  { key: 'preserving', label: 'Preserving', hint: 'Empty stays empty, non-empty stays non-empty.', map: '!→!  ?→?  +→+  *→*', cw: 'B*(A*)' },
  { key: 'mayDropAll', label: 'May drop all', hint: 'Can deliver nothing, even from a non-empty source.', map: '!→?  ?→?  +→*  *→*', cw: 'B*(A*)' },
  { key: 'atMostOne', label: 'At most one', hint: 'Zero or one package.', map: '!→!  ?→?  +→!  *→?', cw: 'B?(A*)' },
  { key: 'exactlyOne', label: 'Exactly one', hint: 'One package, or an error.', map: '!→!  ?→!  +→!  *→!', cw: 'B!(A*)' },
  { key: 'nonEmpty', label: 'Non-empty', hint: 'Fills an empty stream with a default or an error.', map: '!→!  ?→!  +→+  *→+', cw: 'B+(A*)' },
  { key: 'appends', label: 'At least one', hint: 'Always delivers at least one package.', map: '!→+  ?→+  +→+  *→+', cw: 'B+(A*)' },
  { key: 'repeats', label: 'Repeats', hint: 'Delivers the source packages again.', map: '!→+  ?→*  +→+  *→*', cw: 'B*(A*)' },
  { key: 'empty', label: 'Empty', hint: 'Delivers no packages, only completion or error.', map: 'all → ∅', cw: 'never*(A*)' },
  { key: 'dependsNotifier', label: 'Set by notifier / clock', hint: 'The number of output packages follows a notifier or a timer.', map: '—', cw: 'B*(A*)' },
  { key: 'dependsOther', label: 'Set by other streams', hint: 'Other input streams add to or decide the count.', map: '—', cw: 'B*(A*)' },
  { key: 'dependsInner', label: 'Set by inner streams', hint: 'The inner streams decide the count.', map: '—', cw: 'B*(A*)' },
];

export const STRATEGIES: Option<Strategy>[] = [
  { key: 'merge', label: 'merge: all at once', hint: 'Subscribe to every stream immediately, interleave their packages.' },
  { key: 'concat', label: 'concat: queued', hint: 'One stream after the other, in order.' },
  { key: 'switch', label: 'switch: latest only', hint: 'A new stream cancels the previous one.' },
  { key: 'exhaust', label: 'exhaust: ignore while busy', hint: 'New streams are ignored until the current one completes.' },
  { key: 'race', label: 'race: first wins', hint: 'The first stream to deliver wins, the others are dropped.' },
  { key: 'latest', label: 'combineLatest: latest of each', hint: 'Each package from any stream is combined with the latest of all others.' },
  { key: 'zip', label: 'zip: pair by index', hint: 'The n-th packages of every stream are paired.' },
  { key: 'sample', label: 'withLatestFrom: sample others', hint: 'Only the source triggers; the others contribute their latest package.' },
];

// Name grammar: verb (what) + suffix (what decides).
export const SUFFIXES: { suffix: string; meaning: string; decides?: Decides }[] = [
  { suffix: 'While', meaning: 'contents decide, via a predicate', decides: 'value' },
  { suffix: 'Count', meaning: 'position decides', decides: 'position' },
  { suffix: 'Last', meaning: 'position from the end', decides: 'position' },
  { suffix: 'Time', meaning: 'the clock decides', decides: 'clock' },
  { suffix: 'Until', meaning: 'a signal stream decides', decides: 'signal' },
  { suffix: 'When', meaning: 'a stream returned by a factory decides', decides: 'signal' },
  { suffix: 'Toggle', meaning: 'opening and closing signal streams decide', decides: 'signal' },
  { suffix: 'MapTo', meaning: 'every package maps to the same inner stream', decides: 'signal' },
  { suffix: 'Map', meaning: 'every package maps to an inner stream', decides: 'valueTime' },
  { suffix: 'All', meaning: 'the packages already are streams', decides: 'signal' },
  { suffix: 'With', meaning: 'other streams are passed in', decides: 'signal' },
  { suffix: 'Scan', meaning: 'accumulate through inner streams', decides: 'valueTime' },
];

export const VERBS = [
  'take', 'skip', 'debounce', 'throttle', 'audit', 'sample', 'buffer', 'window',
  'merge', 'concat', 'switch', 'exhaust', 'combineLatest', 'zip', 'distinct',
  'delay', 'repeat', 'retry', 'publish', 'timeout', 'race', 'share', 'find',
] as const;

export interface NameParts {
  verb: string;
  suffix: string;
}

/** Split an operator name into verb and suffix, e.g. switchMap -> switch + Map. */
export function splitName(name: string): NameParts {
  const verb = [...VERBS].sort((a, b) => b.length - a.length).find((v) => name === v || (name.startsWith(v) && /^[A-Z]/.test(name.slice(v.length))));
  return verb ? { verb, suffix: name.slice(verb.length) } : { verb: name, suffix: '' };
}

export function suffixMeaning(suffix: string): string | undefined {
  if (!suffix) return undefined;
  return SUFFIXES.find((s) => s.suffix === suffix)?.meaning;
}

export function fateOf(kind: Kind): Fate {
  return KINDS.find((k) => k.key === kind)!.fate;
}

/** How the operator relates to map (naturality in T). */
export function mapLaw(kind: Kind, decides: Decides): string {
  const fate = fateOf(kind);
  if (fate !== 'sealed') return 'Does not commute with map: the package is opened or unpacked.';
  if (kind === 'add') return 'Commutes with map if the added packages are mapped too: pipe(startWith(x), map(g)) ≡ pipe(map(g), startWith(g(x)))';
  if (decides === 'value') return 'Commutes with map once the callback is adjusted: pipe(map(g), filter(p)) ≡ pipe(filter(x => p(g(x))), map(g))';
  if (kind === 'bundle' || kind === 'split' || kind === 'combine') return 'Commutes with map lifted into the container: pipe(map(g), toArray()) ≡ pipe(toArray(), map(xs => xs.map(g)))';
  return 'Commutes with map: pipe(map(g), op) ≡ pipe(op, map(g))';
}
