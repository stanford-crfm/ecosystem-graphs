import yaml
import datetime
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import os
import plotly.express as px
import math
from collections import OrderedDict



data = []
# Which file the asset comes from, list of dictionaries (asset name: file name)
source_files = {}
# Compiles all files in assets folder and adds to data in list format
# asst represents an entire organization's information
for filename in os.listdir("/Users/25jonnyx/Desktop/ecosystem-graphs/assets/"):
    with open("/Users/25jonnyx/Desktop/ecosystem-graphs/assets/" + str(filename), "r") as f:
        if (".yaml" in filename):
            asst = yaml.safe_load(f)
            if(not asst == None):
                for thing in asst:
                    source_files.update({thing["name"]: filename})
                data.append(asst)

sizes = []
recent_assets = []
recent_source_files = []
fixed_date = datetime.date(2023, 3, 17)
month = 0
day = 0
year = 0
# For every asset in the data, take the list of their attributes and analyze (words are mixed)



updated_size_dict = {}
updated_modality_dict = {}

for attributes in data:
    for asset in attributes:
        temp = asset["created_date"]
        type = asset["type"]
        size_param = ""
        updated_size_param = ""
        modality = ""
        updated_modality = {}
        int_value = 0
        # Making sure that date is the correct format (datetime.date)
        if (isinstance(temp, dict)):
            date = (temp["value"])
        else:
            date = (temp)
        # Checks to see if the asset is recent
        if (isinstance(date, datetime.date) and date > datetime.date(2022, 1, 1)):
            recent_assets.append(asset)
            recent_source_files.append(source_files[asset["name"]])
            # Code for comparing sizes (visualization):
            if(asset["type"] == "model" and isinstance(asset['size'], dict)):
                size_param = asset["size"]["value"]
            elif(asset["type"] == "model"):
                size_param = asset["size"]
            else:
                size_param = ""
            if(size_param != "" and size_param.lower() != "unknown" and size_param.lower() != "unknow"):
                size_values = size_param.split(" ")
                if("b" in size_values[0].lower()):
                    int_value = int(10**9 * float(size_values[0][:-1]))
                elif("m" in size_values[0].lower()):
                    int_value = int(10**6 * float(size_values[0][:-1]))
                elif ("t" in size_values[0].lower()):
                    int_value = int(10**12 * float(size_values[0][:-1]))
                elif ("k" in size_values[0].lower()):
                    int_value = int(10**3 * float(size_values[0][:-1]))
                sizes.append(int_value)
            else:
                sizes.append(0)
            updated_size_param = size_param
            modifier = "(dense)"
            if(size_param != '' and size_param.lower() != "unknown"):
                size_param_words = size_param.split(" ")
                updated_size_param = size_param_words[0] + " parameters"
                if("sparse" in size_param):
                    modifier = "(sparse)"
                updated_size_param += " " + modifier
            if (asset["type"] == "model" or asset["type"] == "dataset"):
                modality = asset["modality"]
                if isinstance(modality, dict):
                    if "value" in modality:
                        modality = asset["modality"]["value"]
                    else:
                        modality = ""
                if(asset["type"] == "dataset"):
                    upmodal_value = ""
                    other_bool = True
                    if isinstance(modality, str):
                        if "audio" in modality.lower() or "speech" in modality.lower():
                            upmodal_value += "audio, "
                            other_bool = False
                        if "code" in modality.lower():
                            upmodal_value += "code, "
                            other_bool = False
                        if "image" in modality.lower():
                            upmodal_value += "image, "
                            other_bool = False
                        if "text" in modality.lower():
                            upmodal_value += "text, "
                            other_bool = False
                        if "video" in modality.lower():
                            upmodal_value += "video, "
                            other_bool = False
                        if not other_bool:
                            upmodal_value = upmodal_value[:-2]
                        else:
                            upmodal_value = "other"
                        if(upmodal_value == modality):
                            updated_modality = modality
                        else:
                            updated_modality["value"] = upmodal_value
                            updated_modality["explanation"] = modality
                if(asset["type"] == "model"):
                    input_value = ""
                    output_value = ""
                    other_bool_2 = True
                    if("input" in modality):
                        input_str = ""
                        output_str = ""
                        if(modality.find("from") != -1):
                            input_str = modality[:modality.find("from")]
                            output_str = modality[modality.find("from"):]
                        else:
                            input_str = modality[:modality.find("input")]
                            output_str = modality[modality.find("input"):]
                        if "audio" in input_str.lower() or "speech" in input_str.lower():
                            input_value += "audio, "
                            other_bool_2 = False
                        if "code" in input_str.lower():
                            input_value += "code, "
                            other_bool_2 = False
                        if "image" in input_str.lower() or "structure" in input_str.lower():
                            input_value += "image, "
                            other_bool_2 = False
                        if "text" in input_str.lower() or "sequence" in input_str.lower():
                            input_value += "text, "
                            other_bool_2 = False
                        if "video" in input_str.lower():
                            input_value += "video, "
                            other_bool_2 = False
                        if not other_bool_2:
                            input_value = input_value[:-2]
                        else:
                            input_value = "other"
                        # now for the output string
                        other_bool_2 = True
                        if "audio" in output_str.lower() or "speech" in output_str.lower():
                            output_value += "audio, "
                            other_bool_2 = False
                        if "code" in output_str.lower():
                            output_value += "code, "
                            other_bool_2 = False
                        if "image" in output_str.lower() or "structure" in output_str.lower():
                            output_value += "image, "
                            other_bool_2 = False
                        if "text" in output_str.lower() or "sequence" in output_str.lower():
                            output_value += "text, "
                            other_bool_2 = False
                        if "video" in output_str.lower():
                            output_value += "video, "
                            other_bool_2 = False
                        if not other_bool_2:
                            output_value = output_value[:-2]
                        elif (output_str.find("input and output") == -1):
                            output_value = "other"
                        else:
                            output_value = input_value
                        updated_modality["value"] = input_value + "; " + output_value
                        updated_modality["explanation"] = modality
                    elif modality.lower() != "unknown":
                        if "audio" in modality.lower() or "speech" in modality.lower():
                            input_value += "audio, "
                            other_bool_2 = False
                        if "code" in modality.lower():
                            input_value += "code, "
                            other_bool_2 = False
                        if "image" in modality.lower() or "structure" in modality.lower():
                            input_value += "image, "
                            other_bool_2 = False
                        if "text" in modality.lower() or "sequence" in modality.lower():
                            input_value += "text, "
                            other_bool_2 = False
                        if "video" in modality.lower():
                            input_value += "video, "
                            other_bool_2 = False
                        if not other_bool_2:
                            input_value = input_value[:-2]
                        else:
                            input_value = "other"
                        output_value = input_value
                        updated_modality["value"] = input_value + "; " + output_value
                        updated_modality["explanation"] = modality

        updated_modality_dict[asset["name"]] = updated_modality
        updated_size_dict[asset["name"]] = updated_size_param

