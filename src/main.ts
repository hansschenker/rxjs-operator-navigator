import { Subject, debounceTime, distinctUntilChanged, filter, fromEvent, map, merge, pairwise, startWith } from 'rxjs';
import './style.css';
import { OPERATORS, RXJS_VERSION } from './catalog';
import { createStore, fromHash, toHash, type Action, type State } from './state';
import { renderGrammar, renderJump, renderQuestions, renderResults } from './view';
import type { FacetKey } from './catalog';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

const questions = $('#questions');
const results = $('#results');
const grammar = $('#grammar');
const jump = $('#jump');
const search = $<HTMLInputElement>('#search');
const deprecated = $<HTMLInputElement>('#deprecated');
$('#meta').textContent = `RxJS ${RXJS_VERSION} · ${OPERATORS.filter((o) => !o.aliasOf).length} operators`;

// ── Actions: every DOM event becomes an Action ───────────────────────
const clicks$ = fromEvent<MouseEvent>(document, 'click').pipe(
  map((e) => (e.target as HTMLElement).closest<HTMLElement>('[data-answer],[data-open],[data-reset]')),
  filter((el): el is HTMLElement => el !== null),
  map((el): Action => {
    if (el.dataset.answer) return { type: 'answer', key: el.dataset.answer as FacetKey, value: el.dataset.value! };
    if (el.dataset.open) return { type: 'open', name: el.dataset.open };
    return { type: 'reset' };
  }),
);

const query$ = fromEvent(search, 'input').pipe(
  map(() => search.value),
  debounceTime(120),
  distinctUntilChanged(),
  map((query): Action => ({ type: 'query', query })),
);

const deprecated$ = fromEvent(deprecated, 'change').pipe(map((): Action => ({ type: 'deprecated', show: deprecated.checked })));

const hash$ = fromEvent(window, 'hashchange').pipe(
  map(() => location.hash),
  filter((h) => h !== lastHash),
  map((h): Action => ({ type: 'replace', state: fromHash(h) })),
);

const external$ = new Subject<Action>();
let lastHash = location.hash;

// ── State: actions folded into one stream ────────────────────────────
const state$ = createStore(merge(clicks$, query$, deprecated$, hash$, external$), fromHash(location.hash));

// ── Effects ──────────────────────────────────────────────────────────
state$.subscribe((s) => {
  questions.innerHTML = renderQuestions(s);
  results.innerHTML = renderResults(s);
  jump.innerHTML = renderJump(s);
  if (search.value !== s.query) search.value = s.query;
  deprecated.checked = s.showDeprecated;
  const hash = toHash(s);
  if (hash !== location.hash) {
    lastHash = hash;
    history.replaceState(null, '', hash || location.pathname + location.search);
  }
});

state$
  .pipe(distinctUntilChanged((a: State, b: State) => a.showDeprecated === b.showDeprecated))
  .subscribe((s) => (grammar.innerHTML = renderGrammar(s)));

// Scroll an operator into view when it is opened from outside the result list.
state$
  .pipe(
    map((s) => s.open),
    startWith(undefined),
    pairwise(),
    filter(([prev, next]) => Boolean(next) && prev !== next),
  )
  .subscribe(([, name]) => {
    const el = document.getElementById(`op-${name}`);
    if (el && !isInViewport(el)) el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });

// A grammar cell opens an operator that may be filtered out: clear the answers first.
fromEvent<MouseEvent>(grammar, 'click')
  .pipe(
    map((e) => (e.target as HTMLElement).closest<HTMLElement>('[data-show]')?.dataset.show),
    filter((name): name is string => Boolean(name)),
  )
  .subscribe((name) => {
    if (!document.getElementById(`op-${name}`)) external$.next({ type: 'reset' });
    external$.next({ type: 'show', name });
  });

fromEvent(jump, 'click').subscribe(() => results.scrollIntoView({ block: 'start' }));

function isInViewport(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  return r.top >= 0 && r.top < innerHeight - 80;
}
