import os
import sys
import json
import requests as rq
from uuid import uuid4

# ── constants ─────────────────────────────────────────────────────────────────

KG_API = 'https://core.kg.ebrains.eu/v3/instances/'
KG_PREFIX = 'https://kg.ebrains.eu/api/instances/'
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

# ── load persons list ─────────────────────────────────────────────────────────

_script_dir = os.path.dirname(os.path.abspath(__file__))
_server_dir = os.path.dirname(os.path.dirname(_script_dir))
_persons_path = os.path.join(_server_dir, 'data', 'persons', 'persons.json')

try:
    with open(_persons_path, 'r', encoding='utf-8') as _f:
        _persons_list = json.load(_f)
    print(f"DEBUG loaded {len(_persons_list)} persons", file=sys.stderr)
except Exception as e:
    _persons_list = []
    print(f"DEBUG could not load persons.json: {e}", file=sys.stderr)

# ── KG helpers ────────────────────────────────────────────────────────────────


def KG_patch(entry_id, attr):
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

# ── string helpers ────────────────────────────────────────────────────────────


def safe_trim(v):
    if isinstance(v, str):
        return v.strip()
    return v


def as_id_list(values):
    if not values:
        return []
    if isinstance(values, str):
        return [{"@id": values}] if values.strip() else []
    if isinstance(values, list):
        flat = []
        for v in values:
            if isinstance(v, list):
                flat.extend(v)
            elif isinstance(v, str) and v.strip():
                flat.append(v.strip())
        return [{"@id": v} for v in flat if v]
    return []


def as_single_or_list(values):
    items = as_id_list(values)
    if not items:
        return None
    return items[0] if len(items) == 1 else items

# ── person lookup ─────────────────────────────────────────────────────────────


def find_person_uuid(first_name, family_name, orcid=None):
    """
    Look up a person in persons.json.
    Search priority:
      1. If orcid is supplied → match by orcid (case-insensitive)
      2. Fallback → match by givenName + familyName (case-insensitive, trimmed)
    Returns the uuid string if found, None otherwise.
    """
    first_name = safe_trim(first_name or '').lower()
    family_name = safe_trim(family_name or '').lower()
    orcid = safe_trim(orcid or '').lower()

    # pass 1 — orcid match (most reliable)
    if orcid:
        for p in _persons_list:
            if safe_trim(p.get('orcid', '')).lower() == orcid:
                print(
                    f"DEBUG person found by ORCID: {p.get('givenName')} {p.get('familyName')} → {p['uuid']}",
                    file=sys.stderr
                )
                return p['uuid']
        print(
            f"DEBUG ORCID '{orcid}' not found in persons.json, trying name", file=sys.stderr)

    # pass 2 — name match
    if first_name or family_name:
        for p in _persons_list:
            p_given = safe_trim(p.get('givenName',  '')).lower()
            p_family = safe_trim(p.get('familyName', '')).lower()
            if p_given == first_name and p_family == family_name:
                print(
                    f"DEBUG person found by name: {p.get('givenName')} {p.get('familyName')} → {p['uuid']}",
                    file=sys.stderr
                )
                return p['uuid']

    print(
        f"DEBUG person NOT found: '{first_name}' '{family_name}' orcid='{orcid}'",
        file=sys.stderr
    )
    return None

# ── extract dataset1 fields ───────────────────────────────────────────────────


dsv_title = safe_trim(data.get("dataset1", {}).get("dataTitle",    ""))
dsv_short_title = safe_trim(data.get("dataset1", {}).get("shortTitle",   ""))
brief_summary = safe_trim(data.get("dataset1", {}).get("briefSummary", ""))
license_id = safe_trim(data.get("dataset1", {}).get("license",      ""))
embargo = data.get("dataset1", {}).get("embargo", False)
embargo_date = data.get("dataset1", {}).get("embargoDate") if embargo else None
homepage = safe_trim(data.get("dataset2", {}).get("homePage", ""))

data_type_list = data.get("dataset1", {}).get("optionsData", [])
if isinstance(data_type_list, str):
    data_type_list = [data_type_list]

support_channels = [
    safe_trim(chan.get("newChannel", ""))
    for chan in data.get("dataset2", {}).get("supportChannels", [])
    if chan.get("newChannel", "").strip()
]

experiments = data.get("experiments", {})
experimental_approach = experiments.get("experimentalApproach", [])
techniques = experiments.get("techniques",            [])
preparation_types = experiments.get("preparationTypes",      [])
study_targets = experiments.get("studyTargets",          [])

