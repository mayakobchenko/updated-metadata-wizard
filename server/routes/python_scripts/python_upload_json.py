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

# ── helpers ───────────────────────────────────────────────────────────────────


def as_id_list(values):
    """Convert any input to a flat list of @id objects."""
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
    items = as_id_list(values)
    if not items:
        return None
    if len(items) == 1:
        return items[0]
    return items

# ── extract dataset1 fields ───────────────────────────────────────────────────


dsv_title = data.get("dataset1", {}).get("dataTitle",    "")
dsv_short_title = data.get("dataset1", {}).get("shortTitle",   "")
brief_summary = data.get("dataset1", {}).get("briefSummary", "")
license_id = data.get("dataset1", {}).get("license",      "")
embargo = data.get("dataset1", {}).get("embargo",      False)
embargo_date = data.get("dataset1", {}).get("embargoDate") if embargo else None

data_type_list = data.get("dataset1", {}).get("optionsData",  [])
if isinstance(data_type_list, str):
    data_type_list = [data_type_list]

# ── extract dataset2 fields ───────────────────────────────────────────────────

homepage = data.get("dataset2", {}).get("homePage", "")

support_channels = [
    chan.get("newChannel", "")
    for chan in data.get("dataset2", {}).get("supportChannels", [])
    if chan.get("newChannel", "").strip()
]

# ── FIXED: experiments are stored under "experiments" key ────────────────────
experiments = data.get("experiments", {})

experimental_approach = experiments.get("experimentalApproach", [])
techniques = experiments.get("techniques",            [])
preparation_types = experiments.get("preparationTypes",      [])
study_targets = experiments.get("studyTargets",          [])

print(f"DEBUG experimental_approach: {experimental_approach}", file=sys.stderr)
print(f"DEBUG techniques:            {techniques}",            file=sys.stderr)
print(f"DEBUG preparation_types:     {preparation_types}",     file=sys.stderr)
print(f"DEBUG study_targets:         {study_targets}",         file=sys.stderr)

# ── authors ───────────────────────────────────────────────────────────────────

authors = [
    exp.get("selectedAuthor", "")
    for exp in data.get("contribution", {}).get("authors", [])
    if exp.get("selectedAuthor", "").strip()
]

# ── FIXED: other contributors — build Contribution nodes with @type ───────────
# otherContribution in openMINDS is NOT a list of @id Person links
# it is a list of Contribution instances with contributor + contributionType


def build_contribution_nodes(data):
    """
    Build Contribution instances for other contributors.
    Each contributor entry has selectedOtherContr (Person @id)
    and contributionTypes (list of ContributionType @ids).
    Returns list of (uuid, contribution_node) tuples.
    """
    contributions = []
    othercontr_list = data.get("contribution", {}) \
                          .get("contributor", {}) \
                          .get("othercontr", [])

    for entry in othercontr_list:
        person_id = entry.get("selectedOtherContr", "").strip()
        if not person_id:
            continue
        contribution_types = entry.get("contributionTypes", [])

        contrib_uuid = str(uuid4())
        contrib_node = {
            "@type":             [f"{T}Contribution"],
            "contributor":       {"@id": person_id},
            "contributionType":  [{"@id": ct} for ct in contribution_types if ct],
        }
        contributions.append((contrib_uuid, contrib_node))

    return contributions


# ── accessibility ─────────────────────────────────────────────────────────────
# controlled term UUIDs from the KG
# ── accessibility ─────────────────────────────────────────────────────────────
# embargo is boolean — must be explicitly True to be embargoed
# use a controlled term UUID, never None or undefined

EMBARGO_ACCESS_ID = KG_PREFIX + "897dc2af-405d-4df3-9152-6d9e5cae55d8"
FREE_ACCESS_ID = KG_PREFIX + "b2ff7a47-b349-48d7-8ce4-cf51868675f1"

if embargo is True or embargo == "true":
    accessibility_id = EMBARGO_ACCESS_ID
else:
    accessibility_id = FREE_ACCESS_ID

print(f"DEBUG embargo raw value:   {repr(embargo)}",    file=sys.stderr)
print(f"DEBUG accessibility_id:    {accessibility_id}", file=sys.stderr)

print(f"DEBUG data_type_list:      {data_type_list}",      file=sys.stderr)
print(f"DEBUG authors:             {authors}",             file=sys.stderr)
# print(f"DEBUG embargo:             {embargo}",             file=sys.stderr)
# print(f"DEBUG accessibility_id:    {accessibility_id}",   file=sys.stderr)
print(f"DEBUG license_id:          {license_id}",         file=sys.stderr)

