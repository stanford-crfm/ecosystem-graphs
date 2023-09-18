import os
import yaml
from processing import extract, replace, standardize_size, standardize_modal
import pathlib

def standardize():
    for filename in os.listdir(pathlib.Path("ecosystem-graphs/assets")):
        yaml_string = ""
        with open(pathlib.Path("ecosystem-graphs/assets") + str(filename), "r") as f:
            if (".yaml" in filename):
                org_assets = yaml.safe_load(f)
                updated_org_assets = []
                if (org_assets != None):
                    for asset in org_assets:
                        updated_asset = asset.copy()
                        if (extract(asset, "type", "value") == "model"):
                            updated_asset = replace(updated_asset, "size", "value", standardize_size(asset))
                            updated_asset = replace(updated_asset, "modality", "value", standardize_modal(asset))
                        if (extract(asset, "type", "value") == "dataset"):
                            updated_asset = replace(updated_asset, "modality", "value", standardize_modal(asset))
                        updated_org_assets.append(updated_asset)
                yaml_string = yaml.dump(updated_org_assets, sort_keys = False)
                print(yaml_string)

        with open(pathlib.Path("ecosystem-graphs/assets") + str(filename), "w") as file:
            if (".yaml" in filename):
                file.write(yaml_string)