application_order = []
dataset_order = []
model_order = []

orders = {"application": application_order, "dataset": dataset_order, "model": model_order}


with open("/Users/25jonnyx/Desktop/ecosystem-graphs/js/schemas.yaml", "r") as f:
    file = yaml.safe_load(f)
    for asset_type in file:
        for feature in file[asset_type]:
            orders[asset_type].append(feature["name"])


represent_dict_order = lambda self, data:  self.represent_mapping('tag:yaml.org,2002:map', data.items())
yaml.add_representer(OrderedDict, represent_dict_order)

for filename in os.listdir("/Users/25jonnyx/Desktop/ecosystem-graphs/assets/"):
    yaml_string = ""
    with open("/Users/25jonnyx/Desktop/ecosystem-graphs/assets/" + str(filename), "r") as f:
        if (".yaml" in filename):
            company_assets = yaml.safe_load(f)
            updated_asset = {}
            updated_company_assets = []
            if(not company_assets == None):
                for asset in company_assets:
                    updated_asset = asset.copy()
                    name = asset["name"]
                    if(asset["type"] == "model"):
                        updated_asset["size"] = updated_size_dict[name]
                    if(asset["type"] == "model" or asset["type"] == "dataset"):
                        updated_asset["modality"] = updated_modality_dict[name]
                    type = updated_asset["type"]
                    ordered_features_dict = OrderedDict()
                    for feature in orders[type]:
                        ordered_features_dict[feature] = updated_asset[feature]
                    updated_company_assets.append(ordered_features_dict)
                yaml_string = yaml.dump(updated_company_assets)
                print(yaml_string)

    with open("/Users/25jonnyx/Desktop/ecosystem-graphs/assets/" + str(filename), "w") as file:
        if(".yaml" in filename):
            file.write(yaml_string)

