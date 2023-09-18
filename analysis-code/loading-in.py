import os
import pandas as pd
import pathlib
import yaml

def loadin_data():
    data = []
    for filename in os.listdir(pathlib.Path("ecosystem-graphs/assets")):
        with open(pathlib.Path("ecosystem-graphs/assets") + str(filename), "r") as f:
            if (".yaml" in filename):
                asset = yaml.safe_load(f)
                if(asset != None):
                    data.append(asset)
    return pd.DataFrame(data)

def loadin_schemas():
    application_order = []
    dataset_order = []
    model_order = []
    orders = {"application": application_order, "dataset": dataset_order, "model": model_order}
    p = pathlib.Path("ecosystem-graphs/js/schemas.yaml")
    with open(p, "r") as f:
        file = yaml.safe_load(f)
        for asset_type in file:
            orders[asset_type].append("type")
            for feature in file[asset_type]:
                orders[asset_type].append(feature["name"])
    return orders
