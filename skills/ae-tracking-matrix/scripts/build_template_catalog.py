#!/usr/bin/env python3
"""Index local Markdown metadata without interpreting or replacing business content.

Only explicit --output NEW_FILE writes anything. The curated catalog is read-only;
its business overview and selection advice are preserved (relative Markdown
links are rebased only when the review copy is relocated). No workbook,
network, third-party dependency, or event-count inference is used.
"""
from __future__ import annotations

import argparse
import os
from hashlib import sha256
from pathlib import Path
import re
import sys

SKILL_ROOT = Path(__file__).resolve().parents[1]
ASSETS_DIR = SKILL_ROOT / "references" / "categories"
CATALOG_PATH = SKILL_ROOT / "references" / "plan-generation" / "template-catalog.md"
START = "<!-- category-metadata:start -->"
END = "<!-- category-metadata:end -->"


def read_metadata(category_dir: Path = ASSETS_DIR) -> list[dict[str, str]]:
    """Return one deterministic entry per real .md asset (including partial caches)."""
    entries = []
    for path in sorted(category_dir.glob("*.md"), key=lambda item: item.name):
        if not path.is_file() or path.is_symlink():
            raise ValueError(f"Not a regular local Markdown asset: {path}")
        raw = path.read_bytes()
        text = raw.decode("utf-8")
        lines = text.splitlines()
        title = next((line[2:].strip() for line in lines if line.startswith("# ")), path.stem)
        source = next((line.lstrip("> ").strip() for line in lines
                       if re.match(r"^\s*>?\s*(?:Source|sourceUrl|来源)\s*[:：]", line)), "Not recorded")
        sections = sum(line.startswith("## ") for line in lines)
        entries.append({"file": path.name, "title": title, "source": source,
                        "sections": str(sections), "sha256": sha256(raw).hexdigest()})
    if not entries:
        raise ValueError(f"No Markdown category assets found: {category_dir}")
    return entries


def escape_cell(value: str) -> str:
    return value.replace("|", "&#124;").replace("\n", " ").replace("\r", " ")


def metadata_block(entries: list[dict[str, str]]) -> str:
    lines = [START, "## Local Markdown Metadata Index", "",
             f"Inventory: {len(entries)} Markdown assets. This is metadata, not a claim of complete business coverage.",
             "Paths below are package-root-relative. SHA256 identifies the cached bytes, not source freshness.",
             "No event counts are inferred from headings or table dimensions; curated counts above remain historical reference data.",
             "", "| Package-relative file | Title | Recorded source | H2 sections | SHA256 |",
             "| --- | --- | --- | --- | --- |"]
    for entry in entries:
        cells = [f"`references/categories/{entry['file']}`", entry["title"],
                 entry["source"], entry["sections"], f"`{entry['sha256']}`"]
        lines.append("| " + " | ".join(escape_cell(cell) for cell in cells) + " |")
    lines.extend(["", END])
    return "\n".join(lines)


def build_catalog(curated: str, category_dir: Path = ASSETS_DIR) -> str:
    """Replace only the generated block; never synthesize curated business rows."""
    block = metadata_block(read_metadata(category_dir))
    if START in curated or END in curated:
        if curated.count(START) != 1 or curated.count(END) != 1:
            raise ValueError("Catalog metadata markers must occur exactly once each")
        start, end = curated.index(START), curated.index(END)
        if end < start:
            raise ValueError("Catalog metadata markers are out of order")
        return curated[:start] + block + curated[end + len(END):]
    return curated + ("" if curated.endswith("\n\n") else "\n" if curated.endswith("\n") else "\n\n") + block + "\n"


def rebase_links(text: str, source_dir: Path, output_dir: Path) -> str:
    """Keep curated relative Markdown links working in a relocated review copy."""
    def replace(match: re.Match) -> str:
        path, separator, fragment = match.group(0).partition("#")
        target = (source_dir / path).resolve()
        relative = Path(os.path.relpath(target, output_dir.resolve())).as_posix()
        return relative + (separator + fragment if separator else "")
    return re.sub(r"(?<=\]\()\.{1,2}/[^)\n]+(?=\))", replace, text)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path,
                        help="New Markdown review file; existing paths are never overwritten")
    args = parser.parse_args(argv)
    output = args.output.expanduser()
    try:
        if output.suffix.lower() != ".md":
            raise ValueError("--output must name a new .md file")
        if output.exists() or output.is_symlink():
            raise ValueError(f"Refusing to overwrite existing path: {output}")
        resolved = output.resolve()
        if resolved == CATALOG_PATH.resolve() or resolved.is_relative_to(ASSETS_DIR.resolve()):
            raise ValueError("Output must not target the curated catalog or category cache")
        content = build_catalog(CATALOG_PATH.read_text(encoding="utf-8"))
        content = rebase_links(content, CATALOG_PATH.parent, output.parent)
        # Exclusive creation also prevents a race from overwriting another writer.
        with output.open("x", encoding="utf-8", newline="\n") as handle:
            handle.write(content)
    except (OSError, UnicodeError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    print(f"Wrote metadata review copy: {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
