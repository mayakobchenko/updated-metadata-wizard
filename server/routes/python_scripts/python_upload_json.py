import sys
import json
import requests as rq
from uuid import uuid4


def as_id_list(values):
    if not values:
        return []
    if isinstance(values, list):
        flat = []
        for v in values:
            if isinstance(v, list):
                flat.extend(v)  # flatten nested lists
            elif isinstance(v, str) and v:
                flat.append(v)
        return [{"@id": v} for v in flat if v]
    # single string
    if isinstance(values, str) and values:
        return [{"@id": values}]
    return []


def as_single_id(values):
    """
    Return a single @id object.
    If multiple values, return a list.
    If one value, return a single object (matches KG behaviour).
    """
    items = as_id_list(values)
    if not items:
        return None
    if len(items) == 1:
        return items[0]
    return items


if len(sys.argv) > 1:
    personal_token = sys.argv[1]
    if personal_token == "null" or personal_token == "undefined" or not personal_token.strip():
        print(json.dumps(
            {"error": "Session expired. Please reload the page and log in again."}))
        sys.exit(1)
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
        expappr_uuid = data.get('experiments', {}).get(
            'experimentalApproach', [])
        # expappr_uuid = [exp.get('selectedExpAppr', '') for exp in data.get('experiments', {}).get('experimentalApproach', [])]

        # data_type_options = data['dataset1']['optionsData']
        data_type_options = data.get('dataset1', {}).get('optionsData', [])
        techniques = data.get('experiments', {}).get('techniques', [])


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

        # print(f"DEBUG entry_id: {entry_id}", file=sys.stderr)
        # print(f"DEBUG space_id: {space_id}", file=sys.stderr)
        # print(f"DEBUG url: {url}", file=sys.stderr)
        # print(f"DEBUG token (first 10 chars): {personal_token[:10]}...", file=sys.stderr)

        resp = rq.patch(url=url, headers=headers, data=content)

        print(f"DEBUG response status: {resp.status_code}", file=sys.stderr)
        print(f"DEBUG response body: {resp.text[:500]}", file=sys.stderr)

        if resp.ok:
            return {"metadata saved in the KG": "success", "status": resp.status_code}
        else:
            return {"error": f"KG returned {resp.status_code}", "detail": resp.text}
        # return ({"metadata saved in the KG": "success"})
    except Exception as e:
        return {"error": str(e)}


# expappr_uuid = [exp['selectedExpAppr'] for exp in data['experimental_approach']['addExperiment']]

attributes = {
    "https://openminds.om-i.org/props/fullName": dsv_title,
    "https://openminds.om-i.org/props/shortName": dsv_short_title,
    "https://openminds.om-i.org/props/license":  license_dsv,
    # "https://openminds.om-i.org/props/accessibility": embargo,
    "https://openminds.om-i.org/props/experimentalApproach": [{"@id": url} for url in expappr_uuid],
    "https://openminds.om-i.org/props/dataType": [{"@id": url} for url in data_type_options],
    "https://openminds.om-i.org/props/technique": [{"@id": url} for url in techniques],
    # "https://openminds.om-i.org/props/funding": funding,
}

data_info = KG_patch(dsv_id, attributes, dsv_id)

print(json.dumps(data_info))
