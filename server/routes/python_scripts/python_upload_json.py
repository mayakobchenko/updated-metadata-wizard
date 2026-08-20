import os
import sys
import json
import time
import requests as rq
from uuid import uuid4

# ── constants ─────────────────────────────────────────────────────────────────

KG_API = 'https://core.kg.ebrains.eu/v3/instances/'
KG_PREFIX = 'https://kg.ebrains.eu/api/instances/'
VOCAB = {"@context": {"@vocab": "https://openminds.om-i.org/props/"}}
V = "https://openminds.om-i.org/props/"
T = "https://openminds.om-i.org/types/"

# ── existence-check reliability ──────────────────────────────────────────────
# These calls decide "does this already exist, or should I create it?" — a
# transient network failure here must NEVER be treated the same as "confirmed
# it doesn't exist", because that leads directly to duplicates (this is
# exactly what happened during a DNS outage: every failed existence check
# silently fell through to creating a brand new SubjectGroup/
# TissueSampleCollection, even when one already existed).
#
# KGLookupError is raised when an existence check could not be completed
# after retries. Callers MUST treat this as "unknown" and skip creating
# anything for that item, reporting an error instead — never fall back to
# "assume not found".


class KGLookupError(Exception):
    pass


def kg_get_with_retry(url, headers, max_retries=3, timeout_seconds=15):
    """
    GET with retries for transient network errors (DNS failures, connection
    resets, timeouts). Raises KGLookupError if every attempt fails, or if the
    server returns a non-2xx response after retries — either way, the caller
    could not get a definitive answer and must not guess.
    """
    last_error = None
    for attempt in range(1, max_retries + 1):
        try:
            resp = rq.get(url=url, headers=headers, timeout=timeout_seconds)
            if resp.ok:
                return resp
            last_error = f"HTTP {resp.status_code}: {resp.text[:200]}"
        except (rq.exceptions.ConnectionError, rq.exceptions.Timeout) as e:
            last_error = str(e)

        if attempt < max_retries:
            backoff = 2 * attempt  # 2s, 4s, 6s...
            print(
                f"DEBUG KG GET attempt {attempt}/{max_retries} failed ({last_error}) — retrying in {backoff}s",
                file=sys.stderr)
            time.sleep(backoff)

    raise KGLookupError(
        f"KG GET failed after {max_retries} attempts: {last_error} (url: {url})")

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
_routes_dir = os.path.dirname(_script_dir)
_server_dir = os.path.dirname(_routes_dir)
_persons_path = os.path.join(
    _server_dir, 'data', 'kg-instances', 'Person.json')

try:
    with open(_persons_path, 'r', encoding='utf-8') as _f:
        _persons_list = json.load(_f)
    print(f"DEBUG loaded {len(_persons_list)} persons", file=sys.stderr)
except Exception as e:
    _persons_list = []
    print(f"DEBUG could not load Person.json: {e}", file=sys.stderr)

# ── load ORCID list ───────────────────────────────────────────────────────────

_orcid_path = os.path.join(_server_dir, 'data', 'kg-instances', 'ORCID.json')

try:
    with open(_orcid_path, 'r', encoding='utf-8') as _f:
        _orcid_list = json.load(_f)
    print(f"DEBUG loaded {len(_orcid_list)} ORCID entries", file=sys.stderr)
except Exception as e:
    _orcid_list = []
    print(f"DEBUG could not load ORCID.json: {e}", file=sys.stderr)

# ── KG helpers ────────────────────────────────────────────────────────────────


def KG_patch(entry_id, attr):
    try:
        payload = {**VOCAB, **attr}
        headers = {
            "accept":        "*/*",
            "Authorization": "Bearer " + personal_token,
            "Content-Type":  "application/json; charset=utf-8"
        }
        instance_uuid = entry_id.split("/")[-1]
        url = f'{KG_API}{instance_uuid}?space=collab-d-{dsv_id}'
        resp = rq.patch(url=url, headers=headers,
                        data=json.dumps(payload, indent=4))
        print(f"DEBUG PATCH {url} → {resp.status_code}", file=sys.stderr)

        if resp.status_code == 404:
            print(f"DEBUG PATCH 404 — instance not found, trying POST",
                  file=sys.stderr)
            resp = rq.post(url=url, headers=headers,
                           data=json.dumps(payload, indent=4))
            print(
                f"DEBUG POST (fallback) {url} → {resp.status_code}", file=sys.stderr)

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


def nonempty(v):
    s = safe_trim(v or "")
    return s if s else None


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

# ── species/strain helpers ────────────────────────────────────────────────────


def apply_strain_species(node, strain_val, species_val):
    strain = nonempty(strain_val)
    species = nonempty(species_val)
    print(f"DEBUG strain={strain!r} species={species!r}", file=sys.stderr)
    if strain:
        node["species"] = {"@id": strain}
        print(
            f"DEBUG → writing strain into species field: {strain}", file=sys.stderr)
    elif species:
        node["species"] = [{"@id": species}]
        print(f"DEBUG → writing species: {species}", file=sys.stderr)
    else:
        print(f"DEBUG → neither strain nor species present", file=sys.stderr)


def apply_strain_species_group(node, subjects_or_samples):
    ids_for_species_field = set()
    for s in subjects_or_samples:
        strain = nonempty(s.get("strain",  ""))
        species = nonempty(s.get("species", ""))
        if strain:
            ids_for_species_field.add(strain)
        elif species:
            ids_for_species_field.add(species)
    node["species"] = [{"@id": i} for i in ids_for_species_field]
    print(
        f"DEBUG group/collection species field: {list(ids_for_species_field)}", file=sys.stderr)

# ── ORCID helpers ─────────────────────────────────────────────────────────────


