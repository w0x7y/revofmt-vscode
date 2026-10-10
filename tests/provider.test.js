'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createProvider } = require('../src/provider');
const { activateWithApi } = require('../src/extension');
const manifest = require('../package.json');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { defaults, document, api, cancellation, apply } = require('./helpers');

test('manifest recognizes both filenames and registers a native formatting provider', async () => {
  const language = manifest.contributes.languages.find(item => item.id === 'revo');
  for (const filename of ['sample.rv', 'sample.revo']) assert.ok(language.extensions.some(suffix => filename.endsWith(suffix)));
  assert.equal(manifest.publisher + '.' + manifest.name, 'w0x7y.revo-formatter');
  const vscode = api({ executable: defaults.executable });
  const context = { subscriptions: [] };
  activateWithApi(vscode, context);
  assert.deepEqual(vscode.registrations[0].selector, { language: 'revo' });
  const doc = document('let x=1');
  const edits = await vscode.registrations[0].provider.provideDocumentFormattingEdits(doc, { tabSize: 8 }, cancellation());
  assert.equal(apply(doc, edits), 'let x = 1\n');
  for (const item of context.subscriptions) item.dispose();
});
test('manifest contributes resource-scoped layout settings that match the validator', () => {
  const properties = manifest.contributes.configuration.properties;
  assert.deepEqual(properties['revofmt.indentStyle'], {
    type: 'string', enum: ['space', 'tab'], default: 'space', scope: 'resource',
    description: 'Indent with spaces or one tab per level. A project revofmt.toml takes precedence.',
  });
  const { description: _, ...maxBlankLines } = properties['revofmt.maxBlankLines'];
  assert.deepEqual(maxBlankLines, { type: 'integer', default: 1, minimum: 0, maximum: 8, scope: 'resource' });
  for (const name of ['indentWidth', 'lineWidth', 'indentStyle', 'maxBlankLines']) {
    assert.match(properties[`revofmt.${name}`].description, /A project revofmt\.toml takes precedence\./, name);
  }
  // The contributed defaults are exactly what the validator and tests assume.
  for (const key of ['indentWidth', 'lineWidth', 'indentStyle', 'maxBlankLines', 'timeoutMs']) {
    assert.equal(properties[`revofmt.${key}`].default, defaults[key], key);
  }
});
test('uses formatter defaults independently of editor tab size and passes resource settings', async () => {
  const vscode = api();
  const provider = createProvider(vscode, async (text, settings) => {
    assert.equal(text, 'let x=1');
    assert.deepEqual(settings, { ...defaults, executable: 'revofmt', filePath: undefined });
    return 'let x = 1\n';
  });
  const doc = document('let x=1');
  assert.equal(apply(doc, await provider.provideDocumentFormattingEdits(doc, { tabSize: 8 }, cancellation())), 'let x = 1\n');
});
test('passes layout settings and the file path of a file-backed document', async () => {
  const seen = [];
  const vscode = api({ indentStyle: 'tab', maxBlankLines: 0, indentWidth: 4 });
  const provider = createProvider(vscode, async (_, settings) => { seen.push(settings); return 'let x = 1\n'; });
  const file = document('let x=1', 1, { scheme: 'file', fsPath: '/project/a.rv', toString: () => 'file:///project/a.rv' });
  await provider.provideDocumentFormattingEdits(file, {}, cancellation());
  assert.deepEqual(seen[0], { ...defaults, executable: 'revofmt', indentWidth: 4, indentStyle: 'tab', maxBlankLines: 0, filePath: '/project/a.rv' });
});
test('omits the file path for untitled and other non-file documents', async () => {
  const seen = [];
  const provider = createProvider(api(), async (_, settings) => { seen.push(settings); return 'let x = 1\n'; });
  const untitled = document('let x=1');
  const remote = document('let x=1', 1, { scheme: 'vscode-vfs', fsPath: '/project/a.rv', toString: () => 'vscode-vfs:/project/a.rv' });
  for (const doc of [untitled, remote]) await provider.provideDocumentFormattingEdits(doc, {}, cancellation());
  assert.equal(seen.length, 2);
  for (const settings of seen) assert.equal(settings.filePath, undefined);
});
test('a revofmt.toml beside a file-backed document overrides the editor settings end to end', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'revofmt-vscode-provider-'));
  try {
    fs.writeFileSync(path.join(directory, 'revofmt.toml'), 'indent_style = "tab"\n');
    const provider = createProvider(api({ executable: defaults.executable, indentStyle: 'space' }));
    const file = document('do\nfoo()\nend', 1, { scheme: 'file', fsPath: path.join(directory, 'a.rv'), toString: () => 'file:' });
    assert.equal(apply(file, await provider.provideDocumentFormattingEdits(file, {}, cancellation())), 'do\n\tfoo()\nend\n');
    const unsaved = document('do\nfoo()\nend');
    assert.equal(apply(unsaved, await provider.provideDocumentFormattingEdits(unsaved, {}, cancellation())), 'do\n  foo()\nend\n');
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
test('returns correct UTF-16 ranges following a supplementary character', async () => {
  const doc = document("let x='😀'\nlet y=2\n");
  const provider = createProvider(api(), async () => "let x='😀'\nlet y = 2\n");
  const edits = await provider.provideDocumentFormattingEdits(doc, {}, cancellation());
  assert.deepEqual(edits[0].range.start, { line: 1, character: 5 });
  assert.equal(apply(doc, edits), "let x='😀'\nlet y = 2\n");
});
test('does not launch in an untrusted workspace', async () => {
  const vscode = api(); vscode.workspace.isTrusted = false;
  const provider = createProvider(vscode, () => { assert.fail('untrusted launch'); });
  assert.deepEqual(await provider.provideDocumentFormattingEdits(document('let x=1'), {}, cancellation()), []);
  assert.match(vscode.errors[0], /trust/i);
});
for (const [key, value] of [['indentWidth', 0], ['indentWidth', 9], ['indentWidth', null], ['lineWidth', 19], ['lineWidth', 241], ['lineWidth', '80'], ['indentStyle', 'tabs'], ['indentStyle', null], ['maxBlankLines', -1], ['maxBlankLines', 9], ['maxBlankLines', 1.5], ['timeoutMs', 0], ['timeoutMs', 1.5], ['timeoutMs', 2147483648], ['executable', ''], ['executable', 'x\0y']]) {
  test(`rejects invalid ${key}=${JSON.stringify(value)} without launch`, async () => {
    const vscode = api({ [key]: value });
    const provider = createProvider(vscode, () => { assert.fail('invalid configuration launch'); });
    assert.deepEqual(await provider.provideDocumentFormattingEdits(document('x'), {}, cancellation()), []);
    assert.match(vscode.errors[0], new RegExp(key));
  });
}
test('reports CLI stderr and leaves syntax-error input untouched', async () => {
  const vscode = api({ executable: defaults.executable });
  const provider = createProvider(vscode);
  const doc = document('let x=');
  assert.deepEqual(await provider.provideDocumentFormattingEdits(doc, {}, cancellation()), []);
  assert.equal(doc.getText(), 'let x=');
  assert.match(vscode.errors[0], /exited.*2/);
});
test('rejects EOL normalization of opaque literals without returning an edit', async () => {
  const vscode = api({ executable: defaults.executable });
  const provider = createProvider(vscode);
  assert.deepEqual(await provider.provideDocumentFormattingEdits(document("let x='a\r\nb'\nlet y=2\n"), {}, cancellation()), []);
  assert.match(vscode.errors[0], /line ending|represent/);
});
test('discard results after document edits, closing, EOL changes or loss of trust', async () => {
  for (const mutate of [doc => doc.version++, doc => { doc.isClosed = true; }, doc => { doc.eol = 2; }, (_, vscode) => { vscode.workspace.isTrusted = false; }]) {
    const vscode = api(); const doc = document('let x=1');
    let resolve;
    const provider = createProvider(vscode, () => new Promise(done => { resolve = done; }));
    const pending = provider.provideDocumentFormattingEdits(doc, {}, cancellation());
    mutate(doc, vscode); resolve('let x = 1\n');
    assert.deepEqual(await pending, []);
  }
});
test('supersedes overlapping requests even with the same document version', async () => {
  const vscode = api(); const doc = document('let x=1'); const resolvers = []; const signals = [];
  const provider = createProvider(vscode, (_, __, signal) => { signals.push(signal); return new Promise(done => resolvers.push(done)); });
  const first = provider.provideDocumentFormattingEdits(doc, {}, cancellation());
  const second = provider.provideDocumentFormattingEdits(doc, {}, cancellation());
  assert.equal(signals[0].aborted, true);
  resolvers[1]('let x = 1\n'); assert.equal(apply(doc, await second), 'let x = 1\n');
  resolvers[0]('let x = 1\n'); assert.deepEqual(await first, []);
  assert.deepEqual(vscode.errors, []);
});
test('cancellation and provider disposal abort active requests and discard late output', async () => {
  for (const dispose of [false, true]) {
    const vscode = api(); const token = cancellation(); let resolve; let signal;
    const provider = createProvider(vscode, (_, __, passed) => { signal = passed; return new Promise(done => { resolve = done; }); });
    const pending = provider.provideDocumentFormattingEdits(document('x'), {}, token);
    if (dispose) provider.dispose(); else token.cancel();
    assert.equal(signal.aborted, true);
    resolve('formatted'); assert.deepEqual(await pending, []);
    assert.deepEqual(vscode.errors, []);
  }
});
test('provides no edits for empty or already-formatted real CLI buffers', async () => {
  const provider = createProvider(api({ executable: defaults.executable }));
  for (const source of ['', 'let x = 1\n']) {
    assert.deepEqual(await provider.provideDocumentFormattingEdits(document(source), {}, cancellation()), []);
  }
});
test('preserves supported interpolation modes through the real CLI', async () => {
  // Revo Parser.zig covers :v, :?, :p and the lone :d atom.
  const provider = createProvider(api({ executable: defaults.executable }));
  const source = 'let t=1\nprint("#{t:v} #{t:?} #{t:p} #{:d}")';
  const expected = 'let t = 1\nprint("#{t:v} #{t:?} #{t:p} #{:d}")\n';
  const doc = document(source);
  assert.equal(apply(doc, await provider.provideDocumentFormattingEdits(doc, {}, cancellation())), expected);
  assert.deepEqual(await provider.provideDocumentFormattingEdits(document(expected), {}, cancellation()), []);
});
test('current compiler syntax rejection returns no edits', {
  skip: process.env.REVOFMT_CURRENT_SYNTAX !== '1',
}, async () => {
  // Revo 71115de requires range-start/step adjacency; e94e6d8 rejects :d modes.
  for (const source of [
    'for i in 0 ..5 do\nprint(i)\nend',
    'for i in 0..2 ..10 do\nprint(i)\nend',
    'let t=1\nprint("#{t:d}")',
  ]) {
    const vscode = api({ executable: defaults.executable });
    const provider = createProvider(vscode);
    const doc = document(source);
    const edits = await provider.provideDocumentFormattingEdits(doc, {}, cancellation());
    assert.deepEqual(edits, [], source);
    assert.equal(apply(doc, edits), source);
    assert.ok(vscode.errors.length > 0, 'syntax rejection must report an error');
  }
});
test('applies real CLI CRLF multiline output exactly in a CRLF buffer', async () => {
  const provider = createProvider(api({ executable: defaults.executable }));
  const doc = document("let x='a\r\nb'\r\nlet y=2\r\n", 2);
  const edits = await provider.provideDocumentFormattingEdits(doc, {}, cancellation());
  assert.equal(apply(doc, edits), "let x = 'a\r\nb'\r\nlet y = 2\r\n");
});
test('already-canceled requests do not start a subprocess', async () => {
  const token = cancellation(); token.cancel();
  const provider = createProvider(api(), () => { assert.fail('canceled launch'); });
  assert.deepEqual(await provider.provideDocumentFormattingEdits(document('x'), {}, token), []);
});
test('counts supplementary characters as two UTF-16 units on the edited line', async () => {
  const provider = createProvider(api({ executable: defaults.executable }));
  const doc = document("print('😀',second)\n");
  const edits = await provider.provideDocumentFormattingEdits(doc, {}, cancellation());
  assert.deepEqual(edits[0].range.start, { line: 0, character: 11 });
  assert.deepEqual(edits[0].range.end, { line: 0, character: 11 });
  assert.equal(apply(doc, edits), "print('😀', second)\n");
});
