import requests
import bs4
from bs4 import BeautifulSoup
from openai import OpenAI
import os
import subprocess
import yaml
from playwright.sync_api import sync_playwright
from arxiv2text import arxiv_to_text
from twikit import Client
import config

os.environ["OPENAI_API_KEY"] = config.OPENAI_API_KEY
client = OpenAI()
model_features = ["name", "organization", "description", "created date", "modality", "analysis", "size", "dependencies",
                  "training emissions", "training time", "training hardware", "quality control",
                  "license", "intended uses", "prohibited uses", "monitoring", "feedback"]
dataset_features = ["name", "organization", "description", "created date", "modality", "size", "sample", "analysis",
                    "dependencies",
                    "included", "excluded", "quality control", "access", "license", "intended uses", "prohibited uses",
                    "monitoring", "feedback"]
twitter_list = ["GoogleDeepMind", "OpenAI", "AnthropicAI", "togethercompute", "MistralAILabs", "CohereForAI",
                "AIatMeta", "StabilityAI", "AI21Labs", "huggingface","_akhaliq"]


# Simple dist alg, can change later
def hammingDist(str1, str2):
    i = 0
    count = 0
    while (i < len(str1) and i < len(str2)):
        if (str1[i] != str2[i]):
            count += 1
        i += 1
    return count

# Returns the text (need specifications) of a tweet given the link
def scrape_tweet(url: str) -> dict:
    _xhr_calls = []

    def intercept_response(response):
        # can extract details from background requests
        if response.request.resource_type == "xhr":
            _xhr_calls.append(response)
        return response

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=False)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()

        # enable background request intercepting:
        page.on("response", intercept_response)
        # go to url and wait for the page to load
        page.goto(url)
        page.wait_for_selector("[data-testid='tweet']")

        # find all tweet background requests:
        tweet_calls = [f for f in _xhr_calls if "TweetResultByRestId" in f.url]
        for xhr in tweet_calls:
            data = xhr.json()
            return data['data']['tweetResult']['result']



# Returns text of a HF page (model/dataset)
def hf_scrape(url, asset_type):
    html_text = (requests.get(url)).text
    soup = BeautifulSoup(html_text, 'html.parser')
    if asset_type == "model":
        card_div = soup.find('div', class_='model-card-content')
    if asset_type == "dataset":
        card_div = soup.find('div', class_='prose')
    main_text = card_div.get_text()
    return main_text


# Returns text of an independent page
def post_scrape(url):
    html_text = (requests.get(url)).text
    soup = bs4.BeautifulSoup(html_text, 'html.parser')
    main_text = soup.body.get_text(' ', strip=True)
    return main_text

# Returns the most recent tweets from a username
def get_tweets(username):
    twikit_client = Client('en-US')
    twikit_client.load_cookies('cookie.json')
    user = twikit_client.get_user_by_screen_name(username)
    user_id = user.id
    tweets = twikit_client.get_user_tweets(user_id, 'Tweets')
    tweet_strs = []
    for tweet in tweets:
        tweet_str = str(tweet)
        id = tweet_str[tweet_str.find("\"") + 1: tweet_str.find("\"", tweet_str.find("\"") + 1)]
        tweet_str = "https://twitter.com/anyuser/status/" + id
        tweet_strs.append(tweet_str)
    return tweet_strs

