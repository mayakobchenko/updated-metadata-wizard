import sys
import json
import requests as rq
import copy
from uuid import uuid4

# ── constants ────────────────────────────────────────────────────────────────

KG_API = 'https://core.kg.ebrains.eu/v3/instances/'
KG_PREFIX = 'https://kg.ebrains.eu/api/instances/'
VOCAB = {"@context": {"@vocab": "https://openminds.om-i.org/props/"}}

# openMINDS types (new om-i.org namespace)
TYPE_DATASET_VERSION = "https://openminds.om-i.org/types/DatasetVersion"
TYPE_SUBJECT = "https://openminds.om-i.org/types/Subject"
TYPE_SUBJECT_STATE = "https://openminds.om-i.org/types/SubjectState"
TYPE_QUANT_VALUE = "https://openminds.om-i.org/types/QuantitativeValue"

# openMINDS properties (new om-i.org namespace)
PROP = "https://openminds.om-i.org/props/"

# ── argument parsing ─────────────────────────────────────────────────────────

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

# ── load form data ────────────────────────────────────────────────────────────

try:
    with open(json_file_path, 'r') as f:
        data = json.load(f)
except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)

# ── KG helpers ────────────────────────────────────────────────────────────────


def KG_patch(entry_id, attr, space_id):
    """Patch an existing KG instance."""
    try:
        headers = {
            "accept": "*/*",
            "Authorization": "Bearer " + personal_token,
            "Content-Type": "application/json; charset=utf-8"
        }
        payload = {**VOCAB, **attr}
        url = f'{KG_API}{entry_id.split("/")[-1]}?space=collab-d-{space_id}'
        resp = rq.patch(url=url, headers=headers,
                        data=json.dumps(payload, indent=4))
        resp.raise_for_status()
        return {"patched": entry_id, "status": resp.status_code}
    except Exception as e:
        return {"error": str(e), "entry_id": entry_id}


def KG_post(instance_id, attr, space_id):
    """Create a new KG instance. If it already exists (409), patch instead."""
    try:
        headers = {
            "accept": "*/*",
            "Authorization": "Bearer " + personal_token,
            "Content-Type": "application/json; charset=utf-8"
        }
        payload = {**VOCAB, **attr}
        url = f'{KG_API}{instance_id}?space={space_id}'
        resp = rq.post(url=url, headers=headers,
                       data=json.dumps(payload, indent=4))
        if resp.status_code == 409:
            resp = rq.patch(url=url, headers=headers,
                            data=json.dumps(payload, indent=4))
        resp.raise_for_status()
        return {"created": instance_id, "status": resp.status_code}
    except Exception as e:
        return {"error": str(e), "instance_id": instance_id}


# ── dataset version fields ────────────────────────────────────────────────────

def build_dataset_version_attributes(data):
    dsv_id = data.get("datasetVersionId", "")
    dsv_title = data.get("dataset1", {}).get("dataTitle", "")
    dsv_short_title = data.get("dataset1", {}).get("shortTitle", "")
    license_dsv = data.get("dataset1", {}).get("license", "")
    embargo = data.get("dataset1", {}).get("embargo", False)
    embargo_date = data.get("dataset1", {}).get(
        "embargoDate") if embargo else None
    brief_summary = data.get("dataset1", {}).get("briefSummary", "")

    # experimental approaches
    expappr_uuids = [
        exp.get("selectedExpAppr", "")
        for exp in data.get("experimental_approach", {}).get("addExperiment", [])
        if exp.get("selectedExpAppr")
    ]

    # preparation types
    prep_uuids = [
        p
        for entry in data.get("experimental_approach", {}).get("addPreparation", [])
        for p in (entry.get("selectedPrepType") or [])
        if p
    ]

    # study targets
    study_target_uuids = [
        instance
        for entry in data.get("experimental_approach", {}).get("studyTargetEntries", [])
        for instance in (entry.get("instances") or [])
        if instance
    ]

    # data types
    data_type_list = data.get("dataset1", {}).get("optionsData", [])
    if isinstance(data_type_list, str):
        data_type_list = [data_type_list]

    attributes = {
        f"{PROP}@type":                 TYPE_DATASET_VERSION,
        f"{PROP}fullName":              dsv_title,
        f"{PROP}shortName":             dsv_short_title,
        f"{PROP}description":           brief_summary,
        f"{PROP}license":               {"@id": license_dsv} if license_dsv else None,
        f"{PROP}experimentalApproach":  [{"@id": u} for u in expappr_uuids],
        f"{PROP}preparationType":       [{"@id": u} for u in prep_uuids],
        f"{PROP}studyTarget":           [{"@id": u} for u in study_target_uuids],
        f"{PROP}dataType":              [{"@id": u} for u in data_type_list],
    }

    # remove None values
    attributes = {k: v for k, v in attributes.items() if v is not None}

    if embargo_date:
        attributes[f"{PROP}releaseDate"] = embargo_date

    return dsv_id, attributes


