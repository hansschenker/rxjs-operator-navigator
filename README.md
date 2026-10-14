# RxJS Operator Navigator

Navigate the RxJS operator zoo by **patterns instead of names**.

RxJS 7 has 110 operators. Nobody should have to memorize them. Every operator moves
*packages*: values it cannot open, because `T` is a type parameter. Four questions about
those packages place any operator, and the operator names follow a small grammar that
encodes the same answers.

## The four questions

| # | Question | Answers | Where you read it |
|---|---|---|---|
| 1 | **What happens to the packages?** | stays sealed (select, re-time, add, repeat, share, observe, control, bundle, split, combine) · opened (transform, accumulate, summarize) · is a stream (unpack) | output type |
| 2 | **What decides?** | contents · position / count · clock · signal stream · value → time / stream · subscription · nothing | parameter types |
| 3 | **How many come out?** | preserving · may drop all · at most one · exactly one · non-empty · at least one · repeats · empty · set by notifier / other / inner streams | semantics (Cω cardinality `! ? + *`) |
| 4 | **Several streams: which strategy?** | merge · concat · switch · exhaust · race · combineLatest · zip · withLatestFrom | semantics |

Answer any question in any order. Each answer shows how many operators it would leave.

Examples:

- *Collect values into arrays every 500 ms* → bundle + clock → **`bufferTime`**
- *New request per keystroke, cancel the previous one* → unpack + value → stream + switch → **`switchMap`**

## Name grammar: verb + suffix

The verb says what happens, the suffix says what decides.

| Suffix | Decides by | Examples |
|---|---|---|
| `…While` | contents, via a predicate | `takeWhile`, `skipWhile` |
| `…Count`, `…Last` | position | `bufferCount`, `takeLast` |
| `…Time` | the clock | `debounceTime`, `bufferTime` |
| `…Until`, `…When`, `…Toggle` | a signal stream | `takeUntil`, `bufferWhen`, `windowToggle` |
| no suffix, with a selector | value → time | `debounce`, `throttle`, `audit` |
| `…Map` | each package maps to a stream | `mergeMap`, `switchMap` |
| `…All` | the packages already are streams | `mergeAll`, `concatAll` |
| `…With` | other streams passed in | `mergeWith`, `zipWith` |

23 verbs cover most of the operators. The app shows the full verb × suffix grid, and every
operator links to its siblings with the same verb, the same suffix, and the same strategy.
Where the grammar misleads (`distinctUntilChanged`, `delayWhen`), the operator carries an
edge-case note.

## How the data is made

- **Signatures** come from the RxJS source shipped in `node_modules/rxjs/src/internal/operators`.
  `scripts/extract-operators.mjs` parses it with the TypeScript compiler and writes
  `src/data/operators.generated.json`: public signatures only (implementation signatures behind
  overloads are skipped), parameters, return types, `@deprecated` flags and aliases.
- **Classification** lives in `src/data/classification.ts`: one entry per operator with the four
  answers, a short behaviour label and edge-case notes.
- **Tests** (`src/catalog.test.ts`) fail when an extracted operator has no classification, when a
  classification names an operator that does not exist, or when a facet value is unknown.

After upgrading RxJS, run `npm run extract` and `npm test`; the test lists every operator that
still needs a classification.

## Built with RxJS

The UI uses no framework. All DOM events become an `Action` stream, folded into one `State`
stream with `scan`; rendering, URL hash sync and scrolling are subscriptions to that stream
(`src/state.ts`, `src/main.ts`). The state is in the URL hash, so every answer combination is a
shareable link, for example `#kind=unpack&strategy=switch&op=switchMap`.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # classification and navigation tests
npm run build      # typecheck + production build in dist/
npm run extract    # regenerate signatures from node_modules/rxjs
```

## Project structure

```
scripts/extract-operators.mjs   RxJS source -> operators.generated.json
src/model.ts                    the four questions, name grammar, cardinality, map law
src/data/classification.ts      answers for every operator
src/catalog.ts                  joins signatures and classification; filtering and counts
src/state.ts                    actions, reducer, state stream, URL hash
src/view.ts                     HTML rendering
src/main.ts                     event streams and effects
```

## Background

This project grew out of a type analysis of all RxJS operator signatures: grouping the
`MonoTypeOperatorFunction` operators by what decides delivery, adding Erik Meijer's Cω
cardinalities, and classifying the `OperatorFunction` output types by what happens to the
package. It succeeds [rxjs-operator-finder](https://github.com/hansschenker/rxjs-operator-finder),
whose first-order / higher-order and time / value split lives on in questions 1 and 2, and whose
behaviour labels inspired the short descriptions.

## Authors

- **Hans Schenker** — idea, package model, review
- **Claude** (Anthropic) — analysis, implementation

## Contributors

See [CONTRIBUTORS.md](CONTRIBUTORS.md).

## License

MIT
