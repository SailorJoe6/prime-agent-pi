"""Read and share inert factory definitions in the released MACHINE.md format."""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any

from .factory_spec import validate_factory_spec
from .harness import HarnessState, _agent_dir, _strip_scope_prefix

_FILE = "MACHINE.md"
_FIELDS = ("name", "description", "version", "author")
_NAME = re.compile(r"[a-z0-9][a-z0-9-]{0,63}")


@dataclass(frozen=True)
class MachineFile:
    name: str
    description: str
    version: str
    author: str
    spec: dict[str, Any]


class MachineResolutionError(ValueError):
    """Lookup failure; broken distinguishes invalid files from absent names."""

    def __init__(self, message: str, *, broken: bool) -> None:
        super().__init__(message)
        self.broken = broken


def _validate_name(name: str) -> None:
    if not isinstance(name, str) or not _NAME.fullmatch(name) or name.endswith("-"):
        raise ValueError(f"invalid machine name {name!r}: use 1–64 lowercase letters, digits or hyphens, starting and ending with a letter or digit")


def _frontmatter_value(value: str) -> str:
    if value.startswith('"') and value.endswith('"'):
        return json.loads(value)
    if value.startswith("'") and value.endswith("'"):
        return value[1:-1].replace("''", "'")
    if ":" in value:
        raise ValueError("quote frontmatter values containing ':'")
    return value


def _reject_constant(value: str) -> None:
    raise ValueError(f"{value} is not JSON")


def _parse(raw: bytes) -> MachineFile:
    # Normalize for parsing only. Import and library export keep the original bytes.
    lines = raw.decode("utf-8-sig").replace("\r\n", "\n").replace("\r", "\n").split("\n")
    if lines[0].rstrip() != "---":
        raise ValueError("MACHINE.md must start with a --- frontmatter block")
    body = iter(lines[1:])
    fields: dict[str, str] = {}
    for line in body:
        if line.rstrip() == "---":
            break
        key, separator, value = line.partition(":")
        key, value = key.strip(), value.strip()
        if not separator or key not in _FIELDS or key in fields or not value:
            raise ValueError(f"invalid or duplicate frontmatter field: {line!r}")
        fields[key] = _frontmatter_value(value)
    else:
        raise ValueError("frontmatter block is not closed")

    name, description = fields.get("name", ""), fields.get("description", "")
    _validate_name(name)
    if not description.strip() or len(description) > 1024 or "\n" in description or "\r" in description:
        raise ValueError("frontmatter description must be a non-empty single line (at most 1024 characters)")

    payload: list[str] | None = None
    for line in body:
        if not line.lstrip().startswith("```"):
            continue
        info = line.strip()[3:].strip()
        block = []
        for content in body:
            if content.rstrip() == "```":
                break
            block.append(content)
        else:
            raise ValueError(f"```{info} fence is not closed")
        if info == "machine-spec":
            if payload is not None:
                raise ValueError("expected exactly one fenced machine-spec block; found more than one")
            payload = block
    if payload is None:
        raise ValueError("expected exactly one fenced machine-spec block; found none")
    try:
        spec = json.loads("\n".join(payload), parse_constant=_reject_constant)
    except ValueError as exc:
        raise ValueError(f"machine-spec must contain a JSON object: {exc}") from exc
    if not isinstance(spec, dict):
        raise ValueError("machine-spec must contain a JSON object")
    return MachineFile(name, description, fields.get("version", ""), fields.get("author", ""), spec)


def _validate_spec(machine: MachineFile) -> None:
    if errors := validate_factory_spec(machine.spec):
        raise ValueError("; ".join(errors))


@dataclass(frozen=True)
class LibraryMachine:
    machine: MachineFile
    path: Path
    source: str
    _raw: bytes


