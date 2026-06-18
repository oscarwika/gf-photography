#!/usr/bin/env python3
"""Scan album folders and write albums.generated.json for the site."""

import json
import re
from pathlib import Path
from typing import List, Optional, Tuple

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "albums.json"
OUTPUT = ROOT / "albums.generated.json"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".svg", ".gif"}


def natural_sort_key(name: str) -> list:
    return [
        int(part) if part.isdigit() else part.lower()
        for part in re.split(r"(\d+)", name)
    ]


def scan_folder(folder_path: Path) -> Tuple[Optional[str], List[str]]:
    files = sorted(
        (
            entry
            for entry in folder_path.iterdir()
            if entry.is_file() and entry.suffix.lower() in IMAGE_EXTENSIONS
        ),
        key=lambda entry: natural_sort_key(entry.name),
    )

    if not files:
        return None, []

    cover = next(
        (entry.name for entry in files if entry.stem.lower() == "cover"),
        None,
    )
    if cover:
        images = [entry.name for entry in files if entry.name != cover]
    else:
        images = [entry.name for entry in files]
        cover = images[0]

    return cover, images


def build_album(album: dict) -> dict:
    folder = album.get("folder", f"albums/{album['id']}")
    folder_path = ROOT / folder

    if not folder_path.is_dir():
        raise SystemExit(f"Missing album folder: {folder}")

    if album.get("images"):
        cover = album.get("cover") or album["images"][0]
        images = album["images"]
    else:
        cover, images = scan_folder(folder_path)

    return {
        "id": album["id"],
        "title": album["title"],
        "folder": folder,
        "cover": cover,
        "images": images,
    }


def main() -> None:
    albums = json.loads(SOURCE.read_text(encoding="utf-8"))
    output = [build_album(album) for album in albums]
    OUTPUT.write_text(
        json.dumps(output, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUTPUT.relative_to(ROOT)} ({len(output)} albums)")


if __name__ == "__main__":
    main()
