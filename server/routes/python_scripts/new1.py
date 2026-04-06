# ── FIX 2: clear species when strain is present ───────────────────────────────
# KG_patch merges — it does NOT remove fields that already exist.
# We must explicitly set species to null/empty when uploading strain,
# otherwise old species values persist from previous uploads.

def build_subject_instance(subject, group_uuid=None):
    subject_uuid   = str(uuid4())
    state_uuid     = str(uuid4())
    subject_id_str = safe_trim(subject.get("subjectID", subject_uuid))

    subject_node = {
        "@type":              [f"{T}Subject"],
        "lookupLabel":        subject_id_str,
        "internalIdentifier": subject_id_str,
        "studiedState":       {"@id": KG_PREFIX + state_uuid},
    }

    if subject.get("bioSex"):
        subject_node["biologicalSex"] = {"@id": subject["bioSex"]}

    # ── strain-first rule — explicitly null out the other field so KG_patch
    #    does not leave stale values from previous uploads
    if subject.get("strain"):
        subject_node["strain"]  = {"@id": subject["strain"]}
        subject_node["species"] = None   # explicitly clear species
    elif subject.get("species"):
        subject_node["species"] = [{"@id": subject["species"]}]
        subject_node["strain"]  = None   # explicitly clear strain
    else:
        subject_node["species"] = None
        subject_node["strain"]  = None

    if group_uuid:
        subject_node["isPartOf"] = {"@id": KG_PREFIX + group_uuid}

    remarks = safe_trim(subject.get("additionalRemarks", ""))
    if remarks:
        subject_node["additionalRemarks"] = remarks

    state_node = {
        "@type":              [f"{T}SubjectState"],
        "lookupLabel":        subject_id_str + "_state",
        "internalIdentifier": subject_id_str + "_state",
    }
    if subject.get("ageCategory"):
        state_node["ageCategory"] = {"@id": subject["ageCategory"]}
    if subject.get("handedness"):
        state_node["handedness"]  = {"@id": subject["handedness"]}

    pathology_ids = []
    for d in (subject.get("disease") or []):
        if d: pathology_ids.append({"@id": d})
    for d in (subject.get("diseaseModel") or []):
        if d: pathology_ids.append({"@id": d})
    if pathology_ids:
        state_node["pathology"] = pathology_ids
    else:
        state_node["pathology"] = None   # clear stale pathology too

    if subject.get("subjectAttribute"):
        state_node["attribute"] = as_id_list(subject["subjectAttribute"])
    else:
        state_node["attribute"] = None

    if remarks:
        state_node["additionalRemarks"] = remarks

    if subject.get("age"):
        state_node["age"] = {
            "@type": f"{T}QuantitativeValue",
            "unit":  {"@id": subject.get("ageUnit") or KG_PREFIX + "4042a7c2-20ba-4e21-8cac-d0d2e25145f0"},
            "value": subject["age"]
        }
    else:
        state_node["age"] = None

    if subject.get("weight"):
        state_node["weight"] = {
            "@type": f"{T}QuantitativeValue",
            "unit":  {"@id": subject.get("weightUnit") or KG_PREFIX + "9cf99c79-fb70-4a4d-9806-c5fe1b5687a4"},
            "value": subject["weight"]
        }
    else:
        state_node["weight"] = None

    return (subject_uuid, subject_node), (state_uuid, state_node)


# ── apply the same explicit-null pattern to tissue samples ────────────────────

def build_tissue_sample_instance(sample, collection_uuid=None):
    sample_uuid   = str(uuid4())
    state_uuid    = str(uuid4())
    sample_id_str = safe_trim(sample.get("sampleID", sample_uuid))

    sample_node = {
        "@type":              [f"{T}TissueSample"],
        "lookupLabel":        sample_id_str,
        "internalIdentifier": sample_id_str,
        "studiedState":       {"@id": KG_PREFIX + state_uuid},
    }

    if sample.get("type"):
        sample_node["type"] = {"@id": sample["type"]}

    # strain-first with explicit null clearing
    if sample.get("strain"):
        sample_node["strain"]  = {"@id": sample["strain"]}
        sample_node["species"] = None
    elif sample.get("species"):
        sample_node["species"] = [{"@id": sample["species"]}]
        sample_node["strain"]  = None
    else:
        sample_node["species"] = None
        sample_node["strain"]  = None

    if sample.get("biologicalSex"):
        sample_node["biologicalSex"] = {"@id": sample["biologicalSex"]}
    if sample.get("laterality"):
        sample_node["laterality"]    = {"@id": sample["laterality"]}
    if sample.get("origin"):
        sample_node["origin"]        = {"@id": sample["origin"]}
    if collection_uuid:
        sample_node["isPartOf"]      = {"@id": KG_PREFIX + collection_uuid}

    linked_subj_id = sample.get("linkedSubjectId")
    if linked_subj_id and linked_subj_id in sample_id_to_kg_uuid:
        sample_node["wasDerivedFrom"] = {"@id": sample_id_to_kg_uuid[linked_subj_id]}

    remarks = safe_trim(sample.get("additionalRemarks", ""))
    if remarks:
        sample_node["additionalRemarks"] = remarks

    state_node = {
        "@type":              [f"{T}TissueSampleState"],
        "lookupLabel":        sample_id_str + "_state",
        "internalIdentifier": sample_id_str + "_state",
    }

    pathology_ids = [{"@id": p} for p in (sample.get("pathology") or []) if p]
    state_node["pathology"] = pathology_ids if pathology_ids else None

    if sample.get("tissueSampleAttribute"):
        state_node["attribute"] = as_id_list(sample["tissueSampleAttribute"])
    else:
        state_node["attribute"] = None

    if remarks:
        state_node["additionalRemarks"] = remarks

    if sample.get("age"):
        state_node["age"] = {
            "@type": f"{T}QuantitativeValue",
            "unit":  {"@id": sample.get("ageUnit") or KG_PREFIX + "4042a7c2-20ba-4e21-8cac-d0d2e25145f0"},
            "value": sample["age"]
        }
    else:
        state_node["age"] = None

    if sample.get("weight"):
        state_node["weight"] = {
            "@type": f"{T}QuantitativeValue",
            "unit":  {"@id": sample.get("weightUnit") or KG_PREFIX + "9cf99c79-fb70-4a4d-9806-c5fe1b5687a4"},
            "value": sample["weight"]
        }
    else:
        state_node["weight"] = None

    return (sample_uuid, sample_node), (state_uuid, state_node)