class MachineLibrary:
    """Shared and personal directories, searched in that order by declared name."""

    def __init__(self, *, shared_dir: str | Path | None = None, personal_dir: str | Path | None = None) -> None:
        override = (os.environ.get("PRIME_AGENT_MACHINES_DIR") or "").strip()
        self.shared_dir = (
            Path(shared_dir if shared_dir is not None else override).expanduser()
            if shared_dir is not None or override else Path(__file__).resolve().parent / "machines"
        )
        self.personal_dir = Path(personal_dir).expanduser() if personal_dir is not None else _agent_dir() / "machines"

    def _scan(self) -> tuple[dict[str, LibraryMachine], dict[str, str], list[str]]:
        valid: dict[str, LibraryMachine] = {}
        broken: dict[str, str] = {}
        warnings: dict[Path, str] = {}
        for source, root in (("shared", self.shared_dir), ("personal", self.personal_dir)):
            level: dict[str, LibraryMachine] = {}
            for path in sorted(root.glob(f"*/{_FILE}")):
                if not path.is_file():
                    continue
                name = path.parent.name
                try:
                    raw = path.read_bytes()
                    machine = _parse(raw)
                    name = machine.name
                    _validate_spec(machine)
                except (OSError, ValueError, RecursionError) as exc:
                    warning = f"{path}: {exc}"
                    broken.setdefault(name, warning)
                    warnings.setdefault(path, warning)
                    continue
                if name in level:
                    # Use filesystem identity so a mixed-case path may be canonical.
                    try:
                        if not path.samefile(root / name / _FILE):
                            continue
                    except OSError:
                        continue
                level[name] = LibraryMachine(machine, path, source, raw)
            for name, entry in level.items():
                valid.setdefault(name, entry)
        return valid, broken, list(warnings.values())

    def list_machines(self) -> list[LibraryMachine]:
        valid, _, _ = self._scan()
        return [valid[name] for name in sorted(valid)]

    def resolve_machine(self, name: str) -> LibraryMachine:
        _validate_name(name)
        valid, broken, _ = self._scan()
        if name in valid:
            return valid[name]
        if name in broken:
            raise MachineResolutionError(broken[name], broken=True)
        raise MachineResolutionError(f"unknown machine {name!r}: no matching MACHINE.md", broken=False)

    def import_machine(self, path: str | Path) -> Path:
        """Validate first, then atomically install the original bytes in the personal library."""
        destination, _ = self._import_machine(path)
        return destination

    def _import_machine(self, path: str | Path) -> tuple[Path, bool]:
        source = Path(path).expanduser()
        try:
            raw = source.read_bytes()
            machine = _parse(raw)
            _validate_spec(machine)
        except (OSError, ValueError, RecursionError) as exc:
            raise ValueError(f"{source}: {exc}") from exc
        destination = self.personal_dir / machine.name / _FILE
        try:
            occupant = _parse(destination.read_bytes())
            _validate_spec(occupant)
        except (FileNotFoundError, ValueError, RecursionError):
            pass
        else:
            if occupant.name != machine.name:
                raise ValueError(f"{destination}: refusing to replace machine {occupant.name!r} with {machine.name!r}")
        destination.parent.mkdir(parents=True, exist_ok=True)
        temp = NamedTemporaryFile(dir=destination.parent, delete=False)
        temp_path = Path(temp.name)
        try:
            with temp:
                temp.write(raw)
            created = not destination.exists()
            temp_path.replace(destination)
        finally:
            temp_path.unlink(missing_ok=True)
        return destination, created

    def export_machine(self, name: str, out_path: str | Path) -> Path:
        """Export the library definition, never a stored harness definition."""
        return _write_export(out_path, self.resolve_machine(name)._raw)


def _cli_dispatch(request: dict[str, Any]) -> dict[str, Any]:
    """Internal JSON boundary for the TypeScript CLI; no harness access."""
    try:
        library = MachineLibrary()
        op = request["op"]
        if op == "list":
            valid, _, warnings = library._scan()
            machines = [
                {
                    "name": name,
                    "description": entry.machine.description,
                    "version": entry.machine.version,
                    "author": entry.machine.author,
                    "path": str(entry.path),
                    "source": {"shared": "repo", "personal": "user"}[entry.source],
                }
                for name, entry in sorted(valid.items())
            ]
            return {"ok": True, "machines": machines, "warnings": warnings}
        if op == "import":
            destination, created = library._import_machine(request["path"])
            return {"ok": True, "name": destination.parent.name, "path": str(destination), "created": created}
        if op == "export":
            name = request["name"]
            destination = library.export_machine(name, request["out"])
            return {"ok": True, "name": name, "path": str(destination), "source": "library"}
        return {"ok": False, "errors": [f"unknown factory operation {op!r}"]}
    except (OSError, ValueError, RuntimeError) as exc:
        return {"ok": False, "errors": [str(exc)]}


def _write_export(path: str | Path, raw: bytes) -> Path:
    destination = Path(path).expanduser()
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("xb") as handle:
        handle.write(raw)
    return destination


def export_factory_spec(
    spec: dict[str, Any], out_path: str | Path, *, name: str, description: str,
    version: str = "1", author: str = "",
) -> Path:
    """Serialize an authored definition (including one read from the harness)."""
    fields = (name, description, version, author)
    if not all(isinstance(value, str) for value in fields):
        raise ValueError("machine frontmatter values must be strings")
    frontmatter = "".join(
        f"{field}: {json.dumps(value, ensure_ascii=False)}\n" for field, value in zip(_FIELDS, fields)
    )
    raw = (
        "---\n" + frontmatter
        + "---\n\n```machine-spec\n" + json.dumps(spec, indent=2, ensure_ascii=False, allow_nan=False) + "\n```\n"
    ).encode("utf-8")
    machine = _parse(raw)
    if machine.spec != spec:
        raise ValueError("JSON serialization would change the definition")
    _validate_spec(machine)
    return _write_export(out_path, raw)


def select_factory(
    name: str, state: HarnessState, *, library: MachineLibrary | None = None, global_: bool = False,
) -> dict[str, Any]:
    """Select a stored spec first; a library fallback never changes the harness."""
    stored = state.get_factory(name, global_=global_)
    if stored is not None:
        return stored
    library_name, _ = _strip_scope_prefix(name, global_)
    assert library_name is not None
    return (library if library is not None else MachineLibrary()).resolve_machine(library_name).machine.spec
