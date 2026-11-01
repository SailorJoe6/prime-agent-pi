#!/usr/bin/env python3
"""Fail-closed single-flight lock for downstream cwd-fix maintenance runs."""

from __future__ import annotations

import argparse
import datetime as dt
import hmac
import json
import os
from pathlib import Path
import secrets
import socket
import sys

STATE_DIR = Path(__file__).resolve().parent.parent / "state"
LOCK_DIR = STATE_DIR / "orca-run.lock"
OWNER_FILE = LOCK_DIR / "owner.json"
AUDIT_FILE = STATE_DIR / "audit.jsonl"


def timestamp() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def append_audit(record: dict[str, object]) -> None:
    STATE_DIR.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(STATE_DIR, 0o700)
    fd = os.open(AUDIT_FILE, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
    try:
        os.write(fd, (json.dumps(record, sort_keys=True) + "\n").encode())
    finally:
        os.close(fd)
    os.chmod(AUDIT_FILE, 0o600)


def acquire(runner: str) -> int:
    STATE_DIR.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(STATE_DIR, 0o700)
    try:
        LOCK_DIR.mkdir(mode=0o700)
    except FileExistsError:
        append_audit(
            {
                "at": timestamp(),
                "result": "blocked",
                "reason": "single-flight-lock-contended",
                "runner": runner,
            }
        )
        print(
            json.dumps(
                {
                    "acquired": False,
                    "reason": "single-flight-lock-contended",
                    "ownerFile": str(OWNER_FILE),
                },
                sort_keys=True,
            )
        )
        return 2

    token = secrets.token_hex(32)
    owner = {
        "acquiredAt": timestamp(),
        "host": socket.gethostname(),
        "runner": runner,
        "token": token,
    }
    temporary = LOCK_DIR / f"owner.{os.getpid()}.tmp"
    try:
        fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        try:
            os.write(fd, (json.dumps(owner, sort_keys=True) + "\n").encode())
        finally:
            os.close(fd)
        os.replace(temporary, OWNER_FILE)
        os.chmod(OWNER_FILE, 0o600)
        append_audit({"at": timestamp(), "result": "started", "runner": runner})
    except BaseException:
        temporary.unlink(missing_ok=True)
        OWNER_FILE.unlink(missing_ok=True)
        LOCK_DIR.rmdir()
        raise

    print(json.dumps({"acquired": True, "token": token}, sort_keys=True))
    return 0


def release(token: str) -> int:
    try:
        owner = json.loads(OWNER_FILE.read_text())
    except (FileNotFoundError, json.JSONDecodeError, OSError) as error:
        print(json.dumps({"released": False, "reason": f"unreadable-owner: {error}"}, sort_keys=True))
        return 3

    owner_token = owner.get("token")
    if not isinstance(owner_token, str) or not hmac.compare_digest(owner_token, token):
        print(json.dumps({"released": False, "reason": "owner-token-mismatch"}, sort_keys=True))
        return 3

    OWNER_FILE.unlink()
    LOCK_DIR.rmdir()
    print(json.dumps({"released": True}, sort_keys=True))
    return 0


def inspect_lock() -> int:
    if not LOCK_DIR.exists():
        print(json.dumps({"locked": False}, sort_keys=True))
        return 0
    try:
        owner = json.loads(OWNER_FILE.read_text())
    except (FileNotFoundError, json.JSONDecodeError, OSError) as error:
        print(json.dumps({"locked": True, "ownerReadable": False, "reason": str(error)}, sort_keys=True))
        return 4
    owner.pop("token", None)
    print(json.dumps({"locked": True, "owner": owner, "ownerReadable": True}, sort_keys=True))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    acquire_parser = subparsers.add_parser("acquire")
    acquire_parser.add_argument("--runner", required=True)
    release_parser = subparsers.add_parser("release")
    release_parser.add_argument("--token", required=True)
    subparsers.add_parser("inspect")
    args = parser.parse_args()

    if args.command == "acquire":
        return acquire(args.runner)
    if args.command == "release":
        return release(args.token)
    return inspect_lock()


if __name__ == "__main__":
    sys.exit(main())
