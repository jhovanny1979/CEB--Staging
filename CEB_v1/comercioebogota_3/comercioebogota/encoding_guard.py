from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from ftfy import fix_text as ftfy_fix_text
except Exception:  # pragma: no cover - fallback when ftfy is unavailable
    ftfy_fix_text = None

TEXT_EXTENSIONS = {".html", ".css", ".js", ".json", ".txt", ".md", ".ps1", ".bat", ".py"}
IGNORE_DIRS = {
    ".git",
    "__pycache__",
    "node_modules",
    "vendor",
    "vendor_lib",
    "archive",
    "var",
}

# Typical mojibake fragments seen in the project.
MOJIBAKE_MARKERS = (
    "\u00c3",  # U+00C3
    "\u00c2",  # U+00C2
    "\u00e2\u20ac",  # broken punctuation pair
    "\u00f0\u0178",  # broken emoji pair
    "\u00e2\u0153",  # broken symbol pair
    "\ufffd",  # replacement char
)

DIRECT_REPLACEMENTS = {
    "e\u00b7Bogot\u00e1": "e-Bogot\u00e1",
}


def iter_text_files(root: Path) -> list[Path]:
    files: list[Path] = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if any(part in IGNORE_DIRS for part in path.parts):
            continue
        if path.suffix.lower() in TEXT_EXTENSIONS:
            files.append(path)
    return sorted(files)


def decode_source(raw: bytes) -> tuple[str, str]:
    for enc in ("utf-8", "cp1252", "latin-1"):
        try:
            return raw.decode(enc), enc
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace"), "utf-8-replace"


def preserve_newlines(text: str, original_raw: bytes) -> str:
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    if b"\r\n" in original_raw:
        return normalized.replace("\n", "\r\n")
    return normalized


def mojibake_score(text: str) -> int:
    return sum(text.count(marker) for marker in MOJIBAKE_MARKERS)


def simple_fix_text(text: str) -> str:
    current = text
    for _ in range(3):
        previous = current
        try:
            current = current.encode("cp1252").decode("utf-8")
        except Exception:
            try:
                current = current.encode("latin-1").decode("utf-8")
            except Exception:
                break
        if current == previous:
            break
    return current


def repair_text(text: str) -> str:
    current = text
    for _ in range(3):
        previous = current
        if ftfy_fix_text is not None:
            current = ftfy_fix_text(current)
        else:
            current = simple_fix_text(current)
        if current == previous:
            break

    for bad, good in DIRECT_REPLACEMENTS.items():
        current = current.replace(bad, good)

    return current


def process_file(path: Path, fix: bool) -> tuple[bool, bool]:
    raw = path.read_bytes()
    decoded, source_encoding = decode_source(raw)
    repaired = preserve_newlines(repair_text(decoded), raw)

    issue = mojibake_score(decoded) > 0 or source_encoding != "utf-8"
    changed = repaired != decoded

    if fix and (issue or changed):
        path.write_text(repaired, encoding="utf-8", newline="")
        return issue, True
    return issue, False


def main() -> int:
    parser = argparse.ArgumentParser(description="Detect and repair mojibake (UTF-8 issues) in project files.")
    parser.add_argument("--root", default=".", help="Root directory to scan.")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="Only report issues.")
    mode.add_argument("--fix", action="store_true", help="Repair issues in-place.")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    files = iter_text_files(root)

    issues: list[Path] = []
    changed: list[Path] = []

    for file_path in files:
        has_issue, was_changed = process_file(file_path, fix=args.fix)
        if has_issue:
            issues.append(file_path)
        if was_changed:
            changed.append(file_path)

    if args.fix:
        if changed:
            print(f"[encoding-guard] Reparados {len(changed)} archivo(s).")
            for item in changed:
                print(f"  - {item}")
        else:
            print("[encoding-guard] Sin cambios. Codificacion estable.")
        return 0

    if issues:
        print(f"[encoding-guard] Detectados problemas en {len(issues)} archivo(s):")
        for item in issues:
            print(f"  - {item}")
        print("[encoding-guard] Ejecuta: python encoding_guard.py --fix")
        return 1

    print("[encoding-guard] OK: no se detecto mojibake.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
