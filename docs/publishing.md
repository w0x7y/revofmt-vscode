# marketplace publishing

The first Marketplace upload is pending Microsoft account sign-in. The package
uses extension ID `w0x7y.revofmt`, version `0.1.2`, and the MIT license.

## prepare the upload

From the repository root, with Node.js >=22 and an installed formatter:

```sh
npm ci
REVOFMT_BIN=/absolute/path/to/revofmt scripts/verify
npm run package
```

The upload file is `revofmt-0.1.2.vsix`. It contains the extension runtime,
metadata, README and license. Tests, packaging dependencies and repository-only
guides are excluded. The formatter executable is installed separately.

## GitHub release

The standalone `v0.1.2` release distributes `revofmt-0.1.2.vsix` and its
`SHA256SUMS` manifest. Build the VSIX from the release checkout, then generate
the manifest in the same directory:

```sh
sha256sum revofmt-0.1.2.vsix > SHA256SUMS
sha256sum --check SHA256SUMS
```

Attach both files to the GitHub release. Users can verify the downloaded VSIX
and install it directly without a Marketplace account. GitHub publication and
Marketplace publication are separate; the Marketplace status below still applies.

## publish through the browser

1. Sign in to the [Marketplace publisher page](https://marketplace.visualstudio.com/manage).
2. Select publisher `w0x7y`, or create it if the ID is available and you own it.
3. Choose **New extension**, then **Visual Studio Code**, and upload the VSIX.
4. Wait for Marketplace validation. An uploaded package is not yet a public listing.
5. Check the public listing for `w0x7y.revofmt` and install the Marketplace copy:

```sh
code --install-extension w0x7y.revofmt
```

Verify recognition of `.rv` and `.revo`, formatting of an unsaved buffer,
idempotence and opt-in save formatting in a disposable trusted workspace. Only
after the listing is public should the README recommend Marketplace installation.

The manifest's publisher ID must match an account you can publish through.
Changing it also changes `editor.defaultFormatter` and the extension identity.

## publish through the CLI

With publishing authentication already configured, upload the reviewed package:

```sh
npx --no-install vsce publish --packagePath revofmt-0.1.2.vsix
```

See Microsoft's [publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
for publisher setup and Microsoft Entra authentication. The browser upload does
not require a CLI token. Automatic Marketplace publishing is not configured in
this repository; the existing CI verifies tests and produces a VSIX artifact.

## current status

On 2026-10-07, publishing preparation checked the manifest and account access.
No local publishing credential or signed-in Marketplace session was available.
The owner chose to handle Microsoft sign-in later. No Marketplace upload has
been made as part of this preparation.

All 52 unit and process checks passed against the real release formatter. The
rebuilt VSIX contains 10 files; its runtime and license match this checkout, and
its README links resolve to the public repository. Native host verification is
recorded separately in the [development guide](development.md#standalone-verification).
