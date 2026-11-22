# Upstream feature inventory

**Status: release coverage pinned; capability assessment pending.** This is not a claim of feature parity or release readiness. The [Prime Agent Pi product contract](product-contract.md) governs scope and compatibility. TASK-1 separately tracks upstream bug-fix intake; mixed feature/fix changes should cross-reference that work rather than duplicate it.

## Assessment baseline

- **Prime Agent Pi source:** [`6cd28f90e2391441850485c94b3ff099f579ef7a`](https://github.com/SailorJoe6/prime-agent-pi/tree/6cd28f90e2391441850485c94b3ff099f579ef7a), the Pi `main` commit at the start of the assessment, including merged downstream work. This pins the source for comparison; it does not identify an installed runtime.
- **Upstream comparison baseline:** final TypeScript release v0.9.8. Assess observable changes in stable releases after it, including those introduced with the Rust rewrite. Compare behavior, not implementation language.
- **Release observation cutoff:** 2026-11-22 07:52:00 UTC. The latest verified stable release at that cutoff was **v0.10.5**. Refresh the release list before the final assessment report and include any new stable releases. Upstream `main`, betas, and release candidates are not independent parity targets.

## Verified release coverage

The release links give publication notes; the pinned commits and adjacent source ranges give the revisions to inspect. The table establishes which releases to audit, not which features have been audited.

| Upstream release | Published (UTC) | Source commit | Changes from prior stable |
| --- | --- | --- | --- |
| [v0.9.8](https://github.com/PrimeIntellect-ai/prime-agent/releases/tag/v0.9.8) | 2026-09-29 22:06:42 | [`7d442aafa985f9342134fac16c2ef41f03fb45c1`](https://github.com/PrimeIntellect-ai/prime-agent/tree/7d442aafa985f9342134fac16c2ef41f03fb45c1) | TypeScript baseline |
| [v0.10.0](https://github.com/PrimeIntellect-ai/prime-agent/releases/tag/v0.10.0) | 2026-10-09 21:28:57 | [`763094e1b6a7c17450ee8399b06cda1853847ca5`](https://github.com/PrimeIntellect-ai/prime-agent/tree/763094e1b6a7c17450ee8399b06cda1853847ca5) | [Source range](https://github.com/PrimeIntellect-ai/prime-agent/compare/7d442aafa985f9342134fac16c2ef41f03fb45c1...763094e1b6a7c17450ee8399b06cda1853847ca5) |
| [v0.10.1](https://github.com/PrimeIntellect-ai/prime-agent/releases/tag/v0.10.1) | 2026-10-21 23:33:59 | [`8aac8692456c00c01d4e53e60e6d3347a3506559`](https://github.com/PrimeIntellect-ai/prime-agent/tree/8aac8692456c00c01d4e53e60e6d3347a3506559) | [Source range](https://github.com/PrimeIntellect-ai/prime-agent/compare/763094e1b6a7c17450ee8399b06cda1853847ca5...8aac8692456c00c01d4e53e60e6d3347a3506559) |
| [v0.10.2](https://github.com/PrimeIntellect-ai/prime-agent/releases/tag/v0.10.2) | 2026-10-28 16:03:19 | [`ea9d9602ec0938d9e454e8963107cd85af1565c6`](https://github.com/PrimeIntellect-ai/prime-agent/tree/ea9d9602ec0938d9e454e8963107cd85af1565c6) | [Source range](https://github.com/PrimeIntellect-ai/prime-agent/compare/8aac8692456c00c01d4e53e60e6d3347a3506559...ea9d9602ec0938d9e454e8963107cd85af1565c6) |
| [v0.10.3](https://github.com/PrimeIntellect-ai/prime-agent/releases/tag/v0.10.3) | 2026-11-12 17:59:11 | [`efb25e2be62507f8a13a157545d031da213abac9`](https://github.com/PrimeIntellect-ai/prime-agent/tree/efb25e2be62507f8a13a157545d031da213abac9) | [Source range](https://github.com/PrimeIntellect-ai/prime-agent/compare/ea9d9602ec0938d9e454e8963107cd85af1565c6...efb25e2be62507f8a13a157545d031da213abac9) |
| [v0.10.4](https://github.com/PrimeIntellect-ai/prime-agent/releases/tag/v0.10.4) | 2026-11-17 21:00:06 | [`8980e66f2f07762d62a6c1d73b347a4cac5275cc`](https://github.com/PrimeIntellect-ai/prime-agent/tree/8980e66f2f07762d62a6c1d73b347a4cac5275cc) | [Source range](https://github.com/PrimeIntellect-ai/prime-agent/compare/efb25e2be62507f8a13a157545d031da213abac9...8980e66f2f07762d62a6c1d73b347a4cac5275cc) |
| [v0.10.5](https://github.com/PrimeIntellect-ai/prime-agent/releases/tag/v0.10.5) | 2026-11-18 19:15:02 | [`033eea1705c5ae953fe7cd7a5e7e7c45317e0dfe`](https://github.com/PrimeIntellect-ai/prime-agent/tree/033eea1705c5ae953fe7cd7a5e7e7c45317e0dfe) | [Source range](https://github.com/PrimeIntellect-ai/prime-agent/compare/8980e66f2f07762d62a6c1d73b347a4cac5275cc...033eea1705c5ae953fe7cd7a5e7e7c45317e0dfe) |

### How the release list was checked

- Enumerated all pages of GitHub Releases and selected published, non-draft, non-prerelease releases from v0.9.8 onward. Cross-checked the newest result with GitHub's `releases/latest` endpoint. A Git tag by itself does not establish a stable release.
- Read `git ls-remote --tags upstream` from the fetch-only upstream remote. Used the peeled `^{}` target for annotated tags and the direct object for lightweight tags. Verified each source object with `git cat-file -t` and each adjacent upstream ancestry link with `git merge-base --is-ancestor`. Also verified v0.9.8 is an ancestor of the pinned Pi revision.

## Remaining assessment

No capabilities have been classified and no gaps have been confirmed or specified in this checkpoint. No runtime behavior or packaging was tested. Next, compare the release notes with the pinned source ranges, relevant docs, linked changes, and tests. Group related changes by capability and inspect their equivalents at the pinned Pi revision.

For each capability, record whether Pi is equivalent, partial, missing, or unresolved, and distinguish inspection from executed checks. Record a concrete next action for incomplete or uncertain findings. Publish separate reviewable specifications only for confirmed gaps; do not treat an unresolved finding as equivalent or as an implementation commitment. A completed inventory is not implemented parity.
