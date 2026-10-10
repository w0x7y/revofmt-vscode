'use strict';
const vscode = require('vscode');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

exports.run = async function () {
  const workspace = vscode.workspace.workspaceFolders[0].uri;
  const resultPath = path.join(workspace.fsPath, 'result.json');
  const evidence = { vscodeVersion: vscode.version, files: [] };
  try {
    assert.equal(vscode.workspace.isTrusted, true);
    const extension = vscode.extensions.getExtension('w0x7y.revo-formatter');
    assert.ok(extension, 'Revo Formatter extension was not discovered');
    evidence.extensionVersion = extension.packageJSON.version;
    for (const suffix of ['rv', 'revo']) {
      const uri = vscode.Uri.joinPath(workspace, `example.${suffix}`);
      const document = await vscode.workspace.openTextDocument(uri);
      assert.equal(document.languageId, 'revo', `.${suffix} language recognition`);
      await vscode.window.showTextDocument(document);
      const deadline = Date.now() + 5000;
      while (!extension.isActive && Date.now() < deadline) await delay(25);
      evidence.activeBeforeFormatting = extension.isActive;
      assert.equal(extension.isActive, true, 'Opening a Revo document must automatically activate its formatter');

      // Change only the native buffer. A provider reading the file instead of
      // stdin would format x=1 and fail the literal expected-output assertion.
      const unsaved = new vscode.WorkspaceEdit();
      unsaved.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), 'let x=2');
      assert.equal(await vscode.workspace.applyEdit(unsaved), true);
      assert.equal(document.isDirty, true);
      const options = { tabSize: 4, insertSpaces: true };
      const edits = await vscode.commands.executeCommand('vscode.executeFormatDocumentProvider', uri, options);
      assert.ok(edits?.length, `No native formatter edits for .${suffix}`);
      const formatted = new vscode.WorkspaceEdit();
      formatted.set(uri, edits);
      assert.equal(await vscode.workspace.applyEdit(formatted), true);
      assert.equal(document.getText(), 'let x = 2\n');
      assert.equal(await fs.readFile(uri.fsPath, 'utf8'), 'let x=1', 'Formatting must not write the backing file');
      const again = await vscode.commands.executeCommand('vscode.executeFormatDocumentProvider', uri, options);
      // The native command returns undefined when providers produce no edits.
      assert.ok(again === undefined || again.length === 0, 'Formatting the native buffer must be idempotent');
      assert.equal(document.getText(), 'let x = 2\n');
      evidence.files.push({ suffix, language: document.languageId, output: document.getText(), unsaved: document.isDirty });
      await vscode.commands.executeCommand('workbench.action.files.revert');
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    }

    // The provider passes a file-backed document's real fsPath, so the nearest
    // revofmt.toml overrides the editor's default space indentation.
    const options = { tabSize: 4, insertSpaces: true };
    const configuredUri = vscode.Uri.joinPath(workspace, 'configured', 'example.rv');
    const configured = await vscode.workspace.openTextDocument(configuredUri);
    await vscode.window.showTextDocument(configured);
    const configuredEdits = await vscode.commands.executeCommand('vscode.executeFormatDocumentProvider', configuredUri, options);
    assert.ok(configuredEdits?.length, 'No native formatter edits for the configured project');
    const configuredEdit = new vscode.WorkspaceEdit();
    configuredEdit.set(configuredUri, configuredEdits);
    assert.equal(await vscode.workspace.applyEdit(configuredEdit), true);
    assert.equal(configured.getText(), 'do\n\tfoo()\nend\n', 'revofmt.toml must take precedence for a file-backed document');
    assert.equal(await fs.readFile(configuredUri.fsPath, 'utf8'), 'do\nfoo()\nend', 'Formatting must not write the backing file');
    evidence.configured = { scheme: configured.uri.scheme, output: configured.getText() };
    await vscode.commands.executeCommand('workbench.action.files.revert');
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

    // An untitled document has no path, so no project file is searched and the
    // editor settings (two spaces) apply.
    const untitled = await vscode.workspace.openTextDocument({ language: 'revo', content: 'do\nfoo()\nend' });
    assert.equal(untitled.uri.scheme, 'untitled');
    await vscode.window.showTextDocument(untitled);
    const untitledEdits = await vscode.commands.executeCommand('vscode.executeFormatDocumentProvider', untitled.uri, options);
    assert.ok(untitledEdits?.length, 'No native formatter edits for the untitled document');
    const untitledEdit = new vscode.WorkspaceEdit();
    untitledEdit.set(untitled.uri, untitledEdits);
    assert.equal(await vscode.workspace.applyEdit(untitledEdit), true);
    assert.equal(untitled.getText(), 'do\n  foo()\nend\n', 'Editor settings must apply to an untitled document');
    evidence.untitled = { scheme: untitled.uri.scheme, output: untitled.getText() };
    await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
    evidence.success = true;
  } catch (error) {
    evidence.success = false;
    evidence.error = error.stack;
    throw error;
  } finally {
    // Atomic publication prevents the parent poll from reading partial JSON.
    await fs.writeFile(`${resultPath}.tmp`, JSON.stringify(evidence, null, 2));
    await fs.rename(`${resultPath}.tmp`, resultPath);
  }
};