def normalize_orcid(orcid_val):
    orc = nonempty(orcid_val)
    if not orc:
        return None
    if orc.startswith("https://orcid.org/"):
        return orc
    if orc.startswith("http://orcid.org/"):
        return orc.replace("http://", "https://")
    return f"https://orcid.org/{orc}"


"""
def create_orcid_instance(orcid_url):
    orc = normalize_orcid(orcid_url)
    if not orc:
        return None

    # check ORCID.json first
    for entry in _orcid_list:
        if nonempty(entry.get('identifier', '')) == orc:
            print(
                f"DEBUG found existing ORCID in common space: {entry['uuid']}", file=sys.stderr)
            return entry['uuid']

    # create in common space
    orcid_uuid = str(uuid4())
    orcid_node = {"@type": [f"{T}ORCID"], "identifier": orc}
    print(
        f"DEBUG creating ORCID instance in common space for {orc}", file=sys.stderr)
    try:
        payload = {**VOCAB, **orcid_node}
        headers = {
            "accept":        "*/*",
            "Authorization": "Bearer " + personal_token,
            "Content-Type":  "application/json; charset=utf-8"
        }
        url = f'{KG_API}{orcid_uuid}?space=common'
        resp = rq.post(url=url, headers=headers,
                       data=json.dumps(payload, indent=4))
        print(
            f"DEBUG POST ORCID to common space {url} → {resp.status_code}", file=sys.stderr)
        if not resp.ok:
            print(
                f"DEBUG FAILED to create ORCID: {resp.text[:200]}", file=sys.stderr)
            return None
        orcid_kg_url = KG_PREFIX + orcid_uuid
        print(f"DEBUG new ORCID instance → {orcid_kg_url}", file=sys.stderr)
        return orcid_kg_url
    except Exception as e:
        print(f"DEBUG error creating ORCID: {e}", file=sys.stderr)
        return None
"""


def find_orcid_in_collab(orc):
    """
    Search the collab space for an existing ORCID instance matching `orc`.
    Returns the @id if found, None if the search completed and genuinely
    found nothing. Raises KGLookupError if the search could not be
    completed — callers must not treat that the same as "not found".
    """
    headers = {"accept": "*/*", "Authorization": "Bearer " + personal_token}
    from_offset = 0
    page_size = 100
    vocab_ident = f"{V}identifier"
    while True:
        url = (
            f"https://core.kg.ebrains.eu/v3/instances"
            f"?stage=IN_PROGRESS"
            f"&space=collab-d-{dsv_id}"
            f"&type=https://openminds.om-i.org/types/ORCID"
            f"&size={page_size}&from={from_offset}"
        )
        # raises KGLookupError on failure
        resp = kg_get_with_retry(url, headers)
        items = resp.json().get("data", [])
        for item in items:
            item_orc = item.get(vocab_ident, "")
            if isinstance(item_orc, str) and item_orc.lower() == orc.lower():
                print(
                    f"DEBUG found existing ORCID in collab space: {item['@id']}", file=sys.stderr)
                return item["@id"]
        if len(items) < page_size:
            return None  # genuinely confirmed: paged through everything, not found
        from_offset += page_size


def create_orcid_instance(orcid_url):
    """
    Find or create an ORCID instance and return its KG URL.
    Search order:
      1. ORCID.json (common space, already fetched)
      2. collab space (IN_PROGRESS) — check before creating to avoid duplicates
      3. Create new in collab space

    If step 2 can't be completed (KGLookupError), this returns None rather
    than falling through to step 3 — creating an ORCID record without being
    sure one doesn't already exist risks a duplicate identifier node. The
    caller (create_person) already handles a None return gracefully: the
    Person just gets created without an ORCID link this run, which is a far
    smaller problem than a duplicate.
    """
    orc = normalize_orcid(orcid_url)
    if not orc:
        return None

    # ── 1. check ORCID.json (common space) ───────────────────────────────────
    for entry in _orcid_list:
        if nonempty(entry.get('identifier', '')) == orc:
            print(
                f"DEBUG found existing ORCID in common space: {entry['uuid']}", file=sys.stderr)
            return entry['uuid']

    # ── 2. check collab space to avoid duplicates on re-submission ───────────
    try:
        existing = find_orcid_in_collab(orc)
        if existing:
            return existing
    except KGLookupError as e:
        print(
            f"DEBUG could not confirm whether ORCID '{orc}' already exists in collab space — "
            f"NOT creating, to avoid a duplicate: {e}", file=sys.stderr)
        return None

    # ── 3. not found anywhere — create in collab space ────────────────────────
    orcid_uuid = str(uuid4())
    orcid_node = {"@type": [f"{T}ORCID"], "identifier": orc}

    print(
        f"DEBUG creating ORCID instance in collab space for {orc}", file=sys.stderr)
    try:
        payload = {**VOCAB, **orcid_node}
        headers = {
            "accept":        "*/*",
            "Authorization": "Bearer " + personal_token,
            "Content-Type":  "application/json; charset=utf-8"
        }
        # ── POST to collab space──────────────────────────────────
        url = f'{KG_API}{orcid_uuid}?space=collab-d-{dsv_id}'
        resp = rq.post(url=url, headers=headers,
                       data=json.dumps(payload, indent=4))
        print(
            f"DEBUG POST ORCID to collab space → {resp.status_code}", file=sys.stderr)

        if not resp.ok:
            print(
                f"DEBUG FAILED to create ORCID in collab space: {resp.text[:200]}", file=sys.stderr)
            return None

        orcid_kg_url = KG_PREFIX + orcid_uuid
        print(
            f"DEBUG new ORCID instance in collab space → {orcid_kg_url}", file=sys.stderr)
        return orcid_kg_url

    except Exception as e:
        print(f"DEBUG error creating ORCID instance: {e}", file=sys.stderr)
        return None

