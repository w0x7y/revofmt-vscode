# marketplace publishing

The replacement Marketplace upload is being prepared. The package
uses extension ID `w0x7y.revo-formatter`, version `0.1.7`, display name
`Revofmt Code Formatter`, and the MIT license.

## prepare the upload

From the repository root, with Node.js >=22 and an installed formatter:

```sh
npm ci
REVOFMT_BIN=/absolute/path/to/revofmt scripts/verify
npm run package
```

The upload file is `revo-formatter-0.1.7.vsix`. It contains the extension runtime,
metadata, the 512 × 512 PNG icon in `images/icon.png`, README and license.
Tests, packaging dependencies and repository-only
guides are excluded. The formatter executable is installed separately.

## GitHub release

The standalone `v0.1.7` release distributes `revo-formatter-0.1.7.vsix` and its
`SHA256SUMS` manifest. Build the VSIX from the release checkout, then generate
the manifest in the same directory:

```sh
sha256sum revo-formatter-0.1.7.vsix > SHA256SUMS
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
5. Check the public listing for `w0x7y.revo-formatter` and install the Marketplace copy:

```sh
code --install-extension w0x7y.revo-formatter
```

Verify recognition of `.rv` and `.revo`, formatting of an unsaved buffer,
idempotence and opt-in save formatting in a disposable trusted workspace. Only
after the listing is public should the README recommend Marketplace installation.

For later releases, select the existing extension and choose **More Actions** →
**Update**, then upload the new VSIX. Removing an extension permanently reserves
its name, including for its original publisher; see Microsoft's
[removal policy](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#removing-extensions).

The manifest's publisher ID must match an account you can publish through.
Changing it also changes `editor.defaultFormatter` and the extension identity.

## publish through the CLI

With publishing authentication already configured, upload the reviewed package:

```sh
npx --no-install vsce publish --packagePath revo-formatter-0.1.7.vsix
```

See Microsoft's [publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
for publisher setup and Microsoft Entra authentication. The browser upload does
not require a CLI token. Automatic Marketplace publishing is not configured in
this repository; the existing CI verifies tests and produces a VSIX artifact.

## current status

On 2026-10-09, publisher `w0x7y` was available in the public Marketplace.
Uploading version `0.1.4` as a new extension failed because the name `revofmt`
already exists. Version `0.1.5` introduced the replacement ID
`w0x7y.revo-formatter`; version `0.1.6` updated the icon with a smaller R and
small `fmt` text. The next Marketplace upload failed because the display name
`Revo Formatter` is taken. Version `0.1.7` uses `Revofmt Code Formatter` as its
display name and settings title. The extension ID, icon and runtime are unchanged.

GitHub publication provides the reviewed package. The new display name still
requires Marketplace acceptance and validation. If the `revo-formatter` listing
already exists, use its **Update** action.

All 56 unit and process checks passed against formatter `0.1.2` with current
syntax checks enabled. The rebuilt VSIX contains 11 files. Its manifest version,
icon declaration, PNG bytes, runtime and license match this checkout. The icon
is 512 × 512 and retains the original outer-corner alpha mask.

The [icon editing record](icon.md) includes the generation prompt and asset
preparation. The separate native host check is documented in the
[development guide](development.md#run-the-native-host-test).
