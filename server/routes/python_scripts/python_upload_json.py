import sys
import json
import requests
from fairgraph import KGClient
from fairgraph.openminds.core import DatasetVersion

if len(sys.argv) > 1:
    json_file_path = sys.argv[1]
else:
    print(json.dumps({"error": "No metadata JSON file path provided."}))
    sys.exit(1)

if len(sys.argv) > 2:
    personal_token = sys.argv[2]
else:
    print(json.dumps({"error": "No working token provided."}))
    sys.exit(2)

try:
    with open(json_file_path, 'r') as json_file:
        data = json.load(json_file)
        dataset1 = data['dataset1']
        dataset1_short_title = dataset1['shortTitle']
        # print(json.dumps({"message": "Successfully read JSON", "data title": dataset1_title}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)

# --------------------------------------

dataset_id = "12195530-5751-44a9-a2b3-82613a387642"


def fetch_data_info(dataset_id, personal_token):
    try:
        client = KGClient(personal_token, host="core.kg.ebrains.eu")
        DSV = DatasetVersion.from_id(dataset_id, client, scope="in progress")
        access = DSV.accessibility.resolve(client)

        return ({"access": access.name})

    except Exception as e:
        return ({"error": str(e)})


data_info = fetch_data_info(dataset_id, personal_token)
print(json.dumps(data_info))

# ---------------------------
collab_base_url = 'https://wiki.ebrains.eu/rest/v1/collabs/d-724d4af0-fe28-4032-8837-120b0d64a81c'


def fetch_collab_data(url, personal_token, timeout=10):
    try:
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {personal_token}',
            'Accept': '*/*'
        }
        response = requests.get(url, headers=headers, timeout=timeout)
        response.raise_for_status()

        return response.json()
    except requests.exceptions.HTTPError as http_err:
        return {"error": f"HTTP error occurred: {http_err}"}
    except requests.exceptions.ConnectionError as conn_err:
        return {"error": f"Connection error occurred: {conn_err}"}
    except requests.exceptions.Timeout as timeout_err:
        return {"error": f"Timeout error occurred: {timeout_err}"}
    except requests.exceptions.RequestException as req_err:
        return {"error": f"An error occurred: {req_err}"}
    except ValueError as json_err:
        return {"error": f"JSON decoding error: {json_err}. Response: {response.text}"}


# collab_data = fetch_collab_data(collab_base_url, personal_token)
# print(json.dumps(collab_data))