authors = [
    safe_trim(exp.get("selectedAuthor", ""))
    for exp in data.get("contribution", {}).get("authors", [])
    if exp.get("selectedAuthor", "").strip()
]

# ── resolve custodian from persons.json ───────────────────────────────────────

custodian_data = data.get("custodian", {})
custodian_uuid = find_person_uuid(
    first_name=custodian_data.get("firstName",   ""),
    family_name=custodian_data.get("familyName",  ""),
    orcid=custodian_data.get("orcid",       ""),
)

if custodian_uuid:
    print(f"DEBUG custodian resolved → {custodian_uuid}", file=sys.stderr)
else:
    print(f"DEBUG custodian NOT resolved — will be skipped", file=sys.stderr)

# ── accessibility ─────────────────────────────────────────────────────────────

EMBARGO_ACCESS_ID = KG_PREFIX + "897dc2af-405d-4df3-9152-6d9e5cae55d8"

# ── build dataset version attributes ─────────────────────────────────────────

dsv_attributes = {"@type": [f"{T}DatasetVersion"]}

if dsv_title:
    dsv_attributes["fullName"] = dsv_title
if dsv_short_title:
    dsv_attributes["shortName"] = dsv_short_title
if brief_summary:
    dsv_attributes["description"] = brief_summary
if homepage:
    dsv_attributes["homepage"] = homepage
if support_channels:
    dsv_attributes["supportChannel"] = support_channels
if license_id:
    dsv_attributes["license"] = {"@id": license_id}

if embargo is True or embargo == "true":
    dsv_attributes["accessibility"] = {"@id": EMBARGO_ACCESS_ID}
    if embargo_date:
        dsv_attributes["releaseDate"] = embargo_date

if data_type_list:
    dsv_attributes["dataType"] = [{"@id": u} for u in data_type_list]
if authors:
    dsv_attributes["author"] = as_id_list(authors)

# custodian on DatasetVersion
if custodian_uuid:
    dsv_attributes["custodian"] = {"@id": custodian_uuid}

exp_appr = as_single_or_list(experimental_approach)
if exp_appr:
    dsv_attributes["experimentalApproach"] = exp_appr
if techniques:
    dsv_attributes["technique"] = as_id_list(techniques)
if preparation_types:
    dsv_attributes["preparationDesign"] = as_id_list(preparation_types)
if study_targets:
    dsv_attributes["studyTarget"] = as_id_list(study_targets)

print(
    f"DEBUG dsv_attributes:\n{json.dumps(dsv_attributes, indent=2)}", file=sys.stderr)

results = []

# ── 1. contributions ──────────────────────────────────────────────────────────


def build_contribution_nodes(data):
    contributions = []
    for entry in data.get("contribution", {}).get("contributor", {}).get("othercontr", []):
        person_id = safe_trim(entry.get("selectedOtherContr", ""))
        if not person_id:
            continue
        contrib_uuid = str(uuid4())
        contrib_node = {
            "@type":            [f"{T}Contribution"],
            "contributor":      {"@id": person_id},
            "contributionType": [{"@id": ct} for ct in entry.get("contributionTypes", []) if ct],
        }
        contributions.append((contrib_uuid, contrib_node))
    return contributions


contribution_nodes = build_contribution_nodes(data)
contribution_ids = []
for contrib_uuid, contrib_node in contribution_nodes:
    contrib_result = KG_post(contrib_uuid, contrib_node)
    results.append({"contribution": contrib_result})
    contribution_ids.append({"@id": KG_PREFIX + contrib_uuid})

if contribution_ids:
    dsv_attributes["otherContribution"] = contribution_ids

# ── 2. patch dataset version ──────────────────────────────────────────────────

dsv_result = KG_patch(dsv_id, dsv_attributes)
results.append({"datasetVersion": dsv_result})

# ── 3. subjects and subject groups ────────────────────────────────────────────


def check_subject_exists(lookup_label):
    try:
        headers = {"accept": "*/*",
                   "Authorization": "Bearer " + personal_token}
        url = (
            f"https://core.kg.ebrains.eu/v3/instances"
            f"?stage=IN_PROGRESS"
            f"&space=collab-d-{dsv_id}"
            f"&type=https://openminds.om-i.org/types/Subject"
            f"&size=100"
        )
        resp = rq.get(url=url, headers=headers)
        if not resp.ok:
            return None
        items = resp.json().get("data", [])
        vocab_label = "https://openminds.om-i.org/props/lookupLabel"
        for item in items:
            if item.get(vocab_label) == lookup_label:
                print(
                    f"DEBUG found existing Subject '{lookup_label}' → {item['@id']}", file=sys.stderr)
                return item["@id"]
        return None
    except Exception as e:
        print(f"DEBUG check_subject_exists error: {e}", file=sys.stderr)
        return None