# ── person helpers ────────────────────────────────────────────────────────────


def find_person_uuid(first_name, family_name, orcid=None):
    fn = nonempty(first_name) or ""
    fam = nonempty(family_name) or ""
    orc = normalize_orcid(orcid)

    if orc:
        for p in _persons_list:
            p_orc = normalize_orcid(p.get('orcid', '')) or ""
            if p_orc.lower() == orc.lower():
                print(
                    f"DEBUG person found by ORCID: {p.get('givenName')} {p.get('familyName')} → {p['uuid']}", file=sys.stderr)
                return p['uuid']
        print(f"DEBUG ORCID '{orc}' not found, trying name", file=sys.stderr)

    if fn or fam:
        for p in _persons_list:
            p_given = nonempty(p.get('givenName',  '')) or ""
            p_family = nonempty(p.get('familyName', '')) or ""
            if p_given.lower() == fn.lower() and p_family.lower() == fam.lower():
                print(
                    f"DEBUG person found by name: {p.get('givenName')} {p.get('familyName')} → {p['uuid']}", file=sys.stderr)
                return p['uuid']

    print(
        f"DEBUG person NOT found: '{fn}' '{fam}' orcid='{orc}'", file=sys.stderr)
    return None


def create_person(first_name, family_name, orcid=None):
    person_uuid = str(uuid4())
    person_node = {
        "@type":      [f"{T}Person"],
        "givenName":  safe_trim(first_name or ""),
        "familyName": safe_trim(family_name or ""),
    }
    orc = normalize_orcid(orcid)
    if orc:
        orcid_instance_url = create_orcid_instance(orc)
        if orcid_instance_url:
            person_node["digitalIdentifier"] = [{"@id": orcid_instance_url}]
            print(
                f"DEBUG linking ORCID instance {orcid_instance_url} to new Person", file=sys.stderr)
        else:
            print(
                f"DEBUG could not create ORCID — Person created without ORCID", file=sys.stderr)

    print(
        f"DEBUG creating new Person: {first_name} {family_name}", file=sys.stderr)
    result = KG_post(person_uuid, person_node)
    if isinstance(result, dict) and "error" in result:
        print(
            f"DEBUG FAILED to create Person: {first_name} {family_name} → {result}", file=sys.stderr)
        return None
    person_url = KG_PREFIX + person_uuid
    print(f"DEBUG new Person → {person_url}", file=sys.stderr)
    return person_url


def check_person_exists_in_collab(first_name, family_name, orcid=None):
    headers = {"accept": "*/*", "Authorization": "Bearer " + personal_token}
    from_offset = 0
    page_size = 100
    while True:
        url = (
            f"https://core.kg.ebrains.eu/v3/instances"
            f"?stage=IN_PROGRESS&space=collab-d-{dsv_id}"
            f"&type=https://openminds.om-i.org/types/Person"
            f"&size={page_size}&from={from_offset}"
        )
        # raises KGLookupError on failure
        resp = kg_get_with_retry(url, headers)
        items = resp.json().get("data", [])
        orc = normalize_orcid(orcid)
        for item in items:
            if orc:
                item_ids = item.get(f"{V}digitalIdentifier", [])
                if isinstance(item_ids, dict):
                    item_ids = [item_ids]
                for ident in item_ids:
                    if isinstance(ident, dict) and ident.get("@id", "").lower() == orc.lower():
                        print(
                            f"DEBUG found existing Person in collab by ORCID: {item['@id']}", file=sys.stderr)
                        return item["@id"]
            item_given = item.get(f"{V}givenName",  "") or ""
            item_family = item.get(f"{V}familyName", "") or ""
            fn = nonempty(first_name) or ""
            fam = nonempty(family_name) or ""
            if fn and fam and item_given.lower() == fn.lower() and item_family.lower() == fam.lower():
                print(
                    f"DEBUG found existing Person in collab by name: {item['@id']}", file=sys.stderr)
                return item["@id"]
        if len(items) < page_size:
            return None  # genuinely confirmed: paged through everything, not found
        from_offset += page_size


def ensure_person_has_orcid(person_url, orcid_url):
    orc = normalize_orcid(orcid_url)
    if not orc:
        return
    try:
        person_uuid = person_url.split('/')[-1]
        headers = {"accept": "*/*",
                   "Authorization": "Bearer " + personal_token}
        resp = rq.get(
            f"https://core.kg.ebrains.eu/v3/instances/{person_uuid}?stage=IN_PROGRESS", headers=headers)
        if not resp.ok:
            return
        person_data = resp.json().get("data", {})
        existing_orcid_ids = person_data.get(f"{V}digitalIdentifier", [])
        if isinstance(existing_orcid_ids, dict):
            existing_orcid_ids = [existing_orcid_ids]
        if existing_orcid_ids:
            print(
                f"DEBUG Person {person_uuid} already has digitalIdentifier — skipping ORCID update", file=sys.stderr)
            return
        print(
            f"DEBUG Person {person_uuid} has no ORCID — creating and linking {orc}", file=sys.stderr)
        orcid_instance_url = create_orcid_instance(orc)
        if not orcid_instance_url:
            return
        patch_payload = {**VOCAB, "@type": [f"{T}Person"],
                         "digitalIdentifier": [{"@id": orcid_instance_url}]}
        patch_resp = rq.patch(
            f"{KG_API}{person_uuid}?space=collab-d-{dsv_id}",
            headers={**headers, "Content-Type": "application/json; charset=utf-8"},
            data=json.dumps(patch_payload, indent=4)
        )
        print(
            f"DEBUG PATCH Person ORCID → {patch_resp.status_code}", file=sys.stderr)
    except Exception as e:
        print(f"DEBUG ensure_person_has_orcid error: {e}", file=sys.stderr)