# ── build dataset version attributes ─────────────────────────────────────────

dsv_attributes = {
    "@type": [f"{T}DatasetVersion"]
}

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

# accessibility — always set
dsv_attributes["accessibility"] = {"@id": accessibility_id}

if embargo_date:
    dsv_attributes["releaseDate"] = embargo_date
if data_type_list:
    dsv_attributes["dataType"] = [{"@id": u} for u in data_type_list]
if authors:
    dsv_attributes["author"] = as_id_list(authors)

# experimental fields — now reading from correct "experiments" key
if experimental_approach:
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

# ── results collector ─────────────────────────────────────────────────────────

results = []

# ── 1. post Contribution instances first ─────────────────────────────────────
# they need to exist before we can reference them in DatasetVersion
contribution_nodes = build_contribution_nodes(data)
contribution_ids = []

for contrib_uuid, contrib_node in contribution_nodes:
    contrib_result = KG_post(contrib_uuid, contrib_node)
    results.append({"contribution": contrib_result})
    contribution_ids.append({"@id": KG_PREFIX + contrib_uuid})
    print(f"DEBUG posted Contribution {contrib_uuid}", file=sys.stderr)

# add contribution references to DatasetVersion
if contribution_ids:
    dsv_attributes["otherContribution"] = contribution_ids

# ── 2. patch dataset version ──────────────────────────────────────────────────

dsv_result = KG_patch(dsv_id, dsv_attributes)
results.append({"datasetVersion": dsv_result})

# ── 3. create subjects, subject states and subject groups ─────────────────────


def build_subject_group(group, subject_uuids, state_uuids, subjects):
    """
    Build a SubjectGroup node.
    References all subject states, collects unique species/strain/biosex.
    quantity = number of subjects in the group.
    """
    group_uuid = str(uuid4())
    group_name = group.get("name", group_uuid)

    # collect unique values across all subjects in the group
    all_species = list({s["species"] for s in subjects if s.get("species")})
    all_strains = list({s["strain"] for s in subjects if s.get("strain")})
    all_bio_sex = list({s["bioSex"] for s in subjects if s.get("bioSex")})

    group_node = {
        "@type":              [f"{T}SubjectGroup"],
        "lookupLabel":        group_name,
        "internalIdentifier": group_name,
        "quantity":           len(subjects),
        "studiedState":       [{"@id": KG_PREFIX + su} for su in state_uuids],
    }

    if all_species:
        group_node["species"] = [{"@id": s} for s in all_species]
    if all_strains:
        group_node["strain"] = [{"@id": s} for s in all_strains]
    if all_bio_sex:
        group_node["biologicalSex"] = [{"@id": s} for s in all_bio_sex]
    if group.get("additionalRemarks"):
        group_node["additionalRemarks"] = group["additionalRemarks"]

    return group_uuid, group_node


def build_subject_instance(subject, group_uuid=None):
    """
    Build Subject and SubjectState nodes.
    Upload strain only if present, otherwise species only.
    If group_uuid provided, links subject to group via isPartOf.
    """
    subject_uuid = str(uuid4())
    state_uuid = str(uuid4())
    subject_id_str = subject.get("subjectID", subject_uuid)

    subject_node = {
        "@type":              [f"{T}Subject"],
        "lookupLabel":        subject_id_str,
        "internalIdentifier": subject_id_str,
        "studiedState":       {"@id": KG_PREFIX + state_uuid},
    }

    if subject.get("bioSex"):
        subject_node["biologicalSex"] = {"@id": subject["bioSex"]}

    # upload strain only if present — strain implies species in KG
    # if no strain, upload species only
    if subject.get("strain"):
        subject_node["strain"] = {"@id": subject["strain"]}
    elif subject.get("species"):
        subject_node["species"] = [{"@id": subject["species"]}]

    # link subject to its group
    if group_uuid:
        subject_node["isPartOf"] = {"@id": KG_PREFIX + group_uuid}

    if subject.get("additionalRemarks"):
        subject_node["additionalRemarks"] = subject["additionalRemarks"]

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
    if subject.get("additionalRemarks"):
        state_node["additionalRemarks"] = subject["additionalRemarks"]
    if subject.get("age"):
        state_node["age"] = {
            "@type": f"{T}QuantitativeValue",
            "unit":  {"@id": subject.get("ageUnit") or
                      KG_PREFIX + "4042a7c2-20ba-4e21-8cac-d0d2e25145f0"},  # default: year
            "value": subject["age"]
        }

    if subject.get("weight"):
        state_node["weight"] = {
            "@type": f"{T}QuantitativeValue",
            "unit":  {"@id": subject.get("weightUnit") or
                      KG_PREFIX + "9cf99c79-fb70-4a4d-9806-c5fe1b5687a4"},  # default: gram
            "value": subject["weight"]
        }

    return (subject_uuid, subject_node), (state_uuid, state_node)