def build_subject_instance(subject, group_uuid=None):
    subject_uuid = str(uuid4())
    state_uuid = str(uuid4())
    subject_id_str = safe_trim(subject.get("subjectID", subject_uuid))

    subject_node = {
        "@type":              [f"{T}Subject"],
        "lookupLabel":        subject_id_str,
        "internalIdentifier": subject_id_str,
        "studiedState":       {"@id": KG_PREFIX + state_uuid},
    }

    if subject.get("bioSex"):
        subject_node["biologicalSex"] = {"@id": subject["bioSex"]}

    # ── FIX: if strain present → upload strain only (strain implies species in KG)
    #         if no strain     → upload species only
    if subject.get("strain"):
        subject_node["strain"] = {"@id": subject["strain"]}
    elif subject.get("species"):
        subject_node["species"] = [{"@id": subject["species"]}]

    if group_uuid:
        subject_node["isPartOf"] = {"@id": KG_PREFIX + group_uuid}

    remarks = safe_trim(subject.get("additionalRemarks", ""))
    if remarks:
        subject_node["additionalRemarks"] = remarks

    # ── SubjectState ──────────────────────────────────────────────────────────
    state_node = {
        "@type":              [f"{T}SubjectState"],
        "lookupLabel":        subject_id_str + "_state",
        "internalIdentifier": subject_id_str + "_state",
    }

    if subject.get("ageCategory"):
        state_node["ageCategory"] = {"@id": subject["ageCategory"]}
    if subject.get("handedness"):
        state_node["handedness"] = {"@id": subject["handedness"]}

    pathology_ids = []
    for d in (subject.get("disease") or []):
        if d:
            pathology_ids.append({"@id": d})
    for d in (subject.get("diseaseModel") or []):
        if d:
            pathology_ids.append({"@id": d})
    if pathology_ids:
        state_node["pathology"] = pathology_ids

    if subject.get("subjectAttribute"):
        state_node["attribute"] = as_id_list(subject["subjectAttribute"])

    if remarks:
        state_node["additionalRemarks"] = remarks

    if subject.get("age"):
        state_node["age"] = {
            "@type": f"{T}QuantitativeValue",
            "unit":  {"@id": subject.get("ageUnit") or KG_PREFIX + "4042a7c2-20ba-4e21-8cac-d0d2e25145f0"},
            "value": subject["age"]
        }
    if subject.get("weight"):
        state_node["weight"] = {
            "@type": f"{T}QuantitativeValue",
            "unit":  {"@id": subject.get("weightUnit") or KG_PREFIX + "9cf99c79-fb70-4a4d-9806-c5fe1b5687a4"},
            "value": subject["weight"]
        }

    return (subject_uuid, subject_node), (state_uuid, state_node)


def post_or_patch_subject(subject_uuid, subject_node, subject_id_str):
    existing_id = check_subject_exists(subject_id_str)
    if existing_id:
        existing_uuid = existing_id.split("/")[-1]
        result = KG_patch(existing_uuid, subject_node)
        print(
            f"DEBUG updated existing Subject '{subject_id_str}'", file=sys.stderr)
        return existing_uuid, result
    else:
        result = KG_post(subject_uuid, subject_node)
        return subject_uuid, result


subject_metadata = data.get("subjectMetadata", {})
specimen_list = []
sample_id_to_kg_uuid = {}  # frontend id → KG UUID, used for tissue → subject linking

