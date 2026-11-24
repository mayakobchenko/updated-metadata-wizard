#!/usr/bin/env python3
"""
fix_subjects_6167c750.py

For the dataset version whose subjects were written to its COLLAB space by the wizard, while the dataset
version itself now lives in the curated space ("dataset"):

  1. rename every Subject in the collab space   sub-035  ->  FDG-PET_sub-035
  2. add the "additional remark" text to EVERY state of those subjects (SubjectState, collab space)
  3. point the dataset version (space "dataset") to the collab subjects instead of its old subjects
  4. delete the old subjects (and their states) that sat in the "dataset" space

Safe by default: without --confirm NOTHING is written, it only prints what it would do.

Usage (PowerShell or bash):
    python fix_subjects_6167c750.py  <ebrains_token>  <ticket_json>                    # dry run, writes nothing
    python fix_subjects_6167c750.py  <ebrains_token>  <ticket_json>  --confirm         # do it

    <ticket_json> = the metadata json from the ticket (it holds datasetVersionId and the list of subject IDs).
    The token can also be given as the environment variable KG_TOKEN (then use "-" as the token argument).

Options:
    --confirm        really write / delete
    --rename-states  also rename the states  sub-035_state1 -> FDG-PET_sub-035_state1  (off by default)
    --keep-old       do not delete the old subjects of the dataset space, only detach them from the dataset version

The script can be run again after an error: steps that are already done are skipped.
The account behind the token must be allowed to edit the space "dataset" (curator rights).
"""
import json
import os
import re
import sys
import time

import requests as rq

KG_API = os.environ.get("KG_API", "https://core.kg.ebrains.eu/v3/instances/")
V = "https://openminds.om-i.org/props/"
T = "https://openminds.om-i.org/types/"
META_SPACE = "https://core.kg.ebrains.eu/vocab/meta/space"
PREFIX = "FDG-PET_"
REMARK = ("Animals were food-deprived overnight before each scan. Isoflurane was used for anesthesia during animal "
          "preparation, while medetomidine (Domitor, Orion Pharma; bolus: 0.05 mg/kg, continuous infusion: 0.1 mg/kg/h) "
          "was used for sedation during the scan. Right after the start of each scan, approximately 20 MBq 18F-FDG "
          "was injected into a lateral tail vein.")

UUID_RE = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", re.I)

# ── arguments ────────────────────────────────────────────────────────────────
args = [a for a in sys.argv[1:] if not a.startswith("--")]
flags = {a for a in sys.argv[1:] if a.startswith("--")}
if len(args) < 2:
    print(__doc__)
    sys.exit(1)
TOKEN = os.environ.get("KG_TOKEN", "") if args[0] == "-" else args[0]
if not TOKEN or TOKEN in ("null", "undefined"):
    sys.exit("No token given.")
CONFIRM = "--confirm" in flags
RENAME_STATES = "--rename-states" in flags
KEEP_OLD = "--keep-old" in flags

with open(args[1], encoding="utf-8") as f:
    ticket = json.load(f)
DSV = ticket.get("datasetVersionId", "").split("/")[-1]
if not UUID_RE.fullmatch(DSV or ""):
    sys.exit("datasetVersionId is missing in the json.")
WANTED = [s.get("subjectID", "").strip() for s in (ticket.get("subjectMetadata") or {}).get("subjects", [])]
WANTED = [w for w in WANTED if w]
if not WANTED:
    sys.exit("The json has no subjects.")
COLLAB = f"collab-d-{DSV}"

H = {"accept": "application/json", "Authorization": "Bearer " + TOKEN}
HJ = {**H, "Content-Type": "application/json; charset=utf-8"}


def log(*a):
    print(*a, flush=True)


# ── KG helpers ───────────────────────────────────────────────────────────────
def call(method, url, tries=3, **kw):
    last = None
    for i in range(1, tries + 1):
        try:
            r = rq.request(method, url, timeout=60, **kw)
            if r.status_code < 500:
                return r
            last = f"HTTP {r.status_code}: {r.text[:200]}"
        except (rq.exceptions.ConnectionError, rq.exceptions.Timeout) as e:
            last = str(e)
        if i < tries:
            time.sleep(2 * i)
    raise RuntimeError(f"{method} {url} failed: {last}")


def uid(x):
    """uuid from an @id url or a plain uuid"""
    m = UUID_RE.findall(x if isinstance(x, str) else "")
    return m[-1].lower() if m else None


