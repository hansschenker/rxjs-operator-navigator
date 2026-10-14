// Extracts the public operator signatures from the RxJS source shipped in
// node_modules/rxjs/src/internal/operators and writes them to
// src/data/operators.generated.json.
//
// Run with: npm run extract
//
// Rules
// - Every exported function declaration is an operator, except internal helpers.
// - When a function has overload signatures, only the overloads are public;
//   the implementation signature is skipped.
// - `export const a = b;` becomes an alias entry.
// - A signature is deprecated when its JSDoc carries @deprecated.

import ts from 'typescript';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const rxjsPkg = require('rxjs/package.json');
const rxjsRoot = dirname(require.resolve('rxjs/package.json'));
const dir = join(rxjsRoot, 'src/internal/operators');
const out = join(dirname(fileURLToPath(import.meta.url)), '../src/data/operators.generated.json');

const HELPER_FILES = new Set(['OperatorSubscriber.ts', 'joinAllInternals.ts', 'mergeInternals.ts', 'scanInternals.ts']);
const HELPER_FUNCTIONS = new Set(['createFind']);

const oneLine = (s) =>
  s
    .replace(/\/\/[^\n]*\n/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/,\s*\)/g, ')')
    .replace(/<\s+/g, '<')
    .replace(/\s+>/g, '>')
    .replace(/\[\s+/g, '[')
    .replace(/\s+\]/g, ']')
    .trim();

const isExported = (node) => (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0;
const isDeprecated = (node) => ts.getJSDocTags(node).some((t) => t.tagName.text === 'deprecated');

const operators = new Map();
const aliases = [];

for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts') && !HELPER_FILES.has(f)).sort()) {
  const sf = ts.createSourceFile(file, readFileSync(join(dir, file), 'utf8'), ts.ScriptTarget.Latest, true);
  const fns = sf.statements.filter((s) => ts.isFunctionDeclaration(s) && s.name && isExported(s));

  for (const fn of fns) {
    const name = fn.name.text;
    if (HELPER_FUNCTIONS.has(name)) continue;
    const hasOverloads = fns.some((f) => f.name.text === name && !f.body);
    if (fn.body && hasOverloads) continue; // implementation signature, not callable

    const params = fn.parameters.map((p) => ({
      name: oneLine(p.name.getText(sf)),
      type: p.type ? oneLine(p.type.getText(sf)) : null,
      optional: Boolean(p.questionToken || p.initializer),
      rest: Boolean(p.dotDotDotToken),
      default: p.initializer ? oneLine(p.initializer.getText(sf)) : null,
    }));
    const signature = {
      typeParameters: (fn.typeParameters ?? []).map((t) => oneLine(t.getText(sf))),
      params,
      returnType: fn.type ? oneLine(fn.type.getText(sf)) : null,
      text: oneLine(sf.text.slice(fn.name.getStart(sf), fn.body ? fn.body.getStart(sf) : fn.end)).replace(/;$/, ''),
      deprecated: isDeprecated(fn),
    };
    if (!operators.has(name)) operators.set(name, { name, file, signatures: [] });
    operators.get(name).signatures.push(signature);
  }

  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st) || !isExported(st)) continue;
    for (const d of st.declarationList.declarations) {
      if (d.initializer && ts.isIdentifier(d.initializer)) {
        aliases.push({ name: d.name.getText(sf), aliasOf: d.initializer.text, file, deprecated: isDeprecated(st) });
      }
    }
  }
}

const list = [...operators.values()]
  .map((op) => ({ ...op, deprecated: op.signatures.every((s) => s.deprecated) }))
  .sort((a, b) => a.name.localeCompare(b.name));

writeFileSync(
  out,
  JSON.stringify({ rxjsVersion: rxjsPkg.version, source: 'rxjs/src/internal/operators', operators: list, aliases }, null, 1) + '\n',
);
console.log(`rxjs ${rxjsPkg.version}: ${list.length} operators, ${list.reduce((n, o) => n + o.signatures.length, 0)} public signatures, ${aliases.length} aliases -> ${out}`);
