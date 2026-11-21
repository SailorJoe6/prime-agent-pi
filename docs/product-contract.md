# Prime Agent Pi product contract

This is standing, operator-approved project policy. It governs work for the active lifetime of Prime Agent Pi and remains in force until Joe explicitly revises it. It is not an epic or a task to complete. Backlog entries should describe finite work that follows this contract, not duplicate the standing constraints.

The contract takes precedence over conflicting inherited product guidance about scope, compatibility, versions, distribution, contribution intake, and publication authority. Inherited documentation and tooling are baseline evidence, not automatically adopted Pi policy. Other development, test, and safety rules still apply.

These are product commitments and working constraints, not a claim that every capability, package, installer, or automation is already implemented. See the [README](../README.md#install) for the current installation route. Documenting this policy does not authorize runtime activation, migration, or other implementation outside approved work.

## 1. Audience, promise, and scope

Prime Agent Pi serves Prime Agent users affected by the upstream Rust rewrite’s removal of Pi-derived extensibility APIs. Retain those APIs while providing equivalent user-facing capabilities, behavior, and applicable bug fixes from released upstream Prime Agent, implemented in the TypeScript/Python architecture. This is an evolving product, not a frozen legacy fork or a promise to duplicate Rust internals.

The near-term finish line is parity with the current stable upstream release. Incorporate new stable releases arriving during catch-up; do not freeze an old target to declare completion. Upstream main, betas, release candidates, and other prereleases are not parity targets. Record exact released-version evidence during parity assessments. Version examples below illustrate the policy; they are not claims about the latest upstream release or parity already achieved.

Local bug fixes are in scope. Parity is a baseline, not a feature ceiling: Joe may explicitly choose Pi-only enhancements from his own needs, user requests, or contributor proposals. Requests are not automatic commitments, and catching up remains the immediate priority. Apply the ordinary specification, review, and validation workflow to accepted work.

Adapt upstream behavior and invariants, not Rust code mechanically. A Rust-only internal defect need not be recreated or fixed in TypeScript when evidence establishes no analogous defect. Architecture differences are not permission to silently omit a user-facing capability or overstate parity. Keep unresolved gaps explicit; bring unavoidable compatibility conflicts to Joe rather than silently breaking integrations or declaring the gap solved.

## 2. Compatibility and user state

Preserve the entire public v0.9.8 TypeScript extensibility surface, including extension hooks, custom tools and commands, and TUI customization—not only APIs Joe uses. Preserve existing Orca and Prime Claw integrations and Python-first execution/model behavior by default. Adapt upstream capabilities around those commitments where possible. Joe must explicitly decide any unavoidable compatibility break before implementation.

Upgrades must reuse existing TypeScript v0.9.8 settings, credentials, extensions, and saved sessions at their current locations. Preserve a rollback route for necessary migrations. Do not require users to start from a fresh Pi-specific configuration.

Treat preservation of these public interfaces, workflows, state, and rollback as the compatibility commitments. Do not extend the promise to private implementation details, Rust-generated state formats, or an unbounded mixed-version daemon matrix. Preserve daemon integration behavior and use the repository’s capability/version rules for wire evolution; specify exact interoperability and migration evidence in the affected engineering task. This does not freeze protocol numbers or authorize an incompatible change without the separate decision required above.

## 3. Versions, channels, and support

The first three public version components identify the released upstream version whose feature/applicable-fix parity Pi has reached. Pi-only bug-fix revisions add a fourth component: `0.10.2.1`, `0.10.2.2`, and so on. Advance the upstream portion to `0.10.3` only after integrating that release’s features and applicable fixes under the compatibility rules, not merely because upstream publishes it. Do not adopt an independent public version series, an indefinite `0.9.x` ceiling, or an assumed next `0.9.9`.

Intentionally defer Pi-only enhancement versioning until the first such feature is selected. Do not assume those features increment the fourth component. This deferral does not block the initial contract or upstream catch-up.

Provide stable as the default channel and preview as an explicit opt-in. Release when changes are ready and validated, not on a weekly/monthly calendar. Maintain only the newest stable line; when stable advances from `0.10.2.*` to `0.10.3.*`, do not promise routine backports to the older line. A preview alone does not supersede stable maintenance. Retain older published releases and immutable legacy downstream releases as available rollback targets; do not move their tags or replace their artifacts.

Public four-component semantics are fixed. Four numeric components are not valid npm SemVer. Internal package encoding must be valid for its tools while preserving the public version meaning and correct ordering, channel selection, update, and rollback behavior. Define the encoding, initial revision normalization, and preview representation in the relevant engineering specification. These are bounded engineering details, not a reason to reopen the public version policy.

## 4. Distribution, platforms, and updates

Provide a ready-to-install distribution named `prime-agent-pi`, branded Prime Agent Pi, while retaining the installed `prime-agent` executable for integration compatibility. A future command rename remains Joe’s decision. Host initial packages, checksums, installer, and update metadata in `SailorJoe6/prime-agent-pi` GitHub Releases. Do not launch an npm registry package or separate artifact host initially. Define archive/manifest layout and installer mechanics in the distribution specification. Preserve source installation from the Pi repository through its existing `prime-agent.sh` launcher and the documented setup routes; ordinary users should not be required to install from source.

Match final upstream TypeScript v0.9.8 platform coverage, verified against commit `7d442aafa985f9342134fac16c2ef41f03fb45c1` and the published release assets:

- Native macOS packages: Apple Silicon (`darwin-arm64`) and Intel (`darwin-x64`).
- Native Linux packages: ARM64 glibc and musl; x64 glibc and musl, each with ordinary and baseline/non-AVX2 variants. Together with macOS, these are eight native targets.
- Retain the documented Windows Bash-based setup, including Git Bash or a configured Bash/WSL route. Do not invent a native Windows archive requirement.
- Retain the documented Android Termux source-install route and its limitations, including no image clipboard and unavailable optional native dependencies. Do not invent a native Android archive requirement.

Keep the existing update experience rather than creating a new updater/notification service. Repoint actual version checks, notices, release/download references, update feeds, and applicable fallback/repair links to Pi-owned releases with our versions and changes, never silently to upstream Rust. Honor the user’s selected stable/preview channel.

The inspected TypeScript workflow checks a channel release manifest at startup, shows an update notice directing users to `/update`, and installs through the user-invoked `/update` or `prime-agent update` path. Retain applicable existing confirmation, session restart/restore, and rollback behavior. A notification or public release does not itself authorize background installation or restart. This contract does not run or modify the live update path.

## 5. Publication and release evidence

Automatically publish clearly marked previews for validated code changes merged into Pi product main. Offer them only to opted-in preview users; a preview is not stable promotion or proof of an unfinished parity milestone.

Automatically publish stable, without asking Joe for approval each time, when an explicit stable-version bump is merged into product main and all agreed checks pass for that exact commit and its packages. Ordinary commits without that bump do not publish stable. Define these rules explicitly in the future automation rather than inheriting upstream triggers accidentally.

The five stable-release checks are:

1. Required automated repository checks and tests actually run and pass.
2. Extensibility and integration compatibility checks pass.
3. Packaged install, update, and rollback checks pass in Docker.
4. Evidence supports the upstream parity claimed by the release.
5. Version, release notes, and package checksums identify exactly what was tested.

Docker lifecycle proof is sufficient initially; do not require a new per-platform environment fleet. Record the tested environment and coverage limits. Container success is not proof of untested macOS, Windows, Android, or other OS/architecture behavior, and does not reduce the chosen platform support target. Exact test/artifact mappings belong in the distribution specification; no checks are claimed to have run merely because this contract lists them.

Publication authority does not grant code-merge, scope-change, compatibility-break, or unattended local installation/activation/restart authority. Recording this policy does not itself enable automation or publish a release.

## 6. Ownership, contributions, and upstream relationship

Allow direct public bug reports, feature requests, and pull requests in the Pi repository, without adopting upstream’s discussion-first or contributor-vouching restrictions. Joe retains final acceptance and code-merge authority, chooses Pi-only enhancements, and decides unavoidable compatibility breaks. Submissions do not automatically become commitments. Keep ordinary in-scope evidence and maintenance lightweight; do not build generalized approval machinery around them.

Record product policy and Joe-approved revisions in this contract, finite accepted work/evidence in provider-native tasks, and release evidence in the associated release records. Concrete validation, provenance, and claimed parity must be reviewable; do not infer policy from inherited scripts or commit messages alone. These are direct records, not a new governance subsystem.

`SailorJoe6/prime-agent-pi` is the independent TypeScript/pi product. `PrimeIntellect-ai/prime-agent` is the fetch-only upstream reference; `SailorJoe6/prime-agent-upstream` preserves upstream/Rust and historical downstream provenance. Preserve ancestry, authorship, licenses, immutable tags, and rollback evidence. Audit stable upstream releases for applicable behavior and adapt justified changes through separate specifications. Never mechanically merge or mirror Rust upstream main into Pi product main. This contract does not mutate the provenance mirror or authorize upstream submissions contrary to upstream’s own rules.
