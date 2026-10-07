# `revofmt-vscode`, revo formatting in vs code

open a `.rv` or `.revo` file, run **Format Document**, get formatted code.
it works on your unsaved buffer. format-on-save is off until you enable it.

[get started](#get-started) | [settings](#settings) | [format on save](#format-on-save) | [develop](#develop)

## get started

you need vs code >=1.85 and [revofmt](https://github.com/w0x7y/revo-formatter).
[download the formatter](https://github.com/w0x7y/revo-formatter#get)
or [build it](https://github.com/w0x7y/revo-formatter#build-from-source).
the download is for linux x86_64 GNU, with glibc >=2.34 and `libgcc_s`.
this extension doesn't install the formatter for you.

check that it's on your PATH:

```sh
revofmt --version
```

with node.js >=22 and npm, clone and package the extension:

```sh
git clone https://github.com/w0x7y/revofmt-vscode.git
cd revofmt-vscode
npm ci
npm run package
code --install-extension revofmt-0.1.2.vsix
```

you can also use **Extensions: Install from VSIX** in the command palette.
this is a local VSIX install, not a marketplace release.

open a `.rv` or `.revo` file in a trusted workspace. the language should say
`Revo`. run **Format Document** on this:

```revo
let x=1
```

and you get:

```revo
let x = 1
```

if another formatter is selected, use **Format Document With** and choose
**Revo Formatter**. for an untitled document, select `Revo` as the language first.
use your existing language extension for highlighting, completion and diagnostics.

## settings

these are the defaults. put your changes in vs code's `settings.json`:

```json
{
  "revofmt.executable": "revofmt",
  "revofmt.indentWidth": 2,
  "revofmt.lineWidth": 80,
  "revofmt.timeoutMs": 5000
}
```

if vs code can't find the formatter, set `revofmt.executable` to its absolute
path. paths are literal; `~`, environment variables and shell commands aren't
expanded. indentation accepts `1` to `8` spaces. width accepts `20` to `240`
columns and is a soft target. the timeout is in milliseconds, from `1` to
`2147483647`.

formatting runs only in trusted workspaces. review a workspace's executable
setting before trusting it. in SSH, containers or WSL, install the extension
and formatter in that environment and use a path that exists there.
browser-only and virtual workspaces aren't supported.

## format on save

add this to your user or workspace settings to opt in:

```json
{
  "[revo]": {
    "editor.defaultFormatter": "w0x7y.revofmt",
    "editor.formatOnSave": true,
    "editor.formatOnSaveMode": "file",
    "files.trimTrailingWhitespace": false,
    "files.insertFinalNewline": false,
    "files.trimFinalNewlines": false
  }
}
```

keep the three `files` settings `false`. separate save actions can change
whitespace inside multiline strings and comments, even when formatting fails.
check other extensions' save actions too.

## what it preserves

revofmt checks syntax, literal and comment bytes, and that formatting twice
gives the same result. the extension applies only successful current output.
failed, canceled, stale or timed-out requests leave the buffer alone.

UTF-8 LF and CRLF buffers are supported. edits that would change opaque bytes
through vs code's line-ending normalization are rejected. vs code may already
normalize mixed raw-file endings when it opens a file.
source and stdout are limited to 262,144 bytes, stderr to 65,536 bytes.
[the development guide](docs/development.md#buffer-preservation) has the details.

## develop

with node.js >=20 and an installed formatter:

```sh
npm test                               # revofmt on PATH
REVOFMT_BIN=/absolute/path/to/revofmt scripts/verify
```

the 49 tests cover real CLI formatting, byte preservation, document changes,
workspace trust, cancellation, deadlines and process cleanup.

with a desktop vs code and a working display, run the separate native host test:

```sh
REVOFMT_BIN=/absolute/path/to/revofmt npm run test:host
```

it uses a disposable workspace and temporary settings. your personal settings
stay unchanged. see [development and packaging](docs/development.md) for the
host test's scope and how to rebuild the VSIX.

## credits

[MIT](LICENSE). started in `revo-formatter/editors/vscode` at commit
`14bafd8ede11829157d0bd15ebd01cc667c4efaa`.
the formatter uses [revo](https://github.com/if-not-nil/revo), also MIT.
