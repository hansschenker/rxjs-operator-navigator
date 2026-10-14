import { OPERATORS, facetCount, filterOperators, related, type FacetKey, type Operator } from './catalog';
import { CARDS, DECIDES, FATES, KINDS, STRATEGIES, SUFFIXES, VERBS, mapLaw, suffixMeaning, type Option } from './model';
import type { State } from './state';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const label = <K extends string>(opts: Option<K>[], key?: K) => opts.find((o) => o.key === key)?.label ?? '';

function chip(key: FacetKey, value: string, text: string, hint: string, state: State): string {
  const active = state[key] === value;
  const n = facetCount(OPERATORS, state, key, value);
  const disabled = n === 0 && !active;
  return `<button type="button" class="chip${active ? ' on' : ''}" data-answer="${key}" data-value="${value}" aria-pressed="${active}" ${disabled ? 'disabled' : ''} title="${esc(hint)}">
    <span>${esc(text)}</span><span class="n">${n}</span></button>`;
}

function question(num: number, title: string, help: string, body: string, answered: boolean): string {
  return `<section class="q${answered ? ' answered' : ''}">
    <header><span class="num">${num}</span><div><h2>${title}</h2><p>${help}</p></div></header>
    ${body}
  </section>`;
}

export function renderQuestions(s: State): string {
  const fates = FATES.map((f) => {
    const kinds = KINDS.filter((k) => k.fate === f.key)
      .map((k) => chip('kind', k.key, k.label, k.hint, s))
      .join('');
    return `<div class="fate"><div class="fate-head">${chip('fate', f.key, f.label, f.hint, s)}</div><div class="chips">${kinds}</div></div>`;
  }).join('');
  const decides = `<div class="chips">${DECIDES.map((d) => chip('decides', d.key, d.label, d.hint, s)).join('')}</div>`;
  const cards = `<div class="chips">${CARDS.map((c) => chip('card', c.key, c.label, `${c.hint}  ${c.map}`, s)).join('')}</div>`;
  const strategies = `<div class="chips">${STRATEGIES.map((c) => chip('strategy', c.key, c.label, c.hint, s)).join('')}</div>`;
  return [
    question(1, 'What happens to the packages?', 'A package is one value. Does the operator keep it sealed, open it, or is it a stream itself?', fates, Boolean(s.kind || s.fate)),
    question(2, 'What decides?', 'Read it from the parameter types: a predicate, a number, a scheduler, a notifier stream, a callback returning a stream.', decides, Boolean(s.decides)),
    question(3, 'How many come out?', 'Cω cardinality: ! exactly one · ? zero or one · + one or more · * zero or more.', cards, Boolean(s.card)),
    question(4, 'Several streams: which strategy?', 'Only for operators that flatten, add or combine streams.', strategies, Boolean(s.strategy)),
  ].join('');
}

function nameHtml(op: Operator): string {
  const { verb, suffix } = op.parts;
  const meaning = suffixMeaning(suffix);
  return `<span class="verb">${esc(verb)}</span>${suffix ? `<span class="suffix"${meaning ? ` title="${esc(suffix)}: ${esc(meaning)}"` : ''}>${esc(suffix)}</span>` : ''}`;
}

function badges(op: Operator): string {
  const card = CARDS.find((c) => c.key === op.card)!;
  const items = [
    `<span class="badge fate-${op.fate}">${esc(label(KINDS, op.kind))}</span>`,
    `<span class="badge">${esc(label(DECIDES, op.decides))}</span>`,
    `<span class="badge mono" title="${esc(card.map)}">${esc(card.label)}</span>`,
  ];
  if (op.strategy) items.push(`<span class="badge">${esc(label(STRATEGIES, op.strategy).split(':')[0])}</span>`);
  if (op.deprecated) items.push(`<span class="badge warn">deprecated</span>`);
  return items.join('');
}

function opLink(op: Operator): string {
  return `<button type="button" class="link${op.deprecated ? ' dep' : ''}" data-open="${op.name}">${esc(op.name)}</button>`;
}

function signatureHtml(op: Operator): string {
  if (op.aliasOf) return `<p class="muted">Alias: same signatures as <code>${esc(op.aliasOf)}</code>.</p>`;
  return `<ol class="sigs">${op.signatures
    .map(
      (sig) =>
        `<li${sig.deprecated ? ' class="dep"' : ''}><code>${esc(sig.text)}</code>${sig.deprecated ? ' <span class="badge warn">deprecated overload</span>' : ''}</li>`,
    )
    .join('')}</ol>`;
}

