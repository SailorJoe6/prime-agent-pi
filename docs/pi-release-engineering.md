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
source SHA separately and verify the staged lockstep dependencies. This slice
defines the encoding and ordering only; it does not change workspace versions,
package staging, release discovery, installation, or runtime update behavior.

Run the focused tests from `packages/coding-agent`:

```sh
npx tsx ../../node_modules/vitest/dist/cli.js --run test/pi-release-version.test.ts
```
