"""
Read-only probe for the EBRAINS data-proxy bucket API (where dataset files live).

Safe by design: it only calls GET /stat and GET (list). It never uploads,
deletes or downloads file contents, and the token is read from the
EBRAINS_TOKEN environment variable and never printed or saved.

Get a token the same way the curators' scripts do: open
  https://lab.ebrains.eu/hub/oauth_login?next=https://lab.ebrains.eu/user-redirect/lab/tree/shared/Data%20Curation/EBRAINS-token.ipynb
run the notebook and click the button to copy the token.

Windows cmd:   set EBRAINS_TOKEN=<paste token>
PowerShell:    $env:EBRAINS_TOKEN="<paste token>"
Bucket:        set BUCKET_NAME=d-<dataset-version-uuid>
Run:           python bucket_probe.py
"""
import os
import sys
import json
import time
import base64
import requests

API = "https://data-proxy.ebrains.eu/api/v1/buckets/"
TOKEN = os.environ.get("EBRAINS_TOKEN", "").strip().strip("'\"")
BUCKET = os.environ.get("BUCKET_NAME", "").strip()
MAX_PAGES = 5  # keep the probe light


def token_info():
    try:
        payload = TOKEN.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        c = json.loads(base64.urlsafe_b64decode(payload))
    except Exception as exc:
        print(f"(could not decode token as a JWT: {exc})")
        return
    mins = (c.get("exp", 0) - time.time()) / 60
    print(f"Token expires in {mins:.0f} min" + ("  <-- EXPIRED, get a fresh one" if mins <= 0 else ""))
    print(f"Client (azp): {c.get('azp')}")
    print(f"Scopes: {c.get('scope')}\n")


def main():
    if not TOKEN or not BUCKET:
        sys.exit("Set EBRAINS_TOKEN and BUCKET_NAME first (see the top of this file).")
    h = {"accept": "application/json", "Authorization": f"Bearer {TOKEN}"}
    print(f"Probing bucket {BUCKET}\n")
    token_info()

    r = requests.get(f"{API}{BUCKET}/stat", headers=h, timeout=30)
    print(f"[{'PASS' if r.status_code == 200 else 'FAIL'}] stat -> HTTP {r.status_code}")
    if r.status_code != 200:
        print("   401/403: token not accepted for this bucket (wrong scope, expired, or no access).")
        print("   404: bucket name wrong (should be d- followed by the dataset version UUID).")
        return
    print("   " + json.dumps(r.json())[:300])

    names, marker = [], ""
    for page_no in range(MAX_PAGES):
        url = f"{API}{BUCKET}?limit=0" + (f"&marker={requests.utils.quote(marker)}" if marker else "")
        r = requests.get(url, headers=h, timeout=60)
        if r.status_code != 200:
            print(f"[FAIL] list page {page_no + 1} -> HTTP {r.status_code}")
            return
        objs = r.json().get("objects", [])
        if not objs:
            break
        names += [o["name"] for o in objs]
        marker = objs[-1]["name"]
    print(f"[PASS] list -> {len(names)} object names in {page_no + 1} page(s) (capped at {MAX_PAGES})")

    tops = {}
    for n in names:
        top = n.split("/")[0] if "/" in n else "(top level)"
        tops[top] = tops.get(top, 0) + 1
    print("   Top-level entries (count of files):")
    for k, v in sorted(tops.items())[:20]:
        print(f"     {k}: {v}")


if __name__ == "__main__":
    main()