def resolve_person(first_name, family_name, orcid=None, create_if_missing=True):
    """
    Raises KGLookupError if the collab-space existence check could not be
    completed — callers MUST catch this and skip, not treat it as "not
    found", since falling through to create_person() here would create a
    duplicate Person if one already existed but just couldn't be confirmed.
    """
    url = find_person_uuid(first_name, family_name, orcid)
    if url:
        return url
    collab_url = check_person_exists_in_collab(first_name, family_name, orcid)
    if collab_url:
        print(
            f"DEBUG person found in collab space: {collab_url}", file=sys.stderr)
        if nonempty(orcid):
            ensure_person_has_orcid(collab_url, orcid)
        return collab_url
    if create_if_missing and (nonempty(first_name) or nonempty(family_name)):
        return create_person(first_name, family_name, orcid)
    return None

# ── extract dataset fields ────────────────────────────────────────────────────


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
    if nonempty(chan.get("newChannel", ""))
]

experiments = data.get("experiments", {})
experimental_approach = experiments.get("experimentalApproach", [])
techniques = experiments.get("techniques",        [])
preparation_types = experiments.get("preparationTypes",  [])
study_targets = experiments.get("studyTargets",      [])

# Declared here (rather than right before its first heavy use further down)
# because author/custodian resolution below can now append error entries to
# it directly when a KG lookup can't be confirmed.
results = []

# ── resolve authors ───────────────────────────────────────────────────────────

author_ids = []
for entry in data.get("contribution", {}).get("authors", []):
    selected = nonempty(entry.get("selectedAuthor", ""))
    if selected:
        author_ids.append(selected)
    elif entry.get("isCustom"):
        try:
            person_url = resolve_person(
                entry.get("firstName", ""),
                entry.get("lastName",  ""),
                normalize_orcid(entry.get("orcid", "")),
                create_if_missing=True
            )
        except KGLookupError as e:
            author_name = f"{entry.get('firstName', '')} {entry.get('lastName', '')}".strip(
            )
            print(
                f"DEBUG could not resolve author '{author_name}' due to a KG connectivity "
                f"issue — skipped to avoid creating a duplicate Person: {e}", file=sys.stderr)
            results.append({"author": {
                "error": f"Could not verify author '{author_name}' due to a KG connectivity "
                         f"issue — skipped to avoid a duplicate. Please retry the submission.",
                "skipped": True,
            }})
            continue
        if person_url and isinstance(person_url, str) and person_url.startswith("http"):
            author_ids.append(person_url)
            print(f"DEBUG custom author → {person_url}", file=sys.stderr)

# ── resolve custodian ─────────────────────────────────────────────────────────

custodian_data = data.get("custodian", {})
try:
    custodian_url = resolve_person(
        first_name=custodian_data.get("firstName",  ""),
        family_name=custodian_data.get("familyName", ""),
        orcid=normalize_orcid(custodian_data.get("orcid", "")),
        create_if_missing=True
    )
except KGLookupError as e:
    print(
        f"DEBUG could not resolve custodian due to a KG connectivity issue — "
        f"skipped to avoid creating a duplicate Person: {e}", file=sys.stderr)
    results.append({"custodian": {
        "error": "Could not verify the custodian due to a KG connectivity issue — "
                 "skipped to avoid a duplicate. Please retry the submission.",
        "skipped": True,
    }})
    custodian_url = None

if custodian_url:
    print(f"DEBUG custodian → {custodian_url}", file=sys.stderr)
else:
    print(f"DEBUG custodian NOT resolved", file=sys.stderr)

# ── accessibility ─────────────────────────────────────────────────────────────

EMBARGO_ACCESS_ID = KG_PREFIX + "897dc2af-405d-4df3-9152-6d9e5cae55d8"

# ── build DatasetVersion attributes ──────────────────────────────────────────

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

valid_authors = [a for a in author_ids if isinstance(
    a, str) and a.startswith("http")]
if valid_authors:
    dsv_attributes["author"] = [{"@id": a} for a in valid_authors]

if custodian_url and isinstance(custodian_url, str) and custodian_url.startswith("http"):
    dsv_attributes["custodian"] = {"@id": custodian_url}

if experimental_approach:
    dsv_attributes["experimentalApproach"] = as_id_list(experimental_approach)
if techniques:
    dsv_attributes["technique"] = as_id_list(techniques)
if preparation_types:
    dsv_attributes["preparationDesign"] = as_id_list(preparation_types)
if study_targets:
    dsv_attributes["studyTarget"] = as_id_list(study_targets)

print(
    f"DEBUG dsv_attributes:\n{json.dumps(dsv_attributes, indent=2)}", file=sys.stderr)

# ── 1. contributions ──────────────────────────────────────────────────────────


