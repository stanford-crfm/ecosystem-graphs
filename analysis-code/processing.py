
def extract(asset, field, dict_key):
    if (not isinstance(asset[field], dict)):
        return asset[field]
    if(isinstance(asset[field], dict) and dict_key in asset[field].keys()):
        return asset[field][dict_key]
    return None

def replace(asset, field, dict_key, new_value):
    if (not isinstance(asset[field], dict)):
        asset[field] = new_value
    if(isinstance(asset[field], dict) and dict_key in asset[field].keys()):
        asset[field][dict_key] = new_value
    return asset

def integer_sizes(df):
    size_values = []
    for organization in df:
        for asset in organization:
            if(asset[type] == "model"):
                size = extract(asset, "size", "value")
                if (size != None and size.lower() != "unknown"):
                    size_words = size.split(" ")
                    if ("b" in size_words[0].lower()):
                        int_value = int(10 ** 9 * float(size_values[0][:-1]))
                    elif ("m" in size_words[0].lower()):
                        int_value = int(10 ** 6 * float(size_values[0][:-1]))
                    elif ("t" in size_words[0].lower()):
                        int_value = int(10 ** 12 * float(size_values[0][:-1]))
                    elif ("k" in size_words[0].lower()):
                        int_value = int(10 ** 3 * float(size_values[0][:-1]))
                    size_values.append(int_value)
                else:
                    size_values.append(0)
    return size_values

def standardize_size(asset):
    size_field = extract(asset, "size", "value")
    modifier = "(dense)"
    if (size_field != '' and size_field.lower() != "unknown"):
        size_field_words = size_field.split(" ")
        updated_size_field = size_field_words[0] + " parameters"
        if ("sparse" in size_field):
            modifier = "(sparse)"
        updated_size_field += " " + modifier
        return updated_size_field
    else:
        return size_field

# helper function for standard_modal, standardizes text in the fields
# assumes input is a string, should extract() first before running function
def standardize_fields(modality):
    upmodal_value = ""
    # check to see if modality is non-standard
    other = True
    if "audio" in modality.lower() or "speech" in modality.lower():
        upmodal_value += "audio, "
        other = False
    if "code" in modality.lower():
        upmodal_value += "code, "
        other = False
    if "image" in modality.lower():
        upmodal_value += "image, "
        other = False
    if "text" in modality.lower():
        upmodal_value += "text, "
        other = False
    if "video" in modality.lower():
        upmodal_value += "video, "
        other = False
    if upmodal_value[-2:] == ", ":
        upmodal_value = upmodal_value[:-2]
    if other:
        upmodal_value = modality
    return upmodal_value

#only datasets and models have a modality
def standardize_modal(asset):
    # modality of asset
    modality = extract(asset, "modality", "value")
    # type of asset (application, dataset, model)
    type = extract(asset, "type", "value")
    # updated modality
    if(type == "dataset"):
        return standardize_fields(modality)
    # assumes model bc of precondition
    else:
        if(not ("input" in modality.lower() and "output" in modality.lower())):
            return standardize_fields(modality) + "; " + standardize_fields(modality)
        # there is a specified input and output for model
        else:
            # expects form "[input modalities] "input" ... [output modalities] "output"
            input_modalities = modality.split("input")[0]
            output_modalities = modality.split("input")[1]
            return standardize_fields(input_modalities) + "; " + standardize_fields(output_modalities)



