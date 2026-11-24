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