def get(uuid, **params):
    q = "&".join(f"{k}={v}" for k, v in {"stage": "IN_PROGRESS", **params}.items())
    r = call("GET", f"{KG_API}{uuid}?{q}", headers=H)
    if r.status_code != 200:
        raise RuntimeError(f"GET {uuid} -> {r.status_code} {r.text[:200]}")
    return r.json().get("data") or {}


def list_instances(space, type_name):
    out, start = [], 0
    while True:
        r = call("GET", f"{KG_API[:-1]}?stage=IN_PROGRESS&space={space}&type={T}{type_name}&size=100&from={start}", headers=H)
        if r.status_code != 200:
            raise RuntimeError(f"listing {type_name} in {space} -> {r.status_code} {r.text[:200]}")
        page = r.json().get("data") or []
        out += page
        if len(page) < 100:
            return out
        start += 100


def patch(uuid, space, attrs):
    r = call("PATCH", f"{KG_API}{uuid}?space={space}", headers=HJ,
             data=json.dumps({"@context": {"@vocab": V}, **attrs}))
    if r.status_code != 200:
        raise RuntimeError(f"PATCH {uuid} (space {space}) -> {r.status_code} {r.text[:300]}")


def delete(uuid, space):
    r = call("DELETE", f"{KG_API}{uuid}?space={space}", headers=H)
    if r.status_code not in (200, 204):
        raise RuntimeError(f"DELETE {uuid} (space {space}) -> {r.status_code} {r.text[:300]}")


def prop(inst, name):
    return inst.get(V + name)


def ids_of(value):
    if value is None:
        return []
    value = value if isinstance(value, list) else [value]
    return [u for u in (uid(v.get("@id") if isinstance(v, dict) else v) for v in value) if u]


def incoming_other(uuid, ignore):
    """uuids of instances (other than `ignore`) that link to `uuid`; None if the KG does not tell."""
    try:
        d = get(uuid, returnIncomingLinks="true", incomingLinksPageSize=50)
    except Exception:
        return None
    key = next((k for k in d if "incoming" in k.lower()), None)
    if key is None:
        return None
    found = set(UUID_RE.findall(json.dumps(d[key]))) - set(ignore) - {uuid}
    return {u.lower() for u in found}


# ── 1. read everything ───────────────────────────────────────────────────────
log(f"Dataset version : {DSV}")
log(f"Mode            : {'WRITE (--confirm)' if CONFIRM else 'DRY RUN - nothing is changed'}\n")

dsv = get(DSV)
DSV_SPACE = dsv.get(META_SPACE)
log(f"The dataset version is in space '{DSV_SPACE}'.")
if DSV_SPACE == COLLAB:
    sys.exit(f"It is in its collab space - this script is for a dataset version that was moved to another space.")

collab_subjects = list_instances(COLLAB, "Subject")
by_label = {}
for s in collab_subjects:
    lab = (prop(s, "lookupLabel") or prop(s, "internalIdentifier") or "").strip()
    by_label.setdefault(lab, []).append(s)

new_subjects = []   # dicts: uuid, old_label, new_label, rename(bool), states[(uuid, space, label, remark_missing)]
problems = []
for sid in WANTED:
    cands = by_label.get(sid, []) + by_label.get(PREFIX + sid, [])
    if len(cands) != 1:
        problems.append(f"{sid}: found {len(cands)} subjects with this name in {COLLAB} (expected exactly 1)")
        continue
    s = cands[0]
    su = uid(s["@id"])
    cur = (prop(s, "lookupLabel") or "").strip()
    state_rows = []
    for st_id in ids_of(prop(s, "studiedState")):
        st = get(st_id)
        remark = (prop(st, "additionalRemarks") or "").strip()
        state_rows.append({
            "uuid": st_id, "space": st.get(META_SPACE) or COLLAB,
            "label": (prop(st, "lookupLabel") or "").strip(), "remark": remark,
            "new_remark": remark if REMARK in remark else (f"{remark} {REMARK}".strip()),
        })
    new_subjects.append({"uuid": su, "label": cur, "new_label": cur if cur.startswith(PREFIX) else PREFIX + cur,
                         "space": s.get(META_SPACE) or COLLAB, "states": state_rows})
extra = sorted(set(by_label) - {x for w in WANTED for x in (w, PREFIX + w)})
if problems:
    log("\nPROBLEMS - nothing will be written:")
    for p in problems:
        log("  -", p)
    sys.exit(1)