if subject_metadata.get("subjectGroups"):
    for group in subject_metadata["subjectGroups"]:
        subjects = group.get("subjects", [])
        group_uuid_placeholder = str(uuid4())
        group_subj_uuids = []
        group_state_uuids = []

        for subject in subjects:
            (subj_uuid, subj_node), (state_uuid, state_node) = build_subject_instance(
                subject, group_uuid=group_uuid_placeholder
            )
            subject_id_str = safe_trim(subject.get("subjectID", subj_uuid))

            state_result = KG_post(state_uuid, state_node)
            results.append({"subjectState": state_result})

            final_uuid, subj_result = post_or_patch_subject(
                subj_uuid, subj_node, subject_id_str)
            results.append({"subject": subj_result})

            group_subj_uuids.append(final_uuid)
            group_state_uuids.append(state_uuid)
            specimen_list.append({"@id": KG_PREFIX + final_uuid})
            sample_id_to_kg_uuid[subject.get("id")] = KG_PREFIX + final_uuid

        # aggregate unique values across all subjects in this group
        all_species = list({s["species"]
                           for s in subjects if s.get("species")})
        all_strains = list({s["strain"] for s in subjects if s.get("strain")})
        all_bio_sex = list({s["bioSex"] for s in subjects if s.get("bioSex")})

        group_node = {
            "@type":              [f"{T}SubjectGroup"],
            "lookupLabel":        safe_trim(group.get("name", group_uuid_placeholder)),
            "internalIdentifier": safe_trim(group.get("name", group_uuid_placeholder)),
            "quantity":           len(subjects),
            "studiedState":       [{"@id": KG_PREFIX + su} for su in group_state_uuids],
        }

        # ── same rule for group: strain only if present, else species ─────────
        if all_strains:
            group_node["strain"] = [{"@id": s} for s in all_strains]
        elif all_species:
            group_node["species"] = [{"@id": s} for s in all_species]

        if all_bio_sex:
            group_node["biologicalSex"] = [{"@id": s} for s in all_bio_sex]

        remarks = safe_trim(group.get("additionalRemarks", ""))
        if remarks:
            group_node["additionalRemarks"] = remarks

        group_result = KG_post(group_uuid_placeholder, group_node)
        results.append({"subjectGroup": group_result})
        specimen_list.append({"@id": KG_PREFIX + group_uuid_placeholder})
        print(
            f"DEBUG posted SubjectGroup {group_uuid_placeholder} "
            f"'{group.get('name')}' with {len(subjects)} subjects",
            file=sys.stderr
        )

elif subject_metadata.get("subjects"):
    for subject in subject_metadata["subjects"]:
        (subj_uuid, subj_node), (state_uuid,
                                 state_node) = build_subject_instance(subject)
        subject_id_str = safe_trim(subject.get("subjectID", subj_uuid))

        state_result = KG_post(state_uuid, state_node)
        results.append({"subjectState": state_result})

        final_uuid, subj_result = post_or_patch_subject(
            subj_uuid, subj_node, subject_id_str)
        results.append({"subject": subj_result})
        specimen_list.append({"@id": KG_PREFIX + final_uuid})
        sample_id_to_kg_uuid[subject.get("id")] = KG_PREFIX + final_uuid

# ── 4. tissue samples ─────────────────────────────────────────────────────────


def build_tissue_sample_instance(sample, collection_uuid=None):
    sample_uuid = str(uuid4())
    state_uuid = str(uuid4())
    sample_id_str = safe_trim(sample.get("sampleID", sample_uuid))

    sample_node = {
        "@type":              [f"{T}TissueSample"],
        "lookupLabel":        sample_id_str,
        "internalIdentifier": sample_id_str,
        "studiedState":       {"@id": KG_PREFIX + state_uuid},
    }

    if sample.get("type"):
        sample_node["type"] = {"@id": sample["type"]}

    # ── same strain-first rule for tissue samples ─────────────────────────────
    if sample.get("strain"):
        sample_node["strain"] = {"@id": sample["strain"]}
    elif sample.get("species"):
        sample_node["species"] = [{"@id": sample["species"]}]

    if sample.get("biologicalSex"):
        sample_node["biologicalSex"] = {"@id": sample["biologicalSex"]}
    if sample.get("laterality"):
        sample_node["laterality"] = {"@id": sample["laterality"]}
    if sample.get("origin"):
        sample_node["origin"] = {"@id": sample["origin"]}
    if collection_uuid:
        sample_node["isPartOf"] = {"@id": KG_PREFIX + collection_uuid}

    # link to subject if set (wasDerivedFrom)
    linked_subj_id = sample.get("linkedSubjectId")
    if linked_subj_id and linked_subj_id in sample_id_to_kg_uuid:
        sample_node["wasDerivedFrom"] = {
            "@id": sample_id_to_kg_uuid[linked_subj_id]}

    remarks = safe_trim(sample.get("additionalRemarks", ""))
    if remarks:
        sample_node["additionalRemarks"] = remarks

    # ── TissueSampleState ─────────────────────────────────────────────────────
    state_node = {
        "@type":              [f"{T}TissueSampleState"],
        "lookupLabel":        sample_id_str + "_state",
        "internalIdentifier": sample_id_str + "_state",
    }

    pathology_ids = [{"@id": p} for p in (sample.get("pathology") or []) if p]
    if pathology_ids:
        state_node["pathology"] = pathology_ids

    if sample.get("tissueSampleAttribute"):
        state_node["attribute"] = as_id_list(sample["tissueSampleAttribute"])

    if remarks:
        state_node["additionalRemarks"] = remarks

    if sample.get("age"):
        state_node["age"] = {
            "@type": f"{T}QuantitativeValue",
            "unit":  {"@id": sample.get("ageUnit") or KG_PREFIX + "4042a7c2-20ba-4e21-8cac-d0d2e25145f0"},
            "value": sample["age"]
        }
    if sample.get("weight"):
        state_node["weight"] = {
            "@type": f"{T}QuantitativeValue",
            "unit":  {"@id": sample.get("weightUnit") or KG_PREFIX + "9cf99c79-fb70-4a4d-9806-c5fe1b5687a4"},
            "value": sample["weight"]
        }

    return (sample_uuid, sample_node), (state_uuid, state_node)


