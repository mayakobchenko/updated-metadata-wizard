import sys
import json
import warnings
import fairgraph
from fairgraph import KGClient
from fairgraph.openminds.core import DatasetVersion

if len(sys.argv) > 1:
    personal_token = sys.argv[1]
else:
    print(json.dumps({"error": "No working token provided."}))
    sys.exit(1)

if len(sys.argv) > 2:
    json_file_path = sys.argv[2]
else:
    print(json.dumps({"error": "No metadata JSON file path provided."}))
    sys.exit(2)
# --------------------------------------
try:
    with open(json_file_path, 'r') as json_file:
        data = json.load(json_file)
        # dataset1 = data['dataset1']
        dataset_id = data['datasetVersionId']
        # print(json.dumps({"message": "Successfully read JSON", "data title": dataset1_title}))

except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)

# -----------------------------------------------

# dataset_id = "12195530-5751-44a9-a2b3-82613a387642"


def fetch_data_info(dt_id, token):
    try:
        client = KGClient(token, host="core.kg.ebrains.eu")
        with warnings.catch_warnings(record=False):
            DSV = DatasetVersion.from_id(
                dt_id, client, scope="in progress")
            DSV.short_name = "my new short title"
            DSV.save(client)
            # access = DSV.accessibility.resolve(client)
            # accessebility = access.name

        return ({"metadata saved": "success"})

    except Exception as e:
        return ({"error": e})


data_info = fetch_data_info(dataset_id, personal_token)
print(json.dumps(data_info))