# Given information, creates a gpt-generated model card
def card_to_gpt(text, asset_type):
    if asset_type == "model":
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": """Your task is to create a model card for a foundation model. 
            You will be provided with some information about the model. Please provide information about 
            the model in the following format. If a field cannot be found, please put the field as "unknown":
            - Name: Name of the model (Examples: "Gemma 2", "Falcon-40B", "GPT-4o")
            - Organization: Organization that created the model. (Examples: "Google Deepmind", "OpenAI", "Anthropic")
            - Description: Description of the model.
            - Created Date: Date the model was released in YYYY-MM-DD format. (Examples: "2023-04-12" for April 12, 2023 
                or "2022-11-23" for November 23, 2022)            
            - Modality: Modalities represented in the model in input; output format (Examples: "text; image" for a model 
                that takes text input and generates image output or "text; video" for a model that takes a text input 
                and produces video output).
            - Analysis: Description of any evaluations that were done on the model.
            - Size: Size of the model including number of parameters in the model, and include whether the model is sparse. 
                If the model card describes a family of models, state the size of the largest such model. If the model
                mentions it is a Mixture of Experts or MoE model, it is sparse. If the model card states a number before the
                letters 'B', 'M', 'T', or 'k', (like 10B, 250M, 1.2T or 800k) that number likely refers to the number 
                of model parameters.
                (Examples: "7B parameters" for a dense model that has 7 billion parameters, "100M parameters (sparse)" for 
                a Mixture of Experts model that has 100 million parameters).
            - Dependencies: A list of assets (e.g. datasets, models, applications) that this model was directly built on 
                or was fine-tuned from in a bracketed list form. (Example: "[LLaMA, RedPajama-Data]" for a model that 
                was fine-tuned from the LLaMA model and directly uses the dataset RedPajama-Data as training data).
            - Training Emissions: Estimate of the carbon emissions used to create this model.
            - Training Time: How much time it took to train this model.
            - Training Hardware: What hardware was used to train the model. (Example: "20 NVIDIA A100 80GB GPUs")
            - Quality Control: What measures were taken to ensure quality, safety, and mitigate harms.
            - Access: open/closed/limited (Should just be only one of these words).
            - License: License of the model. Do NOT include the word 'license'. (Examples: "Apache 2.0", "MIT")
            - Intended Uses: Description of what the model can be used for downstream.
            - Prohibited Uses: Description of what the model should not be used for downstream.
            - Monitoring: Description of measures taken to monitor downstream uses of this model.
            - Feedback: How downstream problems with this model should be reported."""},
                {"role": "user", "content": "Here is the provided information about the model: " + "\n" + text}])
    else:
        response = client.chat.completions.create(model="gpt-4", messages=[
            {"role": "system", "content": """Your task is to create a dataset card for a foundation model dataset. You will
            be provided with some information about the dataset. Please provide the following information about 
            the dataset in the following format. If a field cannot be found, please put the field as "unknown":
            - Name: Name of the dataset (must be a unique identifier)
            - Organization: Organization that created the dataset.
            - Description: Description of the dataset.
            - Created Date: Date the dataset was released in YYYY-MM-DD format. (Examples: "2023-04-12" for April 12, 2023 
                or "2022-11-23" for November 23, 2022)                    
            - Modality: Modalities represented in the dataset (Examples: "text, image" for a dataset that contains
                text and image data. "audio, video" for a dataset that contains only audio and video data).
            - Size: How big (uncompressed) the dataset is. (Examples: "1600 tasks", "1.5M text-image pairs") 
            - Analysis: Description of any evaluation that was done on the dataset.                        
            - Dependencies: A list of assets (e.g. datasets, models, applications) that this dataset was directly built 
                on or was fine-tuned from in bracketed list form. (Example: "[RedPajama-Data]" for a dataset that 
                was directly built on the dataset RedPajama-Data).
            - Included: Description of what data is included.
            - Excluded: Description of what data is excluded (e.g., filtered out) and why.
            - Quality Control: What measures were taken to ensure quality, safety, and mitigate harms.
            - Access: open/closed/limited (Should just be only one of these words).
            - License: License of the dataset. Do NOT include the word 'license'. (Examples: "Apache 2.0", "MIT")
            - Intended Uses: Description of what the dataset can be used for downstream.
            - Prohibited Uses: Description of what the dataset should not be used for downstream.
            - Monitoring: Description of measures taken to monitor downstream uses of this dataset.
            - Feedback: How downstream problems with this dataset should be reported."""},
            {"role": "user", "content": "Here is the provided information about the dataset: " + "\n" + text}])
    return response.choices[0].message.content



# Given a few extra details and the model card text, turns it into a yaml file
def make_asset_yaml(url, card_url, body, asset_type):
    yaml_text = "- type: " + asset_type + "\n"
    lines = body.split("\n")
    for feature_line in lines:
        feature = feature_line[2:feature_line.find(":")].lower().replace(" ", "_")
        yaml_line = "  " + feature + feature_line[feature_line.find(":"):]
        yaml_text += yaml_line + "\n"
        if feature == "created_date":
            yaml_text += "  url: " + url + "\n"
            if asset_type == "model":
                yaml_text += "  model_card: " + card_url + "\n"
            elif asset_type == "dataset":
                yaml_text += " datasheet: " + card_url + "\n"
        if feature == "size" and asset_type == "dataset":
            yaml_text += "  sample: []\n"
    return yaml_text


# Adds a yaml file to the assets folder
def add_yaml(str, eco_path, name):
    assets_path = eco_path + "assets/"
    main_path = eco_path + "js/main.js"
    #if assets file is new
    if not os.path.exists(assets_path + name):
        # adding new file in assets
        with open(assets_path + name, "w") as file:
            file.write('---\n')
        # Adding new to main
        with open(main_path, "r") as f:
            main_contents = f.readlines()
        # Finding where to insert
        name_path = "    \'assets/" + name + "\',\n"
        for i in range(len(main_contents)):
            if "const paths =" in main_contents[i]:
                yaml_ind = i+1
                while("];" not in main_contents[yaml_ind] and name_path > main_contents[yaml_ind]):
                    yaml_ind += 1
                break
        main_contents.insert(yaml_ind, name_path)
        with open(main_path, "w") as f:
            contents = "".join(main_contents)
            f.write(contents)
    # if already existing assets file
    with open(assets_path + name, "a") as file:
        file.write(str)


# Queries GPT-4, if the post is announcing the release of a foundation model (True/False)
def tweet_fm(post_link):
    retweet = False
    tweet_dict = scrape_tweet(post_link)["legacy"]
    if("retweeted_status_result" in tweet_dict.keys()):
        tweet_text = tweet_dict["retweeted_status_result"]["result"]["legacy"]["full_text"]
        retweet = True
    else:
        tweet_text = tweet_dict["full_text"]
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": """Please determine if the following tweet is announcing the release of a new
                                          foundation model. Respond with only either "TRUE" or "FALSE"."""},
            {"role": "user", "content": tweet_text}])
    if response.choices[0].message.content.lower().find("true") != -1:
        if retweet:
            url = tweet_dict["retweeted_status_result"]["result"]["legacy"]["entities"]["urls"]
            if len(url) == 0 and "note_tweet" in tweet_dict["retweeted_status_result"]["result"] and len(
                    tweet_dict["retweeted_status_result"]["result"]["note_tweet"]["note_tweet_results"]["result"]
                    ["entity_set"]["urls"]) != 0:
                return tweet_dict["retweeted_status_result"]["result"]["note_tweet"]["note_tweet_results"]["result"]["entity_set"]["urls"][0]["expanded_url"]
        else:
            url = tweet_dict["entities"]["urls"]
        if len(url) == 0:
            return None
        else:
            return url[0]["expanded_url"]
    return None

# determines which yaml file an asset card should go to
def find_org(card_text, repo_path):
    org = card_text[card_text.find("organization: ") + 14: card_text.find("\n", card_text.find("organization: "))]
    f = open(repo_path + "js/main.js", "r")
    file = f.read()
    all_yamls_text = file[file.find("const paths") + 15:file.find("];", file.find("const paths"))]
    yamls_list_bad = all_yamls_text.split(",")
    yamls_list = []
    for yaml in yamls_list_bad:
        yamls_list.append(yaml[13:-6])
    yamls_list[-1] = yamls_list[-1][:-3]
    closest = 100.0
    file_name = "empty_org.yaml"
    for yaml in yamls_list:
        dist = float(hammingDist(yaml, org))
        if len(yaml) != 0 and len(org) != 0 and dist / min(len(yaml), len(org)) < closest:
            closest = dist / min(len(yaml), len(org))
            file_name = yaml
    return file_name


# Runs the entire PR, with a set number of manual links, and pushes to git repo
def run_pr(links, tweets, repo_path):

    # MODEL LINKS FROM HF
    page = requests.get('https://huggingface.co/' + "model" + 's?sort=trending')
    bs = BeautifulSoup(page.content, 'html.parser')
    for link in bs.findAll('a'):
        if "model" + "s" not in link.get('href') and "?" not in link.get('href'):
            first_slash = link.get('href').find('/')
            if link.get('href').find('/', first_slash + 1) != -1 and link.get('href').find("apply.workable") == -1:
                links.append("https://huggingface.co" + link.get('href'))

    # Add links from twitter sourced
    for acc in twitter_list:
        for post in get_tweets(acc):
            print(post)
            tweets.append(post)
    for tweet in tweets:
        corr_link = tweet_fm(tweet)
        if corr_link is not None:
            links.append(corr_link)
    links = list(set(links))

    # Add new links to JSON
    unique_links = []
    with open("asset_links.json", "r+") as f:
        asset_links = f.read().split("\n")
        for link in links:
            if link not in asset_links:
                if "arxiv" in link and "pdf" not in link:
                    link = link.replace("abs", "pdf")
                f.write(link + "\n")
                unique_links.append(link)
    num_assets = 0
    for link in unique_links:
        if "huggingface.co" in link and "huggingface.co/blog" not in link:
            if "datasets" in link:
                asset_type = "dataset"
            else:
                asset_type = "model"
            text = hf_scrape(link, asset_type)
            card_link = link
        # Paper
        elif "arxiv" in link:
            text = arxiv_to_text(link)
            asset_type = "model"
            card_link = ""
        else:
            asset_type = "model"
            card_link = ""
            if "youtube" not in link:
                text = post_scrape(link)
            else:
                text = ""
        text = text[:8000]
        if len(text) > 200:
            card_text = make_asset_yaml(link, card_link, card_to_gpt(text, asset_type), asset_type)
            file_name = find_org(card_text, repo_path)
            add_yaml(card_text, repo_path, file_name + ".yaml")
            num_assets += 1
            os.chdir(repo_path)
            subprocess.run(['git', 'add', '.'])
    subprocess.run(['git', 'commit', '-m', 'add automated weekly assets'])
    subprocess.run(['git', 'push', 'origin', 'main'])