old_specimen = ids_of(prop(dsv, "studiedSpecimen"))
old_subjects, keep_specimen = [], []
new_uuids = {s["uuid"] for s in new_subjects}
for u in old_specimen:
    if u in new_uuids:
        continue                       # already attached (re-run)
    inst = get(u)
    types = inst.get("@type") or []
    in_dsv_space = inst.get(META_SPACE) == DSV_SPACE
    if (T + "Subject") in types and in_dsv_space:
        states = ids_of(prop(inst, "studiedState"))
        own = {u, DSV, *states}
        others = incoming_other(u, own)
        old_subjects.append({"uuid": u, "label": (prop(inst, "lookupLabel") or "").strip(), "states": states,
                             "space": inst.get(META_SPACE), "others": others})
    else:
        keep_specimen.append(u)

# ── 2. plan ──────────────────────────────────────────────────────────────────
log(f"\nSubjects in the collab space ({COLLAB}):")
for s in new_subjects:
    log(f"  {s['uuid']}  {s['label']:<18} -> {s['new_label']}   ({len(s['states'])} state(s))")
    for st in s["states"]:
        todo = ("remark added" if not st["remark"] else "remark appended to the existing text") if st["new_remark"] != st["remark"] else "remark already there"
        log(f"        state {st['uuid']}  {st['label']}: {todo}")
if extra:
    log(f"  (other subject names in the collab space that are not in the ticket json, left alone: {', '.join(extra)})")

log(f"\nOld subjects of the dataset version in space '{DSV_SPACE}' (to be replaced): {len(old_subjects)}")
for o in old_subjects:
    flag = ""
    if o["others"]:
        flag = f"   !! also linked from {sorted(o['others'])} -> will NOT be deleted"
    elif o["others"] is None:
        flag = "   (could not check whether anything else links to it)"
    log(f"  {o['uuid']}  {o['label']}  ({len(o['states'])} state(s)){flag}")
if keep_specimen:
    log(f"\nOther specimens of the dataset version, kept as they are: {len(keep_specimen)}")

final_specimen = keep_specimen + [s["uuid"] for s in new_subjects]
log(f"\nThe dataset version will list {len(final_specimen)} studied specimen "
    f"({len(new_subjects)} subjects from the collab space + {len(keep_specimen)} others).")

if not CONFIRM:
    log("\nDRY RUN finished. Nothing was changed. Run again with --confirm to do it.")
    sys.exit(0)

# ── 3. write ─────────────────────────────────────────────────────────────────
# a harmless request that tells us at once whether this account may edit the dataset version
log("\nChecking the write access to the dataset version ...")
patch(DSV, DSV_SPACE, {"studiedSpecimen": dsv.get(V + "studiedSpecimen") or []})   # same value again = no change
log("  ok")

log("\nStep 1: rename the subjects")
for s in new_subjects:
    if s["label"] == s["new_label"]:
        continue
    patch(s["uuid"], s["space"], {"lookupLabel": s["new_label"], "internalIdentifier": s["new_label"]})
    log(f"  {s['label']} -> {s['new_label']}")

log("\nStep 2: additional remark on every state")
for s in new_subjects:
    for st in s["states"]:
        attrs = {}
        if st["new_remark"] != st["remark"]:
            attrs["additionalRemarks"] = st["new_remark"]
        if RENAME_STATES and st["label"] and not st["label"].startswith(PREFIX):
            attrs["lookupLabel"] = attrs["internalIdentifier"] = PREFIX + st["label"]
        if attrs:
            patch(st["uuid"], st["space"], attrs)
            log(f"  {st['label']}: updated")

log("\nStep 3: attach the collab subjects to the dataset version")
patch(DSV, DSV_SPACE, {"studiedSpecimen": [{"@id": "https://kg.ebrains.eu/api/instances/" + u} for u in final_specimen]})
log(f"  dataset version now lists {len(final_specimen)} specimen")

if KEEP_OLD:
    log("\nStep 4: skipped (--keep-old); the old subjects are detached but still exist in the dataset space.")
else:
    log("\nStep 4: delete the old subjects of the dataset space")
    failed = []
    for o in old_subjects:
        if o["others"]:
            log(f"  {o['uuid']} {o['label']}: SKIPPED, other instances link to it")
            continue
        try:
            delete(o["uuid"], o["space"])
            log(f"  deleted subject {o['label']} ({o['uuid']})")
            for stu in o["states"]:
                delete(stu, o["space"])
            if o["states"]:
                log(f"    and its {len(o['states'])} state(s)")
        except RuntimeError as e:
            failed.append(str(e))
            log("  FAILED:", e)
    if failed:
        log(f"\n{len(failed)} deletion(s) failed - the new subjects are attached, only the clean-up is incomplete.")
        sys.exit(2)

log("\nDone.")