def build_contribution_nodes(data):
    contributions = []
    for entry in data.get("contribution", {}).get("contributor", {}).get("othercontr", []):
        person_url = nonempty(entry.get("selectedOtherContr", ""))
        if not person_url and entry.get("isCustom"):
            try:
                person_url = resolve_person(
                    entry.get("firstName", ""),
                    entry.get("lastName",  ""),
                    normalize_orcid(entry.get("orcid", "")),
                    create_if_missing=True
                )
            except KGLookupError as e:
                contributor_name = f"{entry.get('firstName', '')} {entry.get('lastName', '')}".strip(
                )
                print(
                    f"DEBUG could not resolve contributor '{contributor_name}' due to a KG "
                    f"connectivity issue — skipped to avoid creating a duplicate Person: {e}", file=sys.stderr)
                results.append({"contribution": {
                    "error": f"Could not verify contributor '{contributor_name}' due to a KG "
                             f"connectivity issue — skipped to avoid a duplicate. Please retry.",
                    "skipped": True,
                }})
                continue
        if not person_url or not isinstance(person_url, str) or not person_url.startswith("http"):
            print(f"DEBUG skipping contribution — no valid person URL",
                  file=sys.stderr)
            continue
        contribution_types = entry.get(
            "selectedTypeContr") or entry.get("contributionTypes") or []
        contrib_uuid = str(uuid4())
        contrib_node = {
            "@type":            [f"{T}Contribution"],
            "contributor":      {"@id": person_url},
            "contributionType": [{"@id": ct} for ct in contribution_types if ct],
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

# ── 2. patch DatasetVersion ───────────────────────────────────────────────────

dsv_result = KG_patch(dsv_id, dsv_attributes)
results.append({"datasetVersion": dsv_result})

# ── 2b. find or create parent Dataset and update it ──────────────────────────


def find_dataset_via_neighbors(dsv_uuid):
    """
    Fetch neighbors of the DatasetVersion and find the parent Dataset
    in the inbound list (Dataset points to DSV via hasVersion).
    Returns the Dataset UUID string, or None if genuinely not found. Raises
    KGLookupError if the lookup could not be completed — the caller must
    not treat that as "not found", since creating a new Dataset in that
    case risks a duplicate parent record for this DatasetVersion.
    """
    headers = {"accept": "*/*", "Authorization": "Bearer " + personal_token}
    url = f"https://core.kg.ebrains.eu/v3/instances/{dsv_uuid}/neighbors?stage=IN_PROGRESS"
    resp = kg_get_with_retry(url, headers)  # raises KGLookupError on failure
    print(f"DEBUG neighbors {url} → {resp.status_code}", file=sys.stderr)

    neighbors = resp.json().get("data", {})
    inbound = neighbors.get("inbound", []) or []

    dataset_type = "https://openminds.om-i.org/types/Dataset"
    for item in inbound:
        if dataset_type in (item.get("types") or []):
            dataset_uuid = item["id"]
            print(
                f"DEBUG found parent Dataset via neighbors: {dataset_uuid}", file=sys.stderr)
            return dataset_uuid

    print(f"DEBUG no parent Dataset found in neighbors inbound", file=sys.stderr)
    return None


def create_dataset(dsv_uuid, dataset_attributes):
    """
    Create a new Dataset instance in the collab space and link it to the DSV.
    """
    dataset_uuid = str(uuid4())
    dataset_node = {
        "@type":      [f"{T}Dataset"],
        "hasVersion": [{"@id": KG_PREFIX + dsv_uuid}],
        **dataset_attributes,
    }
    print(f"DEBUG creating new Dataset {dataset_uuid}", file=sys.stderr)
    result = KG_post(dataset_uuid, dataset_node)
    if isinstance(result, dict) and "error" in result:
        print(f"DEBUG FAILED to create Dataset: {result}", file=sys.stderr)
        return None
    print(f"DEBUG new Dataset → {KG_PREFIX + dataset_uuid}", file=sys.stderr)
    return dataset_uuid


def patch_dataset(dataset_uuid, dataset_attributes):
    """
    Patch an existing Dataset with updated metadata.
    Always ensures hasVersion references the current DSV.
    """
    dataset_node = {
        "@type":      [f"{T}Dataset"],
        "hasVersion": [{"@id": KG_PREFIX + dsv_id}],
        **dataset_attributes,
    }
    result = KG_patch(dataset_uuid, dataset_node)
    print(f"DEBUG patched Dataset {dataset_uuid} → {result}", file=sys.stderr)
    return result


# ── build Dataset attributes from form data ───────────────────────────────────
# Dataset shares title, authors and custodian with DatasetVersion
# but does NOT have description, license, embargo etc. — those live on DSV.

dataset_attributes = {}

if dsv_title:
    dataset_attributes["fullName"] = dsv_title
if dsv_short_title:
    dataset_attributes["shortName"] = dsv_short_title
# change later for the data descriptor
"""   
if brief_summary:
    dataset_attributes["description"] = brief_summary
"""
# authors — same list resolved above for DSV
if valid_authors:
    dataset_attributes["author"] = [{"@id": a} for a in valid_authors]

# custodian
if custodian_url and isinstance(custodian_url, str) and custodian_url.startswith("http"):
    dataset_attributes["custodian"] = {"@id": custodian_url}

# ── find existing Dataset or create new one ───────────────────────────────────

try:
    dataset_uuid = find_dataset_via_neighbors(dsv_id)
except KGLookupError as e:
    print(
        f"DEBUG could not confirm whether a parent Dataset already exists for this "
        f"DatasetVersion — NOT creating one, to avoid a duplicate: {e}", file=sys.stderr)
    results.append({"dataset": {
        "error": "Could not verify whether a parent Dataset already exists, due to a KG "
                 "connectivity issue — skipped to avoid creating a duplicate. Please retry.",
        "skipped": True,
    }})
    dataset_uuid = None
else:
    if dataset_uuid:
        print(
            f"DEBUG updating existing Dataset {dataset_uuid}", file=sys.stderr)
        dataset_result = patch_dataset(dataset_uuid, dataset_attributes)
        results.append({"dataset": dataset_result})
    else:
        print(f"DEBUG no existing Dataset found — creating new one", file=sys.stderr)
        dataset_uuid = create_dataset(dsv_id, dataset_attributes)
        if dataset_uuid:
            results.append({"dataset": {"created": dataset_uuid}})
        else:
            results.append({"dataset": {"error": "failed to create Dataset"}})

# ── 3. subject helpers ────────────────────────────────────────────────────────


def find_instance_by_label(lookup_label, type_name):
    """
    Page through instances of `type_name` in this collab space looking for
    one whose lookupLabel matches. Returns the @id if found, None if the
    search completed and genuinely found nothing. Raises KGLookupError if the
    search could not be completed (network failure, KG error) — this is a
    DIFFERENT outcome from "not found" and callers must not conflate them.
    """
    headers = {"accept": "*/*", "Authorization": "Bearer " + personal_token}
    from_offset = 0
    page_size = 100
    vocab_label = "https://openminds.om-i.org/props/lookupLabel"
    while True:
        url = (
            f"https://core.kg.ebrains.eu/v3/instances"
            f"?stage=IN_PROGRESS&space=collab-d-{dsv_id}"
            f"&type=https://openminds.om-i.org/types/{type_name}"
            f"&size={page_size}&from={from_offset}"
        )
        # raises KGLookupError on failure
        resp = kg_get_with_retry(url, headers)
        items = resp.json().get("data", [])
        for item in items:
            if item.get(vocab_label) == lookup_label:
                print(
                    f"DEBUG found existing {type_name} '{lookup_label}' → {item['@id']}", file=sys.stderr)
                return item["@id"]
        if len(items) < page_size:
            return None  # genuinely confirmed: paged through everything, not found
        from_offset += page_size


def check_subject_exists(lookup_label):
    return find_instance_by_label(lookup_label, "Subject")


def check_state_exists(lookup_label, state_type):
    return find_instance_by_label(lookup_label, state_type)


def post_or_patch_by_label(local_uuid, node, lookup_label, type_name):
    """
    Generic check-then-create-or-update: looks for an existing instance of
    `type_name` with a matching lookupLabel; patches it if found, creates a
    new one (with `local_uuid`) if genuinely not found.

    Returns (final_uuid, result_dict). final_uuid is None if the existence
    check could not be confirmed (KGLookupError) — the caller MUST treat
    that as "skip this item", never fall back to creating one anyway, since
    that's exactly how duplicates happened during the DNS outage.
    """
    try:
        existing_id = find_instance_by_label(lookup_label, type_name)
    except KGLookupError as e:
        print(
            f"DEBUG could not confirm whether {type_name} '{lookup_label}' already exists — "
            f"NOT creating, to avoid a duplicate: {e}", file=sys.stderr)
        return None, {
            "error": f"Could not verify {type_name} '{lookup_label}' due to a KG connectivity "
                     f"issue — skipped to avoid creating a duplicate. Please retry the submission.",
            "skipped": True,
        }
    if existing_id:
        existing_uuid = existing_id.split("/")[-1]
        result = KG_patch(existing_uuid, node)
        print(
            f"DEBUG updated existing {type_name} '{lookup_label}'", file=sys.stderr)
        return existing_uuid, result
    result = KG_post(local_uuid, node)
    return local_uuid, result


def post_or_patch_subject(subject_uuid, subject_node, subject_id_str):
    return post_or_patch_by_label(subject_uuid, subject_node, subject_id_str, "Subject")


def post_or_patch_state(state_uuid, state_node, lookup_label, state_type):
    return post_or_patch_by_label(state_uuid, state_node, lookup_label, state_type)


def post_or_patch_tissue_sample(sample_uuid, sample_node, sample_id_str):
    return post_or_patch_by_label(sample_uuid, sample_node, sample_id_str, "TissueSample")


def post_or_patch_subject_group(group_uuid, group_node, lookup_label):
    return post_or_patch_by_label(group_uuid, group_node, lookup_label, "SubjectGroup")


def post_or_patch_tissue_sample_collection(collection_uuid, collection_node, lookup_label):
    return post_or_patch_by_label(collection_uuid, collection_node, lookup_label, "TissueSampleCollection")


def build_subject_instance(subject, group_uuid=None):
    subject_uuid = str(uuid4())
    state_uuid = str(uuid4())
    subject_id_str = safe_trim(subject.get("subjectID", subject_uuid))

    subject_node = {
        "@type":              [f"{T}Subject"],
        "lookupLabel":        subject_id_str,
        "internalIdentifier": subject_id_str,
        # placeholder — updated after state resolution
        "studiedState":       {"@id": KG_PREFIX + state_uuid},
    }

    if subject.get("bioSex"):
        subject_node["biologicalSex"] = {"@id": subject["bioSex"]}

    apply_strain_species(subject_node, subject.get(
        "strain", ""), subject.get("species", ""))

    if group_uuid:
        subject_node["isPartOf"] = {"@id": KG_PREFIX + group_uuid}

    remarks = nonempty(subject.get("additionalRemarks", ""))
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
        state_node["handedness"] = {"@id": subject["handedness"]}

    pathology_ids = []
    for d in (subject.get("disease") or []):
        if d:
            pathology_ids.append({"@id": d})
    for d in (subject.get("diseaseModel") or []):
        if d:
            pathology_ids.append({"@id": d})
    state_node["pathology"] = pathology_ids
    state_node["attribute"] = as_id_list(subject.get("subjectAttribute") or [])
    if remarks:
        state_node["additionalRemarks"] = remarks

    if nonempty(subject.get("age", "")):
        state_node["age"] = {
            "@type": f"{T}QuantitativeValue",
            "unit":  {"@id": subject.get("ageUnit") or KG_PREFIX + "4042a7c2-20ba-4e21-8cac-d0d2e25145f0"},
            "value": subject["age"]
        }
    if nonempty(subject.get("weight", "")):
        state_node["weight"] = {
            "@type": f"{T}QuantitativeValue",
            "unit":  {"@id": subject.get("weightUnit") or KG_PREFIX + "9cf99c79-fb70-4a4d-9806-c5fe1b5687a4"},
            "value": subject["weight"]
        }

    return (subject_uuid, subject_node), (state_uuid, state_node)

# ── 4. process subjects ───────────────────────────────────────────────────────


subject_metadata = data.get("subjectMetadata", {})
specimen_list = []
sample_id_to_kg_uuid = {}

if subject_metadata.get("subjectGroups"):
    for group in subject_metadata["subjectGroups"]:
        subjects = group.get("subjects", [])
        group_uuid_placeholder = str(uuid4())
        group_state_uuids = []

        for subject in subjects:
            (subj_uuid, subj_node), (state_uuid, state_node) = build_subject_instance(
                subject, group_uuid=group_uuid_placeholder
            )
            subject_id_str = safe_trim(subject.get("subjectID", subj_uuid))
            state_label = subject_id_str + "_state"

            # ── resolve state (reuse existing or create new) ──────────────────
            final_state_uuid, state_result = post_or_patch_state(
                state_uuid, state_node, state_label, "SubjectState"
            )
            results.append({"subjectState": state_result})

            if final_state_uuid is None:
                # couldn't confirm whether the state exists — already reported
                # in state_result; skip this subject rather than risk creating
                # it without a valid state link or duplicating it later
                continue

            # ── update subject node to reference correct state UUID ───────────
            subj_node["studiedState"] = {"@id": KG_PREFIX + final_state_uuid}

            final_uuid, subj_result = post_or_patch_subject(
                subj_uuid, subj_node, subject_id_str)
            results.append({"subject": subj_result})

            if final_uuid is None:
                # couldn't confirm whether the subject exists — already reported
                continue

            group_state_uuids.append(final_state_uuid)   # ← correct UUID
            specimen_list.append({"@id": KG_PREFIX + final_uuid})
            sample_id_to_kg_uuid[subject.get("id")] = KG_PREFIX + final_uuid

        all_bio_sex = list({s["bioSex"] for s in subjects if s.get("bioSex")})

        group_node = {
            "@type":              [f"{T}SubjectGroup"],
            "lookupLabel":        safe_trim(group.get("name", group_uuid_placeholder)),
            "internalIdentifier": safe_trim(group.get("name", group_uuid_placeholder)),
            "quantity":           len(subjects),
            "studiedState":       [{"@id": KG_PREFIX + su} for su in group_state_uuids],
        }
        apply_strain_species_group(group_node, subjects)
        if all_bio_sex:
            group_node["biologicalSex"] = [{"@id": s} for s in all_bio_sex]
        remarks = nonempty(group.get("additionalRemarks", ""))
        if remarks:
            group_node["additionalRemarks"] = remarks

        group_label = safe_trim(group.get("name", group_uuid_placeholder))
        final_group_uuid, group_result = post_or_patch_subject_group(
            group_uuid_placeholder, group_node, group_label)
        results.append({"subjectGroup": group_result})

        if final_group_uuid is None:
            # couldn't confirm — already reported in group_result; don't
            # attach an unconfirmed/non-existent group to the DatasetVersion
            continue

        specimen_list.append({"@id": KG_PREFIX + final_group_uuid})
        print(
            f"DEBUG posted SubjectGroup '{group.get('name')}' with {len(subjects)} subjects", file=sys.stderr)

elif subject_metadata.get("subjects"):
    for subject in subject_metadata["subjects"]:
        (subj_uuid, subj_node), (state_uuid,
                                 state_node) = build_subject_instance(subject)
        subject_id_str = safe_trim(subject.get("subjectID", subj_uuid))
        state_label = subject_id_str + "_state"

        # ── resolve state (reuse existing or create new) ──────────────────────
        final_state_uuid, state_result = post_or_patch_state(
            state_uuid, state_node, state_label, "SubjectState"
        )
        results.append({"subjectState": state_result})

        if final_state_uuid is None:
            continue  # couldn't confirm — already reported in state_result

        # ── update subject node to reference correct state UUID ───────────────
        subj_node["studiedState"] = {"@id": KG_PREFIX + final_state_uuid}

        final_uuid, subj_result = post_or_patch_subject(
            subj_uuid, subj_node, subject_id_str)
        results.append({"subject": subj_result})

        if final_uuid is None:
            continue  # couldn't confirm — already reported in subj_result

        specimen_list.append({"@id": KG_PREFIX + final_uuid})
        sample_id_to_kg_uuid[subject.get("id")] = KG_PREFIX + final_uuid

# ── 5. tissue samples ─────────────────────────────────────────────────────────


def build_tissue_sample_instance(sample, collection_uuid=None):
    sample_uuid = str(uuid4())
    state_uuid = str(uuid4())
    sample_id_str = safe_trim(sample.get("sampleID", sample_uuid))

    sample_node = {
        "@type":              [f"{T}TissueSample"],
        "lookupLabel":        sample_id_str,
        "internalIdentifier": sample_id_str,
        "studiedState":       {"@id": KG_PREFIX + state_uuid},  # placeholder
    }

    if sample.get("type"):
        sample_node["type"] = {"@id": sample["type"]}
    if sample.get("biologicalSex"):
        sample_node["biologicalSex"] = {"@id": sample["biologicalSex"]}
    if sample.get("laterality"):
        sample_node["laterality"] = {"@id": sample["laterality"]}
    if sample.get("origin"):
        sample_node["origin"] = {"@id": sample["origin"]}
    if collection_uuid:
        sample_node["isPartOf"] = {"@id": KG_PREFIX + collection_uuid}

    apply_strain_species(sample_node, sample.get(
        "strain", ""), sample.get("species", ""))

    linked_subj_id = sample.get("linkedSubjectId")
    if linked_subj_id and linked_subj_id in sample_id_to_kg_uuid:
        sample_node["wasDerivedFrom"] = {
            "@id": sample_id_to_kg_uuid[linked_subj_id]}

    remarks = nonempty(sample.get("additionalRemarks", ""))
    if remarks:
        sample_node["additionalRemarks"] = remarks

    state_node = {
        "@type":              [f"{T}TissueSampleState"],
        "lookupLabel":        sample_id_str + "_state",
        "internalIdentifier": sample_id_str + "_state",
        "pathology":          [{"@id": p} for p in (sample.get("pathology") or []) if p],
        "attribute":          as_id_list(sample.get("tissueSampleAttribute") or []),
    }
    if remarks:
        state_node["additionalRemarks"] = remarks

    if nonempty(sample.get("age", "")):
        state_node["age"] = {
            "@type": f"{T}QuantitativeValue",
            "unit":  {"@id": sample.get("ageUnit") or KG_PREFIX + "4042a7c2-20ba-4e21-8cac-d0d2e25145f0"},
            "value": sample["age"]
        }
    if nonempty(sample.get("weight", "")):
        state_node["weight"] = {
            "@type": f"{T}QuantitativeValue",
            "unit":  {"@id": sample.get("weightUnit") or KG_PREFIX + "9cf99c79-fb70-4a4d-9806-c5fe1b5687a4"},
            "value": sample["weight"]
        }

    return (sample_uuid, sample_node), (state_uuid, state_node)

# ── flat tissue samples ───────────────────────────────────────────────────────


for sample in subject_metadata.get("tissueSamples", []):
    (s_uuid, s_node), (st_uuid, st_node) = build_tissue_sample_instance(sample)
    sample_id_str = safe_trim(sample.get("sampleID", s_uuid))
    state_label = sample_id_str + "_state"

    final_st_uuid, st_result = post_or_patch_state(
        st_uuid, st_node, state_label, "TissueSampleState")
    results.append({"tissueSampleState": st_result})

    if final_st_uuid is None:
        continue  # couldn't confirm — already reported in st_result

    s_node["studiedState"] = {"@id": KG_PREFIX + final_st_uuid}

    final_s_uuid, s_result = post_or_patch_tissue_sample(
        s_uuid, s_node, sample_id_str)
    results.append({"tissueSample": s_result})

    if final_s_uuid is None:
        continue  # couldn't confirm — already reported in s_result

    specimen_list.append({"@id": KG_PREFIX + final_s_uuid})

# ── tissue sample collections ─────────────────────────────────────────────────

for collection in subject_metadata.get("tissueCollections", []):
    collection_uuid = str(uuid4())
    coll_id_str = safe_trim(collection.get("collectionID", collection_uuid))
    collection_state_uuids = []
    collection_bio_sex = []
    collection_types = []
    collection_lats = []
    collection_origins = []

    for sample in collection.get("samples", []):
        (s_uuid, s_node), (st_uuid, st_node) = build_tissue_sample_instance(
            sample, collection_uuid=collection_uuid
        )
        sample_id_str = safe_trim(sample.get("sampleID", s_uuid))
        state_label = sample_id_str + "_state"

        final_st_uuid, st_result = post_or_patch_state(
            st_uuid, st_node, state_label, "TissueSampleState")
        results.append({"tissueSampleState": st_result})

        if final_st_uuid is None:
            continue  # couldn't confirm — already reported in st_result

        s_node["studiedState"] = {"@id": KG_PREFIX + final_st_uuid}

        final_s_uuid, s_result = post_or_patch_tissue_sample(
            s_uuid, s_node, sample_id_str)
        results.append({"tissueSample": s_result})

        if final_s_uuid is None:
            continue  # couldn't confirm — already reported in s_result

        collection_state_uuids.append(final_st_uuid)   # ← correct UUID
        specimen_list.append({"@id": KG_PREFIX + final_s_uuid})

        if nonempty(sample.get("biologicalSex", "")):
            collection_bio_sex.append(sample["biologicalSex"])
        if nonempty(sample.get("type",          "")):
            collection_types.append(sample["type"])
        if nonempty(sample.get("laterality",    "")):
            collection_lats.append(sample["laterality"])
        if nonempty(sample.get("origin",        "")):
            collection_origins.append(sample["origin"])

    collection_node = {
        "@type":              [f"{T}TissueSampleCollection"],
        "lookupLabel":        coll_id_str,
        "internalIdentifier": coll_id_str,
        "quantity":           len(collection.get("samples", [])),
        "studiedState":       [{"@id": KG_PREFIX + su} for su in collection_state_uuids],
    }
    apply_strain_species_group(collection_node, collection.get("samples", []))

    if collection_bio_sex:
        collection_node["biologicalSex"] = [
            {"@id": s} for s in set(collection_bio_sex)]
    if collection_types:
        collection_node["type"] = [{"@id": t} for t in set(collection_types)]
    if collection_lats:
        collection_node["laterality"] = [{"@id": l}
                                         for l in set(collection_lats)]
    if collection_origins:
        collection_node["origin"] = [{"@id": o}
                                     for o in set(collection_origins)]

    coll_remarks = nonempty(collection.get("additionalRemarks", ""))
    if coll_remarks:
        collection_node["additionalRemarks"] = coll_remarks

    final_coll_uuid, coll_result = post_or_patch_tissue_sample_collection(
        collection_uuid, collection_node, coll_id_str)
    results.append({"tissueSampleCollection": coll_result})

    if final_coll_uuid is None:
        # couldn't confirm — already reported in coll_result; don't attach
        # an unconfirmed/non-existent collection to the DatasetVersion
        continue

    specimen_list.append({"@id": KG_PREFIX + final_coll_uuid})
    print(
        f"DEBUG posted TissueSampleCollection '{coll_id_str}' with {len(collection.get('samples', []))} samples", file=sys.stderr)

# ── 6. attach all specimen to DatasetVersion ──────────────────────────────────

if specimen_list:
    attach_result = KG_patch(dsv_id, {"studiedSpecimen": specimen_list})
    results.append({"attachSpecimen": attach_result})
    print(
        f"DEBUG attached {len(specimen_list)} specimen to DatasetVersion", file=sys.stderr)

# ── done ──────────────────────────────────────────────────────────────────────

print(json.dumps({"results": results}))
