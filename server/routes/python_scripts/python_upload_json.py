import sys
import json
import requests as rq
from uuid import uuid4

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

        dsv_id = data.get("datasetVersionId", "")
        dsv_short_title = data.get("dataset1", {}).get("shortTitle", "")
        dsv_title = data.get("dataset1", {}).get("dataTitle", "")
        license_dsv = data.get("dataset1", {}).get("license", "")
        embargo = data.get("dataset1", {}).get("embargo", False)
        if embargo:
            embargo_release_date = data['dataset1']['embargoDate']
        else:
            embargo_release_date = None
        # dsv_brief_summary = data.get("dataset1", {}).get("briefSummary", "")
        expappr_uuid = [exp.get('selectedExpAppr', '') for exp in data.get(
            'experimental_approach', {}).get('addExperiment', [])]

        data_type_list = data['dataset1']['optionsData']

except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)


def KG_patch(entry_id, attr, space_id):
    try:
        if not personal_token:
            print('No token')
            return
        headers = {
            "accept": "*/*",
            "Authorization": "Bearer " + personal_token,
            "Content-Type": "application/json; charset=utf-8"
        }
        content = json.dumps(attr, indent=4)
        url = f'https://core.kg.ebrains.eu/v3/instances/{entry_id.split("/")[-1]}?space=collab-d-{space_id}'
        resp = rq.patch(url=url, headers=headers, data=content)
        print(resp)
        return ({"metadata saved in the KG": "success"})
    except Exception as e:
        return ({"error": e})


# expappr_uuid = [exp['selectedExpAppr'] for exp in data['experimental_approach']['addExperiment']]

attributes = {
    "https://openminds.ebrains.eu/vocab/fullName": dsv_title,
    "https://openminds.ebrains.eu/vocab/shortName": dsv_short_title,
    "https://openminds.ebrains.eu/vocab/license":  license_dsv,
    "https://openminds.ebrains.eu/vocab/experimentalApproach": [{"@id": url} for url in expappr_uuid],
}

data_info = KG_patch(dsv_id, attributes, dsv_id)

print(json.dumps(data_info))