# ── flat tissue samples ───────────────────────────────────────────────────────

for sample in subject_metadata.get("tissueSamples", []):
    (s_uuid, s_node), (st_uuid, st_node) = build_tissue_sample_instance(sample)
    results.append({"tissueSampleState": KG_post(st_uuid, st_node)})
    results.append({"tissueSample":      KG_post(s_uuid,  s_node)})
    specimen_list.append({"@id": KG_PREFIX + s_uuid})

# ── tissue sample collections ─────────────────────────────────────────────────

for collection in subject_metadata.get("tissueCollections", []):
    collection_uuid = str(uuid4())
    coll_id_str = safe_trim(collection.get("collectionID", collection_uuid))

    collection_state_uuids = []
    collection_bio_sex = []
    collection_species = []
    collection_strains = []
    collection_types = []
    collection_lateralities = []
    collection_origins = []

    for sample in collection.get("samples", []):
        (s_uuid, s_node), (st_uuid, st_node) = build_tissue_sample_instance(
            sample, collection_uuid=collection_uuid
        )
        results.append({"tissueSampleState": KG_post(st_uuid, st_node)})
        results.append({"tissueSample":      KG_post(s_uuid,  s_node)})
        collection_state_uuids.append(st_uuid)
        specimen_list.append({"@id": KG_PREFIX + s_uuid})

        if sample.get("biologicalSex"):
            collection_bio_sex.append(sample["biologicalSex"])
        if sample.get("species"):
            collection_species.append(sample["species"])
        if sample.get("strain"):
            collection_strains.append(sample["strain"])
        if sample.get("type"):
            collection_types.append(sample["type"])
        if sample.get("laterality"):
            collection_lateralities.append(sample["laterality"])
        if sample.get("origin"):
            collection_origins.append(sample["origin"])

    collection_node = {
        "@type":              [f"{T}TissueSampleCollection"],
        "lookupLabel":        coll_id_str,
        "internalIdentifier": coll_id_str,
        "quantity":           len(collection.get("samples", [])),
        "studiedState":       [{"@id": KG_PREFIX + su} for su in collection_state_uuids],
    }

    # ── strain-first rule for collections too ─────────────────────────────────
    unique_strains = list(set(collection_strains))
    unique_species = list(set(collection_species))
    if unique_strains:
        collection_node["strain"] = [{"@id": s} for s in unique_strains]
    elif unique_species:
        collection_node["species"] = [{"@id": s} for s in unique_species]

    unique_sex = list(set(collection_bio_sex))
    unique_types = list(set(collection_types))
    unique_lateralities = list(set(collection_lateralities))
    unique_origins = list(set(collection_origins))

    if unique_sex:
        collection_node["biologicalSex"] = [{"@id": s} for s in unique_sex]
    if unique_types:
        collection_node["type"] = [{"@id": t} for t in unique_types]
    if unique_lateralities:
        collection_node["laterality"] = [{"@id": l}
                                         for l in unique_lateralities]
    if unique_origins:
        collection_node["origin"] = [{"@id": o} for o in unique_origins]

    coll_remarks = safe_trim(collection.get("additionalRemarks", ""))
    if coll_remarks:
        collection_node["additionalRemarks"] = coll_remarks

    coll_result = KG_post(collection_uuid, collection_node)
    results.append({"tissueSampleCollection": coll_result})
    specimen_list.append({"@id": KG_PREFIX + collection_uuid})
    print(
        f"DEBUG posted TissueSampleCollection {collection_uuid} "
        f"'{coll_id_str}' with {len(collection.get('samples', []))} samples",
        file=sys.stderr
    )

# ── 5. attach all specimen to DatasetVersion ──────────────────────────────────

if specimen_list:
    attach_result = KG_patch(dsv_id, {"studiedSpecimen": specimen_list})
    results.append({"attachSpecimen": attach_result})
    print(
        f"DEBUG attached {len(specimen_list)} specimen to DatasetVersion", file=sys.stderr)

# ── done ──────────────────────────────────────────────────────────────────────

print(json.dumps({"results": results}))
