def extract(dict, field, dict_key):
    if(isinstance(field, dict) and dict_key in field.keys()):
        return dict[field[dict_key]]
    if(not isinstance(field, dict)):
        return dict[field]
    return None

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

def standard_size(size_field):
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


def standard_modal(modality):
    upmodal_value = ""
    other_bool = True
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
    return_dict = {}
    return_dict["value"] = upmodal_value
    return_dict["explanation"] = modality
    return return_dict