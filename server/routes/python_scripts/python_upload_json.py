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

# --------------------------------------

dataset_id = "12195530-5751-44a9-a2b3-82613a387642"


def fetch_data_info(dt_id, token):
    try:
        client = KGClient(token, host="core.kg.ebrains.eu")
        with warnings.catch_warnings(record=False):
            DSV = DatasetVersion.from_id(dt_id, client, scope="in progress")
            access = DSV.accessibility.resolve(client)
            accessebility = access.name

        return ({"access": accessebility})

    except Exception as e:
        return ({"access": accessebility})


data_info = fetch_data_info(dataset_id, personal_token)
print(json.dumps(data_info))