# ── subject + subject state builders ─────────────────────────────────────────

def build_subject_instance(subject):
    """
    Build Subject and SubjectState nodes from a subject dict from Subjects.jsx.
    Returns (subject_uuid, subject_node), (state_uuid, state_node).
    """
    subject_uuid = str(uuid4())
    state_uuid = str(uuid4())
    subject_id_str = subject.get("subjectID", subject_uuid)

    subject_node = {
        "@type":              TYPE_SUBJECT,
        "lookupLabel":        subject_id_str,
        "internalIdentifier": subject_id_str,
        "studiedState":       {"@id": KG_PREFIX + state_uuid},
    }

    if subject.get("bioSex"):
        subject_node["biologicalSex"] = {"@id": subject["bioSex"]}

    if subject.get("species"):
        subject_node["species"] = [{"@id": subject["species"]}]

    if subject.get("strain"):
        subject_node["strain"] = {"@id": subject["strain"]}

    # ── subject state ──────────────────────────────────────────────────────
    state_node = {
        "@type":              TYPE_SUBJECT_STATE,
        "lookupLabel":        subject_id_str + "_state",
        "internalIdentifier": subject_id_str + "_state",
    }

    if subject.get("ageCategory"):
        state_node["ageCategory"] = {"@id": subject["ageCategory"]}

    if subject.get("handedness"):
        state_node["handedness"] = {"@id": subject["handedness"]}

    if subject.get("disease"):
        state_node["pathology"] = [{"@id": subject["disease"]}]

    if subject.get("age"):
        state_node["age"] = {
            "@type": TYPE_QUANT_VALUE,
            # year
            "unit":  {"@id": KG_PREFIX + "4042a7c2-20ba-4e21-8cac-d0d2e25145f0"},
            "value": subject["age"]
        }

    if subject.get("weight"):
        state_node["weight"] = {
            "@type": TYPE_QUANT_VALUE,
            # kg
            "unit":  {"@id": KG_PREFIX + "6e5f9e60-a0d0-4e37-9501-2e8d79fce1e3"},
            "value": subject["weight"]
        }

    return (subject_uuid, subject_node), (state_uuid, state_node)


def collect_all_subjects(data):
    """
    Extract all subjects from both flat and grouped modes of Subjects.jsx.
    Returns a flat list of subject dicts.
    """
    subject_metadata = data.get("subjectMetadata", {})

    if subject_metadata.get("subjects"):
        return subject_metadata["subjects"]

    if subject_metadata.get("subjectGroups"):
        all_subjects = []
        for group in subject_metadata["subjectGroups"]:
            all_subjects.extend(group.get("subjects", []))
        return all_subjects

    return []


# ── main upload ───────────────────────────────────────────────────────────────

results = []

# 1. patch dataset version
dsv_id, dsv_attributes = build_dataset_version_attributes(data)
if dsv_id:
    result = KG_patch(dsv_id, dsv_attributes, dsv_id)
    results.append({"datasetVersion": result})
else:
    results.append(
        {"datasetVersion": "skipped — no datasetVersionId in form data"})

# 2. create subjects and subject states
space_id = dsv_id.split("/")[-1] if dsv_id else "dataset"
subjects = collect_all_subjects(data)
specimen_list = []

for subject in subjects:
    (subj_uuid, subj_node), (state_uuid,
                             state_node) = build_subject_instance(subject)

    # post state first (subject references it)
    state_result = KG_post(state_uuid, state_node, f'collab-d-{space_id}')
    results