function detail(op: Operator): string {
  const card = CARDS.find((c) => c.key === op.card)!;
  const rel = related(OPERATORS, op);
  const group = (title: string, ops: Operator[]) => (ops.length ? `<div class="rel"><h4>${title}</h4><div>${ops.map(opLink).join('')}</div></div>` : '');
  const meaning = suffixMeaning(op.parts.suffix);
  return `<div class="detail">
    <dl>
      <div><dt>Name</dt><dd><code>${esc(op.parts.verb)}</code>${op.parts.suffix ? ` + <code>${esc(op.parts.suffix)}</code>${meaning ? ` — ${esc(meaning)}` : ''}` : ''}</dd></div>
      <div><dt>Package</dt><dd>${esc(FATES.find((f) => f.key === op.fate)!.hint)}</dd></div>
      <div><dt>Decides</dt><dd>${esc(DECIDES.find((d) => d.key === op.decides)!.hint)}</dd></div>
      <div><dt>Cardinality</dt><dd><code>${esc(card.cw)}</code>${card.map !== '—' ? ` · <code>${esc(card.map)}</code>` : ''} — ${esc(card.hint)}</dd></div>
      ${op.strategy ? `<div><dt>Strategy</dt><dd>${esc(STRATEGIES.find((x) => x.key === op.strategy)!.hint)}</dd></div>` : ''}
      <div><dt>Law</dt><dd>${esc(mapLaw(op.kind, op.decides))}</dd></div>
      ${op.note ? `<div class="edge"><dt>Edge case</dt><dd>${esc(op.note)}</dd></div>` : ''}
    </dl>
    <h4>Public signatures</h4>
    ${signatureHtml(op)}
    ${group(`Same verb: ${esc(op.parts.verb)}`, rel.sameVerb)}
    ${group(`Same suffix: ${esc(op.parts.suffix)}`, rel.sameSuffix)}
    ${group('Same strategy', rel.sameStrategy)}
    <p class="ext"><a href="https://rxjs.dev/api/operators/${encodeURIComponent(op.aliasOf ?? op.name)}" target="_blank" rel="noopener">rxjs.dev documentation ↗</a></p>
  </div>`;
}

/** Sticky bar on narrow screens: the result count stays visible while answering. */
export function renderJump(s: State): string {
  const n = filterOperators(OPERATORS, s).length;
  return `<button type="button" data-jump>${n} ${n === 1 ? 'operator' : 'operators'} · show ↓</button>`;
}

export function renderResults(s: State): string {
  const list = filterOperators(OPERATORS, s);
  const answered = [s.fate, s.kind, s.decides, s.card, s.strategy].filter(Boolean).length;
  const head = `<div class="results-head"><h2><span class="count">${list.length}</span> ${list.length === 1 ? 'operator' : 'operators'}</h2>
    <p>${answered ? `${answered} of 4 questions answered` : 'Answer any question, in any order.'}</p></div>`;
  if (!list.length) return head + `<p class="empty">No operator matches all answers. Click an active answer again to remove it.</p>`;
  const items = list
    .map((op) => {
      const open = s.open === op.name;
      return `<li class="op${open ? ' open' : ''}${op.deprecated ? ' dep' : ''}" id="op-${op.name}">
        <button type="button" class="op-head" data-open="${op.name}" aria-expanded="${open}">
          <span class="name">${nameHtml(op)}</span>
          <span class="does">${esc(op.does)}</span>
          <span class="badges">${badges(op)}</span>
        </button>
        ${open ? detail(op) : ''}
      </li>`;
    })
    .join('');
  return head + `<ul class="ops">${items}</ul>`;
}

export function renderGrammar(s: State): string {
  const ops = OPERATORS.filter((o) => !o.aliasOf && (s.showDeprecated || !o.deprecated));
  const verbs = VERBS.filter((v) => ops.some((o) => o.parts.verb === v));
  const suffixes = ['', ...new Set(ops.filter((o) => (VERBS as readonly string[]).includes(o.parts.verb)).map((o) => o.parts.suffix))].filter(
    (x, i, a) => a.indexOf(x) === i,
  );
  const order = ['', ...SUFFIXES.map((x) => x.suffix)];
  suffixes.sort((a, b) => (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b)));
  const covered = ops.filter((o) => verbs.includes(o.parts.verb as (typeof verbs)[number])).length;
  const th = suffixes.map((x) => `<th title="${esc(suffixMeaning(x) ?? '')}">${x ? esc(x) : '—'}</th>`).join('');
  const rows = verbs
    .map((v) => {
      const cells = suffixes
        .map((x) => {
          const op = ops.find((o) => o.parts.verb === v && o.parts.suffix === x);
          return `<td>${op ? `<button type="button" class="cell${op.deprecated ? ' dep' : ''}" data-show="${op.name}">${esc(op.name)}</button>` : ''}</td>`;
        })
        .join('');
      return `<tr><th scope="row">${esc(v)}</th>${cells}</tr>`;
    })
    .join('');
  return `<p>${verbs.length} verbs cover ${covered} of the ${ops.length} operators shown. The verb says what happens, the suffix says what decides. Click a name to open it.</p>
    <div class="tablewrap"><table class="grammar"><thead><tr><th></th>${th}</tr></thead><tbody>${rows}</tbody></table></div>
    <ul class="suffixes">${SUFFIXES.map((x) => `<li><code>…${esc(x.suffix)}</code> ${esc(x.meaning)}</li>`).join('')}</ul>`;
}