#
# desired_width = 320
#
# pd.set_option('display.width', desired_width)
#
# np.set_printoptions(linewidth=desired_width)
#
# pd.set_option('display.max_columns', 10)
# df = pd.DataFrame(recent_assets)
# df["source file name"] = recent_source_files
# df["sizes"] = sizes
#
#
# #Fix this code
# standard_modality = []
# for data in df["modality"]:
#     if isinstance(data, dict) and "value" in data.keys():
#         input_value = ""
#         other_bool_2 = True
#         modality = data["value"]
#         if isinstance(modality, str):
#             if "audio" in modality.lower() or "speech" in modality.lower():
#                 input_value += "audio, "
#                 other_bool_2 = False
#             if "code" in modality.lower():
#                 input_value += "code, "
#                 other_bool_2 = False
#             if "image" in modality.lower() or "structure" in modality.lower():
#                 input_value += "image, "
#                 other_bool_2 = False
#             if "text" in modality.lower() or "sequence" in modality.lower():
#                 input_value += "text, "
#                 other_bool_2 = False
#             if "video" in modality.lower():
#                 input_value += "video, "
#                 other_bool_2 = False
#             if not other_bool_2:
#                 input_value = input_value[:-2]
#             else:
#                 input_value = "other"
#         standard_modality.append(input_value)
#     else:
#         standard_modality.append("None")
# df["standardized modality"] = standard_modality
#
#
# df_pre_text = df.copy(deep=True)
# df_post_text = df.copy(deep=True)
# for i in range(len(df["standardized modality"])):
#     pre_dropped = False
#     post_dropped = False
#     create_date = (df["created_date"][i])
#     if(isinstance(create_date, dict)):
#         create_date = create_date["value"]
#     if (create_date >= datetime.date(2023, 2, 23)):
#         df_pre_text = df_pre_text.drop([i])
#         pre_dropped = True
#     if (create_date < datetime.date(2023, 2, 23)):
#         df_post_text = df_post_text.drop([i])
#         post_dropped = True
#     if(not df["standardized modality"][i] == "text"):
#         if(not pre_dropped):
#             df_pre_text = df_pre_text.drop([i])
#         if(not post_dropped):
#             df_post_text = df_post_text.drop([i])
#
#
# fig_pre_llama = px.scatter(df_pre_text, x="created_date",y="sizes",hover_name = "name",log_y = True)
# fig_pre_llama.show()
# fig_post_llama = px.scatter(df_post_text, x="created_date",y="sizes",hover_name = "name",log_y = True)
# fig_post_llama.show()
#
# fig_overall = px.scatter(df, x="created_date",y="sizes",hover_name = "name",log_y = True, color = "sizes")
# fig_overall.show()
#
#
# standard_dates = []
# coupled_sizes = []
# index = 0
# for date in df["created_date"]:
#     coupled_sizes.append(df["sizes"][index])
#     if isinstance(date, dict):
#         standard_dates.append(date["value"])
#     else:
#         standard_dates.append(date)
#     index += 1
#
# month_avg_sums = []
# month_avg_counts = []
#
# for i in range(24):
#     month_avg_sums.append(0.0)
#     month_avg_counts.append(0)
#
# for i in range(len(standard_dates)):
#     found = False
#     for year in range(2023,2021,-1):
#         for month in range(12,0,-1):
#             if(not found and standard_dates[i] >= datetime.date(year, month, 1)):
#                 found = True
#                 if(coupled_sizes[i] != 0):
#                     month_avg_sums[(year - 2022) * 12 + month - 1] += math.log(coupled_sizes[i], 10)
#                     month_avg_counts[(year - 2022) * 12 + month - 1] += 1
#
# monthly_averages = []
#
# for i in range(24):
#     if(month_avg_counts[i] == 0):
#         monthly_averages.append(0)
#     else:
#         monthly_averages.append(month_avg_sums[i]/month_avg_counts[i])

# x_dates = [x + 1 for x in range(24)]
# plt.plot(x_dates, monthly_averages)
# plt.yscale("log")
# plt.show()



#
# sizes = sorted(sizes)
# x_sizes = [x for x in range(len(sizes))]
# print(sizes)
# print(x_sizes)
# plt.yscale("log")

