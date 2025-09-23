import sys
import json
import requests

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

        return response.json()  # successful JSON response
    except requests.exceptions.HTTPError as http_err:
        # return a dict instead of print
        return {"error": f"HTTP error occurred: {http_err}"}
    except requests.exceptions.ConnectionError as conn_err:
        return {"error": f"Connection error occurred: {conn_err}"}
    except requests.exceptions.Timeout as timeout_err:
        return {"error": f"Timeout error occurred: {timeout_err}"}
    except requests.exceptions.RequestException as req_err:
        return {"error": f"An error occurred: {req_err}"}
    except ValueError as json_err:
        return {"error": f"JSON decoding error: {json_err}. Response: {response.text}"}


collab_data = fetch_collab_data(collab_base_url, personal_token)
print(json.dumps(collab_data))
