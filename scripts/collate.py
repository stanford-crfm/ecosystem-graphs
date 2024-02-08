#!/usr/bin/env python
from pathlib import Path

import yaml
from pandas import DataFrame


ASSET_PATH = Path("./assets")


def scalar(val):
    """Clean scalar values whenever possible."""
    if not isinstance(val, dict):
        return val

    if "explanation" in val:
        return val.get("value")

    if not val:
        return None

    return val


def collate_assets():
    """Store all assets together in a single tabular CSV file."""
    paths = ASSET_PATH.glob("*.yaml")
    assets = [asset for fp in paths for asset in yaml.safe_load(open(fp))]
    df = DataFrame.from_records(assets)

    # Make data consistent within columns (cannot have scalar and dicts in same column)
    df = df.apply(lambda ser: ser.apply(scalar))

    # Cleanup missing data representations
    df = df.replace("none", None).replace("unknown", None)

    df.to_csv("./resources/all_assets.csv", index=False)


if __name__ == "__main__":
    collate_assets()
