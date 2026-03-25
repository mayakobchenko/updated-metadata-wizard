import sys
import json
import requests as rq
from uuid import uuid4

# ── constants ─────────────────────────────────────────────────────────────────
# Updated to new om-i.org namespace (migration from openminds.ebrains.eu)

KG_API = 'https://core.kg.ebrains.eu/v3/instances/'
KG_PREFIX = 'https://kg.ebrains.eu/api/instances/'

# new namespace
VOCAB = {"@context": {"@vocab": "https://openminds.om-i.org/props/"}}
V = "https://openminds.om-i.org/props/"
T = "https://openminds.om-i.org/types/"

# ── argument parsing ──────────────────────────────────────────────────────────

if len(sys.argv) > 1:
    personal_token = sys.argv[1]
    if personal_token in ("null", "undefined") or not personal_token.strip():
        print(json.dumps(
            {"error": "Session expired. Please reload the page."}))
        sys.exit(1)
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

dsv_id = data.get("datasetVersionId", "")
if not dsv_id:
    print(json.dumps({"error": "datasetVersionId is missing from form data"}))
    sys.exit(1)

print(f"DEBUG dsv_id: {dsv_id}", file=sys.stderr)

# ── KG helpers ────────────────────────────────────────────────────────────────


def KG_patch(entry_id, attr):
    """Patch an existing KG instance."""
    try:
        payload = {**VOCAB, **attr}
        headers = {
            "accept":        "*/*",
            "Authorization": "Bearer " + personal_token,
            "Content-Type":  "application/json; charset=utf-8"
        }
        url = f'{KG_API}{entry_id.split("/")[-1]}?space=collab-d-{dsv_id}'
        resp = rq.patch(url=url, headers=headers,
                        data=json.dumps(payload, indent=4))
        print(f"DEBUG PATCH {url} → {resp.status_code}", file=sys.stderr)
        if not resp.ok:
            print(f"DEBUG body: {resp.text[:300]}", file=sys.stderr)
            return {"error": f"KG returned {resp.status_code}", "detail": resp.text}
        return {"patched": entry_id, "status": resp.status_code}
    except Exception as e:
        return {"error": str(e)}


def KG_post(instance_id, attr):
    """Create a new KG instance. If already exists (409) patch instead."""
    try:
        payload = {**VOCAB, **attr}
        headers = {
            "accept":        "*/*",
            "Authorization": "Bearer " + personal_token,
            "Content-Type":  "application/json; charset=utf-8"
        }
        url = f'{KG_API}{instance_id}?space=collab-d-{dsv_id}'
        resp = rq.post(url=url, headers=headers,
                       data=json.dumps(payload, indent=4))
        if resp.status_code == 409:
            resp = rq.patch(url=url, headers=headers,
                            data=json.dumps(payload, indent=4))
        print(f"DEBUG POST {url} → {resp.status_code}", file=sys.stderr)
        if not resp.ok:
            print(f"DEBUG body: {resp.text[:300]}", file=sys.stderr)
            return {"error": f"KG returned {resp.status_code}", "detail": resp.text}
        return {"created": instance_id, "status": resp.status_code}
    except Exception as e:
        return {"error": str(e)}

# ── helpers ───────────────────────────────────────────────────────────────────


def as_id_list(values):
    """
    Convert any input to a flat list of @id objects.
    Handles: string, list of strings, list of lists (from multi-select).
    """
    if not values:
        return []
    if isinstance(values, str):
        return [{"@id": values}] if values else []
    if isinstance(values, list):
        flat = []
        for v in values:
            if isinstance(v, list):
                flat.extend(v)
            elif isinstance(v, str) and v:
                flat.append(v)
        return [{"@id": v} for v in flat if v]
    return []


def as_single_or_list(values):
    """
    Return single @id object if one value, list if multiple.
    Matches KG behaviour seen in real DatasetVersion instances.
    """
    items = as_id_list(values)
    if not items:
        return None
    if len(items) == 1:
        return items[0]
    return items

# ── extract fields from form data ─────────────────────────────────────────────


dsv_title = data.get("dataset1", {}).get("dataTitle", "")
dsv_short_title = data.get("dataset1", {}).get("shortTitle", "")
brief_summary = data.get("dataset1", {}).get("briefSummary", "")
license_id = data.get("dataset1", {}).get("license", "")
embargo = data.get("dataset1", {}).get("embargo", False)
embargo_date = data.get("dataset1", {}).get("embargoDate") if embargo else None

data_type_list = data.get("dataset1", {}).get("optionsData", [])
if isinstance(data_type_list, str):
    data_type_list = [data_type_list]

