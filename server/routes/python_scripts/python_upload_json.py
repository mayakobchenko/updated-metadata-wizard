import sys
import json
import warnings
from datetime import datetime
import fairgraph
from fairgraph import KGClient
from fairgraph.openminds.core import DatasetVersion
from fairgraph.openminds.controlledterms import SemanticDataType

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
        dsv_id = data['datasetVersionId']
        dsv_short_title = data['dataset1']['shortTitle']
        dsv_title = data['dataset1']['dataTitle']
        embargo = data['dataset1']['embargo']
        if embargo:
            embargo_release_date = data['dataset1']['embargoDate']
        else:
            embargo_release_date = None
        dsv_brief_summary = data['dataset1']['briefSummary']
        data_type_list = data['dataset1']['optionsData']
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
            dsv_instance = DatasetVersion.from_id(
                dt_id, client, scope="in progress")
            # ds_instance = fairgraph.openminds.core.Dataset.from_id(dt_id, client, scope="in progress")

        dsv_instance.short_name = dsv_short_title
        # dsv_instance.alias = dsv_short_title
        dsv_instance.full_name = dsv_title
        dsv_instance.data_types = []

        for data_type in data_type_list:
            data_type_name = data_type.lower()
            cti_data_type = fairgraph.openminds.controlledterms.SemanticDataType.by_name(
                data_type_name, client)
            dsv_instance.data_types += [cti_data_type]

        if embargo:
            cti_accessibility = fairgraph.openminds.controlledterms.ProductAccessibility.by_name(
                'under embargo', client)
            dsv_instance.accessibility = cti_accessibility
            date_obj = datetime.fromisoformat(embargo_release_date[:-1])
            formatted_date = date_obj.strftime('%m/%d/%Y')
            dsv_instance.release_date = formatted_date

        dsv_instance.save(client)

        # access = DSV.accessibility.resolve(client)
        # accessebility = access.name
        return ({"metadata saved": "success"})

    except Exception as e:
        return ({"error": e})


data_info = fetch_data_info(dsv_id, personal_token)
print(json.dumps(data_info))
# print(data_info)
