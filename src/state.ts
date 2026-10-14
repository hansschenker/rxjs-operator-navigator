import { Observable, distinctUntilChanged, scan, shareReplay, startWith } from 'rxjs';
import { EMPTY_FILTER, type FacetKey, type Filter } from './catalog';

export interface State extends Filter {
  open?: string;
}

export type Action =
  | { type: 'answer'; key: FacetKey; value: string }
  | { type: 'query'; query: string }
  | { type: 'deprecated'; show: boolean }
  | { type: 'open'; name: string }
  | { type: 'show'; name: string }
  | { type: 'reset' }
  | { type: 'replace'; state: State };

export const INITIAL: State = { ...EMPTY_FILTER };

export function reduce(state: State, action: Action): State {
  switch (action.type) {
    case 'answer': {
      const same = state[action.key] === action.value;
      const next: State = { ...state, [action.key]: same ? undefined : action.value };
      // Choosing a fate that contradicts the chosen kind clears the kind.
      if (action.key === 'fate' && !same) next.kind = undefined;
      return next;
    }
    case 'query':
      return { ...state, query: action.query };
    case 'deprecated':
      return { ...state, showDeprecated: action.show };
    case 'open':
      return { ...state, open: state.open === action.name ? undefined : action.name };
    case 'show':
      return { ...state, open: action.name };
    case 'reset':
      return { ...INITIAL, showDeprecated: state.showDeprecated };
    case 'replace':
      return action.state;
  }
}

const KEYS: FacetKey[] = ['fate', 'kind', 'decides', 'card', 'strategy'];

/** State <-> location.hash, e.g. #kind=unpack&strategy=switch&op=switchMap */
export function toHash(s: State): string {
  const p = new URLSearchParams();
  for (const k of KEYS) if (s[k]) p.set(k, s[k]!);
  if (s.query) p.set('q', s.query);
  if (s.showDeprecated) p.set('deprecated', '1');
  if (s.open) p.set('op', s.open);
  const str = p.toString();
  return str ? `#${str}` : '';
}

export function fromHash(hash: string): State {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const s: State = { ...INITIAL };
  for (const k of KEYS) {
    const v = p.get(k);
    if (v) (s as unknown as Record<string, unknown>)[k] = v;
  }
  s.query = p.get('q') ?? '';
  s.showDeprecated = p.get('deprecated') === '1';
  s.open = p.get('op') ?? undefined;
  return s;
}

/** The whole app state as one stream: actions folded with scan. */
export function createStore(actions$: Observable<Action>, initial: State): Observable<State> {
  return actions$.pipe(
    scan(reduce, initial),
    startWith(initial),
    distinctUntilChanged((a, b) => toHash(a) === toHash(b)),
    shareReplay({ bufferSize: 1, refCount: false }),
  );
}
