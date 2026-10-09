"""Versioned native CSV snapshot; no network, sibling repository, or fallback."""
import csv
import hashlib
import io
import json
import re
from pathlib import Path

SCHEMAS = {
    "Adventure": ["key", "Level", "Emote", "MinTime", "MaxTime", "PlaceName", "Name"],
    "Emote": ["key", "Name", "TextCommand"],
    "TextCommand": ["key", "Command"],
    "PlaceName": ["key", "Name"],
    "Level": ["key", "X", "Y", "Z", "Map"],
    "Map": ["key", "Id", "PlaceName", "SizeFactor", "OffsetX", "OffsetY"],
}


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def load_snapshot(sources):
    sources = Path(sources)
    manifest_bytes = (sources / "native-manifest.json").read_bytes()
    manifest = json.loads(manifest_bytes)
    version = manifest.get("clientVersion")
    if manifest.get("format") != 1 or not isinstance(version, str) or not re.fullmatch(r"\d{4}\.\d{2}\.\d{2}\.\d{4}\.\d{4}", version):
        raise ValueError("native manifest format/clientVersion invalid")
    if set(manifest.get("sheets", {})) != set(SCHEMAS):
        raise ValueError("native manifest must classify exactly six sheets")
    sheets = {}
    for name, columns in SCHEMAS.items():
        entry = manifest["sheets"][name]
        filename = f"tc_{name}.csv"
        if entry.get("file") != filename:
            raise ValueError(f"{name}: unexpected snapshot path")
        data = (sources / filename).read_bytes()
        if sha256(data) != entry.get("sha256"):
            raise ValueError(f"{name}: bytes SHA-256 mismatch")
        if data.startswith(b"\xef\xbb\xbf") or b"\r" in data or not data.endswith(b"\n"):
            raise ValueError(f"{name}: UTF-8 without BOM, LF required")
        reader = csv.DictReader(io.StringIO(data.decode("utf-8"), newline=""), strict=True)
        if reader.fieldnames != columns:
            raise ValueError(f"{name}: named header mismatch")
        rows = {}
        for row in reader:
            if None in row or any(value is None for value in row.values()) or not re.fullmatch(r"[0-9]+", row["key"]):
                raise ValueError(f"{name}: malformed row")
            key = int(row["key"])
            if key in rows:
                raise ValueError(f"{name}: duplicate key {key}")
            rows[key] = row
        if not rows or type(entry.get("rows")) is not int or len(rows) != entry["rows"]:
            raise ValueError(f"{name}: row count mismatch")
        sheets[name] = rows
    if sum(bool(row["Name"]) for row in sheets["Adventure"].values()) != 340:
        raise ValueError("Adventure baseline must be 340 named rows")
    return sheets, version, sha256(manifest_bytes)