# experimental approaches — selectedExpAppr can be a list from multi-select
expappr_values = []
for exp in data.get("experimental_approach", {}).get("addExperiment", []):
    val = exp.get("selectedExpAppr", [])
    if isinstance(val, list):
        expappr_values.extend(val)
    elif isinstance(val, str) and val:
        expappr_values.append(val)

# preparation types
prep_values = [
    p
    for entry in data.get("experimental_approach", {}).get("addPreparation", [])
    for p in (entry.get("selectedPrepType") or [])
    if p
]

# study targets — support both new studyTargetEntries and old flat list
study_target_values = []
for entry in data.get("experimental_approach", {}).get("studyTargetEntries", []):
    study_target_values.extend(entry.get("instances") or [])
if not study_target_values:
    study_target_values = data.get(
        "experimental_approach", {}).get("studyTargets", [])

print(f"DEBUG expappr_values:       {expappr_values}",       file=sys.stderr)
print(f"DEBUG prep_values:          {prep_values}",          file=sys.stderr)
print(f"DEBUG study_target_values:  {study_target_values}",  file=sys.stderr)

# ── build dataset version attributes ─────────────────────────────────────────
# property names are SHORT because @vocab resolves them automatically

dsv_attributes = {
    "@type": [f"{T}DatasetVersion"]
}

if dsv_title:
    dsv_attributes["fullName"] = dsv_title
if dsv_short_title:
    dsv_attributes["shortName"] = dsv_short_title
if brief_summary:
    dsv_attributes["description"] = brief_summary
if license_id:
    dsv_attributes["license"] = {"@id": license_id}
if embargo_date:
    dsv_attributes["releaseDate"] = embargo_date
if data_type_list:
    dsv_attributes["dataType"] = [{"@id": u} for u in data_type_list]

exp_appr = as_single_or_list(expappr_values)
if exp_appr:
    dsv_attributes["experimentalApproach"] = exp_appr

if prep_values:
    dsv_attributes["preparationDesign"] = as_id_list(prep_values)

if study_target_values:
    dsv_attributes["studyTarget"] = as_id_list(study_target_values)

print(
    f"DEBUG dsv_attributes:\n{json.dumps(dsv_attributes, indent=2)}", file=sys.stderr)

# ── 1. patch dataset version ──────────────────────────────────────────────────

results = []
dsv_result = KG_patch(dsv_id, dsv_attributes)
results.append({"datasetVersion": dsv_result})

# ── 2. create subjects and subject states ─────────────────────────────────────


def collect_all_subjects(data):
    """Extract all subjects from flat or grouped mode."""
    subject_metadata = data.get("subjectMetadata", {})
    if subject_metadata.get("subjects"):
        return subject_metadata["subjects"]
    if subject_metadata.get("subjectGroups"):
        all_subjects = []
        for group in subject_metadata["subjectGroups"]:
            all_subjects.extend(group.get("subjects", []))
        return all_subjects
    return []


def build_subject_instance(subject):
    """
    Build Subject and SubjectState nodes.
    Uses new om-i.org types and @vocab for short property names.
    """
    subject_uuid = str(uuid4())
    state_uuid = str(uuid4())
    subject_id_str = subject.get("subjectID", subject_uuid)

    # ── Subject node ──────────────────────────────────────────────────────────
    subject_node = {
        "@type":              [f"{T}Subject"],
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

    # ── SubjectState node ─────────────────────────────────────────────────────
    state_node = {
        "@type":              [f"{T}SubjectState"],
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
            "@type": f"{T}QuantitativeValue",
            "unit":  {"@id": KG_PREFIX + "4042a7c2-20ba-4e21-8cac-d0d2e25145f0"},
            "value": subject["age"]
        }
    if subject.get("weight"):
        state_node["weight"] = {
            "@type": f"{T}QuantitativeValue",
            "unit":  {"@id": KG_PREFIX + "6e5f9e60-a0d0-4e37-9501-2e8d79fce1e3"},
            "value": subject["weight"]
        }

    return (subject_uuid, subject_node), (state_uuid, state_node)


subjects = collect_all_subjects(data)
specimen_list = []

for subject in subjects:
    (subj_uuid, subj_node), (state_uuid,
                             state_node) = build_subject_instance(subject)

    # post state first — subject references it by @id
    state_result = KG_post(state_uuid, state_node)
    results.append({"subjectState": state_result})

    subj_result = KG_post(subj_uuid, subj_node)
    results.append({"subject": subj_result})

    specimen_list.append({"@id": KG_PREFIX + subj_uuid})

# ── 3. attach subjects to dataset version ─────────────────────────────────────

if specimen_list:
    attach_result = KG_patch(dsv_id, {"studiedSpecimen": specimen_list})
    results.append({"attachSpecimen": attach_result})

# ── done ──────────────────────────────────────────────────────────────────────

print(json.dumps({"results": results}))
