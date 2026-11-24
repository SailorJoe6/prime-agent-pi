# Prime Agent Pi release engineering

See the [product contract](product-contract.md#3-versions-channels-and-support)
for public version policy. The examples below are fixtures, not version bumps
or parity claims.

## Release identity

Use the public version and, for a preview only, a positive preview sequence.
All components are decimal integers without leading zeroes and must fit in a
JavaScript safe integer. A missing fourth public component means revision zero;
`0.10.2.0` compares equal to `0.10.2`. Emit the three-component spelling for
revision zero and the four-component spelling for positive repair revisions.

| Public version | Channel and sequence | Internal package version |
| --- | --- | --- |
| `0.10.2` | stable | `0.10.2` |
| `0.10.2.2` | stable | `0.10.2+pi.2` |
| `0.10.2` | preview 10 | `0.10.2-preview.10` |
| `0.10.2.2` | preview 10 | `0.10.2-preview.10+pi.2` |

The shared [Pi release version module](../packages/coding-agent/src/utils/pi-release-version.ts)
orders releases by all four public components numerically and then by preview
sequence. A stable release sorts after all previews of the same public version.
Stable selection excludes previews. Opting into previews considers both channels,
so stable promotion at the same public version supersedes the preview. For an
explicit rollback, use the selected older release's identity and verified bytes;
being older must not disqualify the requested rollback.

Do not use npm SemVer precedence or dependency ranges to distinguish Pi repair
revisions: SemVer ignores build metadata for precedence. The package encoding is
for staged manifests only. Release tooling must carry the public version and
source SHA separately and verify the staged lockstep dependencies. The local
pack smoke below does not change workspace versions, release discovery, the
production installer, or runtime update behavior.

Run the focused tests from `packages/coding-agent`:

```sh
npx tsx ../../node_modules/vitest/dist/cli.js --run test/pi-release-version.test.ts
```

## Local pack and install smoke (PAPI-61)

From the repository root on macOS, with the project dependencies installed in
an npm cache, build with small fixture catalogs and run:

```sh
npm ci --no-audit --no-fund
npm run catalog:assets -- --fixture
node_modules/.bin/tsgo -p packages/tui/tsconfig.build.json
node_modules/.bin/tsgo -p packages/ai/tsconfig.build.json
node_modules/.bin/tsgo -p packages/agent/tsconfig.build.json
node_modules/.bin/tsgo -p packages/coding-agent/tsconfig.build.json
npm run copy-assets --workspace packages/coding-agent
npm run bundle --workspace packages/coding-agent
artifacts="$(node scripts/pack-prime-agent-pi-local.mjs 0.10.2.10 --preview-sequence 3)"
node scripts/smoke-pi-local-pack.mjs "$artifacts" "$(npm config get cache)"
```

The packer stages private manifests outside the checkout. It retains the three
scoped library package names, brands the CLI package `prime-agent-pi`, and keeps
`prime-agent` as the executable. All four tarballs use the same internal
version and carry the public version and source HEAD in `piRelease`. Keep the
archives together: internal dependencies use sibling `file:` tarball paths, not
SemVer ranges or registry URLs. `pi-pack-receipt.json` records the identity and
SHA-256 of each tarball; it is not production update metadata.

The smoke script seeds a disposable install from third-party entries in the
workspace lockfile and installs with npm offline and lifecycle scripts disabled.
It verifies the installed Pi entries resolve to those four local tarballs and
loads one extension through the installed CLI with a disposable HOME. The
extension imports a runtime export from each existing `@earendil-works` entry
point. The warm npm cache is required for third-party packages; this is not an
air-gapped cold-cache installer or a test of direct Node resolution of the old
coding-agent package name outside the extension loader.

Observed on Darwin arm64, Node 25.6.0 / npm 11.19.0: 272 packages installed;
all four extension imports passed. A modified tarball was rejected by the
checksum check. The receipt recorded HEAD `e835c05a8b5b523db3a088494e15ad2604d004b5` with
`sourceDirty: true` (uncommitted slice 2 pack tooling). `npm run check` and
`npm run check:test-policy` also passed. These were fixture archives:

| File | SHA-256 |
| --- | --- |
| `earendil-works-pi-ai-0.10.2.10-preview.3.tgz` | `a4121bfed55353ac43b50ee16a73d535d3e232995861c1885b290998c73ef077` |
| `earendil-works-pi-tui-0.10.2.10-preview.3.tgz` | `c8d0e4d3517f75909e0f5839a239a03500c1f3c09e45da6aed4e18b78ada4abb` |
| `earendil-works-pi-agent-core-0.10.2.10-preview.3.tgz` | `dd9359e7dc356e2b15c6eba8829b9f1bdc4f92065f7d3b3d91a93f27fc5bd0ad` |
| `prime-agent-pi-0.10.2.10-preview.3.tgz` | `62df04f6d01281e63677966183a5a5f2951e7889a493960942c8a34988651361` |

This does not verify native archives or additional platforms, runtime public
version display, production catalog assets, release CI, or install → update →
rollback with preserved state. No release artifacts were published.

## Nonpublishing native archive build (PAPI-61)

The standalone workflow has a manual build-only mode for the eight targets in
`release-platforms.mjs`. Supply a Pi public version, an optional preview
sequence, and the exact catalog commit. The workflow uses read-only repository
permissions and uploads only Actions artifacts after extraction smoke tests.
The existing reusable workflow path is unchanged; the Pi mode does not invoke
an installer, release writer, or upload to npm or R2.

To build a single target locally with Node, Bun 1.4.0, locked npm dependencies,
and a clean checkout of the real catalog next to the source:

```sh
npm ci
catalog=../prime-agent-catalog
out="$(mktemp -d)/native"
node_modules/.bin/tsx scripts/build-pi-native-archive.mjs \
  darwin-arm64 "$catalog" "$out" 0.10.2.10 3
bash scripts/smoke-pi-native-archive.sh "$out" darwin-arm64
```

Use the target's runner architecture and native dependencies from the workflow.
The musl smoke runs in Alpine. The version above is a test identity, not a
parity claim. The archive retains `prime-agent`, the runtime assets, and the
license. It omits the inherited `install.sh`; the Pi installer and feed are
separate work. `pi-release.json` and staged `package.json` carry the target,
public version, channel, package encoding, source commit, source dirty flag,
and catalog commit. The runtime reports `0.10.2.10-preview.3` in this example.
Keep `SHA256SUMS` and `pi-native-<target>.json` alongside the archive; the receipt
includes the archive and executable hashes. Neither file is an update manifest.

Local validation used real catalog `01f4d46dd5157ec73f8faf440214088237c81d59`
(1,209 models, 42 transport tuples, 69 MCP services), Bun 1.4.0, Node 25.6.0,
and source base `8110435d5bbda284bae3f34b813220bb3c425725` with `sourceDirty: true`.
Both archives passed checksum and extracted `--version` and `--help` probes
without a JavaScript runtime on PATH: macOS ARM64 natively, Linux ARM64 musl in
Docker Desktop ARM64 Alpine 3.21. This proves these local builds, not the exact
candidate commit or a release. The other six targets require matrix evidence:
`darwin-x64`, `linux-arm64`, `linux-x64`, `linux-x64-baseline`,
`linux-x64-musl`, and `linux-x64-musl-baseline`.

| Target | Archive SHA-256 | Executable SHA-256 |
| --- | --- | --- |
| `darwin-arm64` | `97f84827ada498ad80601d22280a64faa71c969c1f4a6e9fff83df651fea731d` | `2f7e2564d09db3507b5a2cf0c00ce0682922f30582142fe8e280502023923c34` |
| `linux-arm64-musl` | `8e9145fa028b98db05ab57cb35343acce1cb963078f2f6534b0151d9fea29ae7` | `1f4d8fd90c2a73c2fe9bada56a57d9c5b6693ec4fa32a4dcb2558d5c3c9467b0` |

Windows Bash and Android Termux source routes are unchanged and were not tested
in this slice. No publication, feed, update, or rollback behavior was tested.

## Tagged GitHub Release manifest and discovery (PAPI-61)

Pi release tags use `pi-vX.Y.Z[.R][-preview.N]`. Omit a zero repair revision;
use a positive numeric preview sequence and mark preview releases as GitHub
prereleases. The manifest and downloads live under the same tag in
`SailorJoe6/prime-agent-pi`, never under a moving channel tag. Use one clean
source commit and one catalog commit across all eight native targets.

To prepare metadata offline, collect the eight tested workflow artifacts as
separate directories under one parent (or flatten the receipts and archives).
Then supply the installer bytes and an output directory:

```sh
node_modules/.bin/tsx scripts/build-pi-release-manifest.ts \
  "$artifacts" "$installer" "$output"
```

The command only produces `pi-release-manifest.json` and `SHA256SUMS`; it does
not copy the archives or installer or make network calls. The manifest records
schema version, canonical tag, public version, channel, optional preview
sequence, package version, source/catalog SHAs, and exactly one entry per
native target with archive and executable SHA-256. The installer is named
`install-pi.sh` on the release and also has a SHA-256 entry. The manifest is
not a signature or proof that the assets were validated for publication.

The read-only discovery helper lists Pi GitHub Releases and selects the newest
complete candidate numerically. By default it considers stable releases only;
preview opt-in considers stable and prerelease candidates together. It skips
legacy tags, drafts, mismatched channels, incomplete listings, and manifests
that do not match their tag or asset naming contract. If GitHub reports a
SHA-256 digest for the installer or any of the eight archives, discovery skips
the candidate on disagreement with the tagged manifest. Missing or null
digests do not disqualify a release. Discovery returns the tagged asset URL
prefix and validated metadata, not verified download bytes. A caller
must verify bytes before use and must not treat an older complete candidate as
permission to downgrade.

Offline smoke: the builder consumed all eight archives and receipts from
[Actions run 45310741960](https://github.com/SailorJoe6/prime-agent-pi/actions/runs/45310741960)
at source `8583ed3dd3f613a11b67c971cd0784a3645e9257`, plus an installer fixture
with the exact bytes `#!/bin/sh\nexit 71\n`. It produced tag
`pi-v0.10.2.10-preview.3` and manifest SHA-256
`bfcbca8b8de6b973db48b21644977a38e470eae2be7ca5f93ecbadcbdb5ed27b`.
The builder checked all eight archive hashes; executable hashes came from
the already-verified receipts. Discovery used simulated GitHub responses.

## Native install, update, and repair (PAPI-61)

When a Pi release is published, ship the bytes from `install.sh` as
`install-pi.sh` alongside the tagged manifest, `SHA256SUMS`, and archives.
This repository does not yet publish that installer. For a manual install or
repair, choose an exact stable tag from [Pi Releases](https://github.com/SailorJoe6/prime-agent-pi/releases),
or deliberately choose a preview tag. From a new empty directory:

```sh
(
  set -eu
  tag=pi-vX.Y.Z                 # Substitute the exact published tag.
  base="https://github.com/SailorJoe6/prime-agent-pi/releases/download/$tag"
  curl -q --proto '=https' --proto-redir '=https' -fsSL "$base/install-pi.sh" -o install-pi.sh
  curl -q --proto '=https' --proto-redir '=https' -fsSL "$base/SHA256SUMS" -o SHA256SUMS
  awk '$2 == "install-pi.sh" { print; n++ } END { if (n != 1) exit 1 }' SHA256SUMS > installer.sha256
  if command -v sha256sum >/dev/null; then
    sha256sum -c installer.sha256
  else
    shasum -a 256 -c installer.sha256
  fi
  PRIME_AGENT_PI_TAG="$tag" sh ./install-pi.sh "${tag#pi-v}"
)
```

Startup checks only release metadata. `prime-agent update` and `/update`
use the same tagged feed for managed native installs. Stable is the default;
`--preview` opts in (`--nightly` is a compatibility alias). After the existing
confirmation path, the updater checks the tagged installer's actual SHA-256
before writing it to a private staging directory for execution. The installer
checks the selected archive against the tagged inventory and, for updater
invocations, requires the inventory to agree with the pinned manifest digest.
It verifies the downloaded bytes before extraction and probes the executable
before changing the launcher. Missing or mismatched assets leave the active
release in place. The checksums verify transfer integrity, not publisher identity
independently of GitHub.

The managed root and user state paths do not change. The installer retains its
verified bytes alongside the active release for offline `update --rollback`.
Existing local managed legacy targets remain supported for intentional rollback;
source or unmanaged installs use their original explicit setup route. Pi checks
and managed forward updates do not fall back to a legacy mirror or npm registry.

For local integration validation, run `npm run check` from the repository root
and the focused suites from `packages/coding-agent`:

```sh
../../node_modules/.bin/tsx ../../node_modules/vitest/dist/cli.js --run \
  test/version-check.test.ts test/native-update.test.ts test/package-command-paths.test.ts \
  test/native-installer.test.ts test/pi-release-discovery.test.ts test/pi-release-version.test.ts
```

The shell check uses disposable archive and transport fixtures for stable install,
preview replacement, checksum rejection, and local rollback. TypeScript tests
mock GitHub metadata and installer bytes; they do not publish a release or
exercise production downloads. The Docker evidence below is a separate local
validation, not publication-gate proof.

### Exact-candidate Docker lifecycle (PAPI-61)

Built from clean `a8b6aa3338f1863121aafd9ef895e0e8b737c419` and catalog
`01f4d46dd5157ec73f8faf440214088237c81d59`, with Node 25.6.0 and Bun 1.4.0.
These are two real `linux-arm64-musl` archives from the same source tree. Their
version labels are local fixtures, not published versions or parity claims.

| Fixture | Archive SHA-256 | Executable SHA-256 |
| --- | --- | --- |
| `0.10.2.1` | `4d7f32bf488b160c021f2a66f70213ccd454908ed4424727b77981f0880d0c7e` | `a44a94406bbc47e95cd74b54ceafb5d3d29841a8e64fcf87a56ffc68993cf7fb` |
| `0.10.2.2` | `1757e01e1a54f0cdca890a20c3837b7fafa2be45a11bcc66666b14144abe933d` | `c186d178cc1844bbcd07cccc70b5e78a4723be8e1f2a401252e449c83eb75eed` |

```sh
node scripts/build-pi-native-archive.mjs linux-arm64-musl "$CATALOG" "$OUT/old" 0.10.2.1
node scripts/build-pi-native-archive.mjs linux-arm64-musl "$CATALOG" "$OUT/new" 0.10.2.2
(cd "$OUT/old" && shasum -a 256 -c SHA256SUMS)
(cd "$OUT/new" && shasum -a 256 -c SHA256SUMS)
```

Both runs used Docker 29.9.3, `--pull never --network none --platform linux/arm64`,
Alpine 3.21.10 (`alpine@sha256:bc21487101ae47172509130ee1092cc273a831968d64b617776d1f69c81e42ab`),
and disposable HOME and install roots. The bare image needs `libstdc++.so.6`.
Both signed Alpine `libgcc` and `libstdc++` APKs (14.2.0-r4, aarch64) were
checksum-checked and installed inside the containers with `apk --no-network`.
A loopback HTTPS fixture supplied the release API and tagged payloads. The app
used its real fetch path; the shell installer used a local-only curl substitute.
Only the selected target had real archive bytes; the other manifest entries were
metadata fixtures. No live release or model provider was contacted.

- **CLI:** `PRIME_AGENT_PI_TAG=pi-v0.10.2.1 sh install-pi.sh 0.10.2.1`,
  then `prime-agent update`, then `PI_OFFLINE=1 PI_SKIP_VERSION_CHECK=1
  prime-agent update --rollback` after shutting down the fixture and verifying
  connection refusal. Exit 0. Active versions were `0.10.2.1` → `0.10.2.2` →
  `0.10.2.1`; executable bytes and archive activation hashes matched the receipts,
  and the previous target swapped on rollback. Settings, synthetic auth,
  extension, skill, and session files stayed byte-identical. Each active build
  loaded a legacy public TypeScript extension and exported the original session
  UUID and transcript. The extension registered a tool and command without
  invoking a model.
- **Terminal:** An Expect driver used a real Docker TTY and a faux model.
  `/resume` and `/session` showed the original transcript, file and session ID.
  Declining `/update --self --preview` kept stable `0.10.2.1`; confirming it
  selected stable `0.10.2.2` from the fixture and saved the preview opt-in as
  `nightly`. The same TTY relaunched into the new executable with `--resume`;
  the replacement daemon and worker used the new executable. The UI rendered
  both original messages and a restore notice. The session kept its original
  records and appended `prime-agent.update_complete`. The driver timed out on a
  post-restore status command sent before the editor was ready. Post-restore
  status rendering and Ctrl-D were not verified; the process, settings and
  session observations were captured independently before container removal.

`npm run check` and nine focused Vitest suites passed on the tested source
(188 tests, shuffle seed 61): native update, version check, settings, self-update
with daemon, interactive relaunch, extension runner, daemon extension binding,
and IPython bootstrap and provisioner. The Python tests were source-level;
no packaged kernel or Orca/Prime Claw integration was exercised in Docker.
That lifecycle run does not cover preview archive bytes, other targets, live
downloads, parity, or publication gates.

### Packaged compatibility checks (PAPI-61 AC4, partial)

These checks reuse the exact `0.10.2.2` Linux ARM64 musl archive above. Both the
archive and extracted executable matched their SHA-256 receipts. Each run used
Docker `--pull never --network none`, a disposable home and synthetic state.
The Alpine runs used the same image and offline APKs as the lifecycle check.

| Check | Observed result | Limits |
| --- | --- | --- |
| Released v0.9.8 → Pi → v0.9.8 | Both native installers used the same home, install root, and public `prime-agent` path. Pi reopened the session generated by v0.9.8 with `prime-agent --resume <session>` and displayed its title and transcript. Both versions ran the unchanged TypeScript extension's `session_start` hook and `/ac4-probe` command. Settings, synthetic auth, models and extension stayed byte-identical; Pi preserved all seven original session records byte-for-byte as a prefix. Offline `prime-agent update --rollback` restored v0.9.8 and the old hook confirmed the same session UUID. Expect and container exited 0. | Explicit install and resume, not upstream discovery of Pi. The custom tool was registered but not invoked; custom header display and post-rollback TUI reopen were not verified. |
| Packaged Python-first | Native CLI `--mode json --no-session` with no tool-selection flags exposed only `ipython` to the in-process faux provider. Real uv 0.10.6 and CPython 3.11.14 created the normal new kernel venv using staged, hash-locked dependencies and the packaged sidecar. Two tool calls returned `323` and `423`, reusing the variable and Python PID. CLI and verifier exited 0. | Eight optional Python skill installs warned in the offline fixture. This does not verify skill bootstrap or online dependencies. |
| Orca headless terminal | Packaged Orca 1.4.247 (Orcad `0.1.0+6d98aea078af`) resolved the exact local setup and test worktree. A nonce verified real PTY execution before `orca agent launch --agent prime-agent --surface terminal`; `orca terminal wait --for tui-idle` succeeded. The terminal was visible, connected, and writable. The durable session header matched the terminal launch and worktree, with no assignment. | ARM64 glibc test image with a container-local musl loader and libraries for Pi. Does not cover Desktop/chat, remote pairing, assignment routing, recovery, or the Prime Claw plugin. |
| Prime Claw | Not run. At Prime Claw `177be95655a01024bb2db3a1acfb3c9d2342718a`, `docs/prime-agent-installation.md` and DD-003 qualify only the exact `cwd-fix-v0.9.8-r1` source (`a1faacd53ac4473a75de1d434afaf50945c2f647`). DD-005 specifies Docker isolation but does not authorize a new target. | This is a qualification-policy gap, not observed Pi incompatibility. Requires explicit operator approval for the exact Pi candidate and an approved Docker-only qualification input. |

The v0.9.8 baseline was upstream release ID `399563237`, tag `v0.9.8`
(`7d442aafa985f9342134fac16c2ef41f03fb45c1`), ARM64 musl asset `599337808`.
Archive SHA-256 `c929ff09d604ca066bae2f7ed1aeab509a5720122efe1e99347e827539645452`
matched both the published checksum and GitHub asset metadata. The Orca probe
used local image ID `sha256:b4d14e40ed274e02497f48e7f4363b805a64ac92cf76f3bef1739016f5576659`;
its build recorded the official AppImage SHA-256
`f0721401bb5095e2b78fd05ecd21b63556c216efa08d24dbf922f63c874601a8`.
The extracted Orca version was verified; the original AppImage was not rehashed
in this probe.

`npm run check:test-policy` passed. These checks are limited to the workflows
above. They do not establish full API compatibility, Prime Claw qualification,
other platform behavior, upstream parity or publication readiness. No live
provider, operator runtime, or release was changed.

## Publication decisions (fixture only)

`scripts/pi-publication-decision.ts` evaluates supplied observations without
calling GitHub or loading credentials. It accepts only a canonical Pi `main`
push matched to the manifest source. A preview needs a code change, explicit
prerelease marking, and passing repository checks. Stable needs a forward,
explicit stable-version bump matching the commit and manifest version, plus all
five checks in [product contract §5](product-contract.md#5-publication-and-release-evidence).
Compatibility requires a separate Prime Claw receipt. The stable parity receipt
must cover the exact claim included in the release notes.

The decision compares the nine supplied asset digests (eight archives and the
installer) with both the validated manifest and `SHA256SUMS`. The evidence
subject hashes the exact manifest, checksum and release-note text together; the
manifest binds the source, version, tag and asset digests. Each passing check
must name that subject and identify its evidence. Missing release inventory
blocks the decision. An existing tag or release with the same tag blocks even
an identical bundle; other prior releases are left alone.

Run the credential-free fixtures from `packages/coding-agent`:

```sh
../../node_modules/.bin/tsx ../../node_modules/vitest/dist/cli.js --run test/pi-publication-decision.test.ts
```

The fixtures compute digests from synthetic bytes and use an in-memory release
inventory. A `fixture-candidate` is not publication authority. This slice has
no trigger or writer and does not authenticate CI receipts, prove merge or bump
provenance beyond the supplied observations, check live release inventory, or
qualify Prime Claw or upstream parity.
