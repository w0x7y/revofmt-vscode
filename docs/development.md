# Development and verification

This package was extracted from `revo-formatter/editors/vscode` at commit
`14bafd8ede11829157d0bd15ebd01cc667c4efaa`. Its runtime source and MIT license
are unchanged. The standalone package owns metadata, test launchers, packaging
and documentation. It retains extension ID `w0x7y.revofmt`.

## Run the tests

Use Node.js >=20, npm and an installed `revofmt`. Packaging requires Node.js
>=22. Unit and process tests need no installed npm dependencies:

```sh
npm test
REVOFMT_BIN=/absolute/path/to/revofmt scripts/verify
```

The test executable defaults to `revofmt` on PATH. `REVOFMT_BIN` overrides it.
The tests exercise real CLI transport and a VS Code API test double for
provider registration, edit application, workspace trust, document lifecycle
and cancellation. Controlled subprocesses cover malformed output, byte limits,
termination, inherited output pipes, and native launcher cleanup. These tests
do not start VS Code.

## Run the native host test

An installed desktop VS Code, a working display and an absolute formatter path
are required. The runner downloads no tools and keeps personal settings unchanged:

```sh
REVOFMT_BIN=/absolute/path/to/revofmt npm run test:host
REVOFMT_BIN=/absolute/path/to/revofmt VSCODE_BIN=/absolute/path/to/code npm run test:host
```

It opens a separate window with temporary user settings, an empty extensions
directory and a disposable trusted workspace. It checks both file suffixes,
automatic language activation, native formatting provider edits, exact output
from unsaved buffers, no backing-file writes, and idempotence.

The runner waits up to 60 seconds for an atomically published host result, even
when a `code` wrapper exits early with code zero. Signals and nonzero launcher
exits fail promptly. It closes only its isolated host and removes successful
temporary data. Failures retain logs and results. Set `REVOFMT_HOST_KEEP=1` to
retain a successful run too.

After signaling shutdown, cleanup waits up to two seconds for the isolated
process group to exit, including hosts whose launcher already exited. On Windows
it tracks the direct launcher process. If shutdown cannot be confirmed, the
runner force-terminates that isolated target, retains the profile and reports
failure. Regressions check delayed profile writes from both direct hosts and
early-exiting wrappers, plus evidence retention when shutdown exceeds its deadline.

The test does not establish minimum-version compatibility, remote workspace
behavior, Restricted Mode, undo, save actions or every line-ending edge case.
For additional manual checks, use a disposable workspace and exercise those
behaviors after installing a freshly rebuilt VSIX.

## Build the VSIX

```sh
npm ci
npm run package
```

The pinned development-only `@vscode/vsce` builds `revofmt-0.1.4.vsix`.
The installed extension has no runtime npm dependencies. `.vscodeignore` excludes
tests, npm dependencies, lockfiles and repository-only guides from the archive.
Runtime source, package metadata, `images/icon.png`, README and the MIT license
are included.
Rebuild whenever any of those files change.

The CI workflow downloads formatter `v0.1.2` for Linux x86_64 GNU and verifies
SHA-256 `515bc4c74e20f52b111310d27c63fe3bbf33bf58ed17c181815ac39408e3cb6e`.
Update the formatter release and checksum together after verifying a new release.
CI enables `REVOFMT_CURRENT_SYNTAX=1`, runs the adapter tests and builds the
VSIX; it does not start a native editor.

## Buffer preservation

The CLI validates syntax, exact token/comment bytes and idempotence. The adapter
bounds source and stdout at 262,144 UTF-8 bytes and stderr at 65,536 bytes. It
rejects lone UTF-16 surrogates and invalid UTF-8 output. It applies only successful
current results, with one contiguous edit using UTF-16 positions.

VS Code normalizes inserted line breaks to the document's LF or CRLF setting.
The adapter checks that applying this normalization still produces the exact
CLI output. If the edit cannot represent those bytes, it reports an error and
returns no edit. Mixed endings in untouched buffer regions remain unchanged.
VS Code may already normalize mixed raw-file endings during loading; the
adapter cannot recover bytes lost before it runs.

Cancellation, timeouts, nonzero exits, signals, changed or closed documents and
superseded requests produce no edits. Failures terminate the direct child.
Custom wrappers own any independently running descendants. Save-time whitespace
passes and other extensions can also change literals, so keep the documented
language-specific save overrides when using format-on-save.

## Standalone verification

On 2026-10-07, all 52 tests passed with the real formatter. The native host
regression passed on Linux x86_64 GNU with VS Code 1.140.0 and extension 0.1.2.
It recognized both suffixes, activated automatically, formatted unsaved buffers
and reached a fixed point without changing the backing files.

The VSIX was built and installed into an isolated VS Code profile. Its runtime
bytes and full license match this checkout, and it excludes tests and npm
dependencies. README examples, relative links and manifest/lockfile versions
were checked. These checks did not modify personal editor settings.

## Marketplace publishing

The [publishing guide](publishing.md) covers the reviewed VSIX upload, publisher
identity and listing validation.

## API references

- [Formatting providers](https://code.visualstudio.com/api/language-extensions/programmatic-language-features#format-source-code-in-an-editor)
- [Workspace trust](https://code.visualstudio.com/api/extension-guides/workspace-trust)
- [Remote extension hosts](https://code.visualstudio.com/api/advanced-topics/remote-extensions)
- [VSIX packaging](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
