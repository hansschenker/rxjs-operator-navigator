import type { Card, Decides, Kind, Strategy } from '../model';

export interface Classification {
  kind: Kind;
  decides: Decides;
  card: Card;
  strategy?: Strategy;
  /** Short behaviour label, in the spirit of rxjs-operator-finder's "further" column. */
  does: string;
  /** Things that do not fit the pattern cleanly. */
  note?: string;
}

const c = (kind: Kind, decides: Decides, card: Card, does: string, extra: Partial<Classification> = {}): Classification => ({
  kind,
  decides,
  card,
  does,
  ...extra,
});

// One entry per operator exported from rxjs/src/internal/operators (RxJS 7).
// The test in classification.test.ts fails when an extracted operator is missing here.
export const CLASSIFICATION: Record<string, Classification> = {
  // ── Select: let some packages through ─────────────────────────────
  filter: c('select', 'value', 'mayDropAll', 'keep packages that pass a predicate'),
  takeWhile: c('select', 'value', 'mayDropAll', 'pass packages until the predicate fails, then complete'),
  skipWhile: c('select', 'value', 'mayDropAll', 'drop packages while the predicate holds'),
  distinct: c('select', 'value', 'preserving', 'drop packages (or keys) seen before', { note: 'Optional flushes stream resets the memory: a signal inside a value-based operator.' }),
  distinctUntilChanged: c('select', 'value', 'preserving', 'drop consecutive duplicates', { note: '"Until" here does not mean a signal stream; the operator compares neighbours.' }),
  distinctUntilKeyChanged: c('select', 'value', 'preserving', 'drop consecutive duplicates of one key'),
  find: c('select', 'value', 'exactlyOne', 'first package that matches, or undefined'),
  first: c('select', 'value', 'exactlyOne', 'first (matching) package, then complete', { note: 'Without predicate it decides by position. Errors on empty unless a default is given.' }),
  last: c('select', 'value', 'exactlyOne', 'last (matching) package on completion', { note: 'Without predicate it decides by position. Errors on empty unless a default is given.' }),
  single: c('select', 'value', 'exactlyOne', 'the only (matching) package, error otherwise'),
  min: c('select', 'value', 'atMostOne', 'smallest package on completion', { note: 'Returns one of the source packages, so the type stays T. Without comparer it compares with <.' }),
  max: c('select', 'value', 'atMostOne', 'largest package on completion', { note: 'Returns one of the source packages, so the type stays T. Without comparer it compares with >.' }),
  take: c('select', 'position', 'preserving', 'first n packages, then complete', { note: 'take(1) is at most one; take(0) is always empty.' }),
  takeLast: c('select', 'position', 'preserving', 'last n packages on completion', { note: 'takeLast(1) is at most one.' }),
  skip: c('select', 'position', 'mayDropAll', 'drop the first n packages'),
  skipLast: c('select', 'position', 'mayDropAll', 'drop the last n packages'),
  elementAt: c('select', 'position', 'exactlyOne', 'the package at index n, or a default'),
  takeUntil: c('select', 'signal', 'mayDropAll', 'pass packages until a notifier emits'),
  skipUntil: c('select', 'signal', 'mayDropAll', 'drop packages until a notifier emits'),
  sample: c('select', 'signal', 'mayDropAll', 'latest package whenever a notifier emits'),
  sampleTime: c('select', 'clock', 'mayDropAll', 'latest package at a fixed period'),
  debounceTime: c('select', 'clock', 'preserving', 'last package after a fixed quiet period'),
  throttleTime: c('select', 'clock', 'preserving', 'first package, then silence for a fixed time (leading)'),
  auditTime: c('select', 'clock', 'preserving', 'last package at the end of a fixed window (trailing)'),
  debounce: c('select', 'valueTime', 'preserving', 'last package after a quiet period chosen per package'),
  throttle: c('select', 'valueTime', 'preserving', 'first package, then silence chosen per package'),
  audit: c('select', 'valueTime', 'preserving', 'last package at the end of a window chosen per package'),
  ignoreElements: c('select', 'none', 'empty', 'drop every package, keep completion and error'),

  // ── Re-time: same packages, other moment ─────────────────────────
  delay: c('retime', 'clock', 'preserving', 'shift every package by a fixed time'),
  delayWhen: c('retime', 'valueTime', 'preserving', 'shift each package until its own notifier emits', { note: '"When" here receives the package (value → time), unlike bufferWhen.' }),
  observeOn: c('retime', 'clock', 'preserving', 'deliver packages on another scheduler'),
  subscribeOn: c('retime', 'clock', 'preserving', 'subscribe to the source on another scheduler'),

  // ── Add packages ─────────────────────────────────────────────────
  startWith: c('add', 'position', 'appends', 'packages you supply, before the source'),
  endWith: c('add', 'position', 'appends', 'packages you supply, after the source completes'),
  defaultIfEmpty: c('add', 'position', 'nonEmpty', 'a default package if the source is empty'),
  concatWith: c('add', 'position', 'dependsOther', 'other streams after the source completes', { strategy: 'concat' }),
  concat: c('add', 'position', 'dependsOther', 'other streams after the source completes', { strategy: 'concat' }),
  mergeWith: c('add', 'signal', 'dependsOther', 'packages of other streams, interleaved', { strategy: 'merge' }),
  merge: c('add', 'signal', 'dependsOther', 'packages of other streams, interleaved', { strategy: 'merge' }),
  raceWith: c('add', 'signal', 'dependsOther', 'whichever stream delivers first wins', { strategy: 'race' }),
  race: c('add', 'signal', 'dependsOther', 'whichever stream delivers first wins', { strategy: 'race' }),
  catchError: c('add', 'subscription', 'dependsOther', 'replace an error with another stream'),
  onErrorResumeNextWith: c('add', 'subscription', 'dependsOther', 'continue with the next stream on error or completion', { strategy: 'concat' }),

  // ── Repeat / retry ───────────────────────────────────────────────
  repeat: c('repeat', 'subscription', 'repeats', 'resubscribe after completion'),
  repeatWhen: c('repeat', 'signal', 'repeats', 'resubscribe when a notifier emits'),
  retry: c('repeat', 'subscription', 'repeats', 'resubscribe after an error'),
  retryWhen: c('repeat', 'signal', 'repeats', 'resubscribe after an error when a notifier emits'),

  // ── Share ────────────────────────────────────────────────────────
  share: c('share', 'subscription', 'preserving', 'one source subscription for many subscribers'),
  shareReplay: c('share', 'subscription', 'preserving', 'share and replay the last n packages to late subscribers'),
  connect: c('share', 'subscription', 'dependsInner', 'share the source inside a selector function'),
  multicast: c('share', 'subscription', 'dependsInner', 'share through a subject (legacy)'),
  publish: c('share', 'subscription', 'preserving', 'connectable sharing through a Subject (legacy)'),
  publishBehavior: c('share', 'subscription', 'preserving', 'connectable sharing with an initial package (legacy)'),
  publishLast: c('share', 'subscription', 'atMostOne', 'connectable sharing of the last package (legacy)'),
  publishReplay: c('share', 'subscription', 'preserving', 'connectable sharing with replay (legacy)'),
  refCount: c('share', 'subscription', 'preserving', 'connect a connectable while it has subscribers (legacy)'),

  // ── Observe ──────────────────────────────────────────────────────
  tap: c('observe', 'none', 'preserving', 'run a side effect for each package'),
  finalize: c('observe', 'subscription', 'preserving', 'run a callback on completion, error or unsubscribe'),

  // ── Control the end ──────────────────────────────────────────────
  timeout: c('control', 'clock', 'preserving', 'error (or switch) when a package is late', { note: 'With the "with" option it switches to another stream: output becomes T | ObservedValueOf<O>.' }),
  timeoutWith: c('control', 'clock', 'dependsOther', 'switch to another stream when a package is late'),
  throwIfEmpty: c('control', 'position', 'nonEmpty', 'error if the source completes empty'),

  // ── Bundle ───────────────────────────────────────────────────────
  buffer: c('bundle', 'signal', 'dependsNotifier', 'array of packages per notifier emission'),
  bufferCount: c('bundle', 'position', 'preserving', 'arrays of n packages'),
  bufferTime: c('bundle', 'clock', 'dependsNotifier', 'arrays per time span'),
  bufferToggle: c('bundle', 'valueTime', 'dependsNotifier', 'arrays between opening and closing signals', { note: 'The closing selector receives the opening value, not a source package.' }),
  bufferWhen: c('bundle', 'signal', 'dependsNotifier', 'arrays closed by a notifier from a factory'),
  toArray: c('bundle', 'position', 'exactlyOne', 'all packages in one array on completion'),
  pairwise: c('bundle', 'position', 'mayDropAll', '[previous, current] pairs'),

  // ── Split into streams ───────────────────────────────────────────
  window: c('split', 'signal', 'appends', 'a new inner stream per notifier emission'),
  windowCount: c('split', 'position', 'appends', 'inner streams of n packages'),
  windowTime: c('split', 'clock', 'appends', 'inner streams per time span'),
  windowToggle: c('split', 'valueTime', 'dependsNotifier', 'inner streams between opening and closing signals'),
  windowWhen: c('split', 'signal', 'appends', 'inner streams closed by a notifier from a factory'),
  groupBy: c('split', 'value', 'preserving', 'one inner stream per key'),
  partition: c('split', 'value', 'preserving', 'two streams: matching and not matching'),

  // ── Combine streams into tuples ──────────────────────────────────
  combineLatestWith: c('combine', 'signal', 'dependsOther', 'tuple of the latest package of each stream', { strategy: 'latest' }),
  combineLatest: c('combine', 'signal', 'dependsOther', 'tuple of the latest package of each stream', { strategy: 'latest' }),
  zipWith: c('combine', 'signal', 'dependsOther', 'tuple of the n-th package of each stream', { strategy: 'zip' }),
  zip: c('combine', 'signal', 'dependsOther', 'tuple of the n-th package of each stream', { strategy: 'zip' }),
  withLatestFrom: c('combine', 'signal', 'mayDropAll', 'source package plus the latest of the others', { strategy: 'sample' }),
  combineLatestAll: c('combine', 'signal', 'dependsInner', 'collect inner streams, then combine their latest packages', { strategy: 'latest', note: 'Returns T[], but its packages are streams: it unpacks.' }),
  zipAll: c('combine', 'signal', 'dependsInner', 'collect inner streams, then zip them', { strategy: 'zip', note: 'Returns T[], but its packages are streams: it unpacks.' }),

  // ── Transform 1:1 ────────────────────────────────────────────────
  map: c('transform', 'value', 'preserving', 'new package from each package'),
  mapTo: c('transform', 'none', 'preserving', 'the same constant for each package'),
  pluck: c('transform', 'value', 'preserving', 'a nested property of each package'),
  timestamp: c('transform', 'clock', 'preserving', 'wrap each package with its arrival time'),
  timeInterval: c('transform', 'clock', 'preserving', 'wrap each package with the time since the previous one'),
  materialize: c('transform', 'subscription', 'appends', 'next, error and complete as Notification packages'),
  dematerialize: c('transform', 'subscription', 'mayDropAll', 'Notification packages back into events'),

  // ── Accumulate ───────────────────────────────────────────────────
  scan: c('accumulate', 'value', 'preserving', 'running state, emitted for each package'),
  reduce: c('accumulate', 'value', 'exactlyOne', 'final state on completion', { note: 'Without a seed and on an empty source it delivers nothing (at most one).' }),
  mergeScan: c('accumulate', 'valueTime', 'dependsInner', 'running state produced by inner streams', { strategy: 'merge' }),
  switchScan: c('accumulate', 'valueTime', 'dependsInner', 'running state produced by the latest inner stream', { strategy: 'switch' }),

  // ── Summarize ────────────────────────────────────────────────────
  count: c('summarize', 'position', 'exactlyOne', 'number of (matching) packages'),
  every: c('summarize', 'value', 'exactlyOne', 'true if every package passes'),
  isEmpty: c('summarize', 'position', 'exactlyOne', 'true if the source completes without packages'),
  findIndex: c('summarize', 'value', 'exactlyOne', 'index of the first matching package, or -1'),
  sequenceEqual: c('summarize', 'value', 'exactlyOne', 'true if another stream delivers the same packages'),

  // ── Unpack (flatten) ─────────────────────────────────────────────
  mergeAll: c('unpack', 'signal', 'dependsInner', 'subscribe to every inner stream at once', { strategy: 'merge' }),
  concatAll: c('unpack', 'signal', 'dependsInner', 'subscribe to inner streams one after another', { strategy: 'concat' }),
  switchAll: c('unpack', 'signal', 'dependsInner', 'subscribe to the latest inner stream only', { strategy: 'switch' }),
  exhaustAll: c('unpack', 'signal', 'dependsInner', 'ignore inner streams while one is active', { strategy: 'exhaust' }),
  mergeMap: c('unpack', 'valueTime', 'dependsInner', 'map each package to a stream, run all at once', { strategy: 'merge' }),
  concatMap: c('unpack', 'valueTime', 'dependsInner', 'map each package to a stream, run them in order', { strategy: 'concat' }),
  switchMap: c('unpack', 'valueTime', 'dependsInner', 'map each package to a stream, cancel the previous', { strategy: 'switch' }),
  exhaustMap: c('unpack', 'valueTime', 'dependsInner', 'map each package to a stream, ignore new ones while busy', { strategy: 'exhaust' }),
  mergeMapTo: c('unpack', 'signal', 'dependsInner', 'the same stream for each package, all at once', { strategy: 'merge' }),
  concatMapTo: c('unpack', 'signal', 'dependsInner', 'the same stream for each package, in order', { strategy: 'concat' }),
  switchMapTo: c('unpack', 'signal', 'dependsInner', 'the same stream for each package, latest only', { strategy: 'switch' }),
  expand: c('unpack', 'valueTime', 'dependsInner', 'recursively map packages to streams', { strategy: 'merge' }),
};