subject_metadata = data.get("subjectMetadata", {})

# specimen_list collects what goes into DatasetVersion.studiedSpecimen
# in grouped mode: SubjectGroup @ids + individual Subject @ids
# in flat mode:    individual Subject @ids only
specimen_list = []

if subject_metadata.get("subjectGroups"):
    # ── GROUPED MODE ──────────────────────────────────────────────────────────
    for group in subject_metadata["subjectGroups"]:
        subjects = group.get("subjects", [])

        # step 1 — generate group UUID first so subjects can reference it
        # via isPartOf before the group node is actually posted
        group_uuid_placeholder = str(uuid4())

        group_subj_uuids = []
        group_state_uuids = []

        # step 2 — post all SubjectStates and Subjects for this group
        for subject in subjects:
            (subj_uuid, subj_node), (state_uuid, state_node) = build_subject_instance(
                subject,
                group_uuid=group_uuid_placeholder  # link subject → group
            )

            # post state first — subject references it
            state_result = KG_post(state_uuid, state_node)
            results.append({"subjectState": state_result})

            subj_result = KG_post(subj_uuid, subj_node)
            results.append({"subject": subj_result})

            group_subj_uuids.append(subj_uuid)
            group_state_uuids.append(state_uuid)

            # add individual subject to specimen list too
            specimen_list.append({"@id": KG_PREFIX + subj_uuid})

        # step 3 — build and post SubjectGroup using the pre-generated UUID
        group_node = {
            "@type":              [f"{T}SubjectGroup"],
            "lookupLabel":        group.get("name", group_uuid_placeholder),
            "internalIdentifier": group.get("name", group_uuid_placeholder),
            "quantity":           len(subjects),
            "studiedState":       [{"@id": KG_PREFIX + su} for su in group_state_uuids],
        }

        # collect unique species/strain/biosex across all subjects
        all_species = list({s["species"]
                           for s in subjects if s.get("species")})
        all_strains = list({s["strain"] for s in subjects if s.get("strain")})
        all_bio_sex = list({s["bioSex"] for s in subjects if s.get("bioSex")})

        if all_species:
            group_node["species"] = [{"@id": s} for s in all_species]
        if all_strains:
            group_node["strain"] = [{"@id": s} for s in all_strains]
        if all_bio_sex:
            group_node["biologicalSex"] = [{"@id": s} for s in all_bio_sex]
        if group.get("additionalRemarks"):
            group_node["additionalRemarks"] = group["additionalRemarks"]

        # post group using the pre-generated UUID
        group_result = KG_post(group_uuid_placeholder, group_node)
        results.append({"subjectGroup": group_result})
        print(
            f"DEBUG posted SubjectGroup {group_uuid_placeholder} "
            f"'{group.get('name')}' with {len(subjects)} subjects",
            file=sys.stderr
        )

        # add SubjectGroup to specimen list as well
        specimen_list.append({"@id": KG_PREFIX + group_uuid_placeholder})

elif subject_metadata.get("subjects"):
    # ── FLAT MODE — no groups ─────────────────────────────────────────────────
    for subject in subject_metadata["subjects"]:
        (subj_uuid, subj_node), (state_uuid,
                                 state_node) = build_subject_instance(subject)

        state_result = KG_post(state_uuid, state_node)
        results.append({"subjectState": state_result})

        subj_result = KG_post(subj_uuid, subj_node)
        results.append({"subject": subj_result})

        specimen_list.append({"@id": KG_PREFIX + subj_uuid})

# ── 4. attach specimen to DatasetVersion ──────────────────────────────────────

if specimen_list:
    attach_result = KG_patch(dsv_id, {"studiedSpecimen": specimen_list})
    results.append({"attachSpecimen": attach_result})
    print(
        f"DEBUG attached {len(specimen_list)} specimen to DatasetVersion",
        file=sys.stderr
    )

# ── done ──────────────────────────────────────────────────────────────────────

print(json.dumps({"results": results}))
