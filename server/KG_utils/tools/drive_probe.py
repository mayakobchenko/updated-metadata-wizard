"""
Read-only probe: which way of reaching the EBRAINS Collaboratory drive works?

Safe by design:
  * only READS (list libraries, list a folder). No upload, mkdir or delete.
  * the token is read from the EBRAINS_TOKEN environment variable and is
    never printed or written to disk.

Setup (once):   pip install ebrains-drive requests
Get a token:    in the Collab JupyterLab:   clb_oauth.get_token()
Windows cmd:    set EBRAINS_TOKEN=<paste token>
PowerShell:     $env:EBRAINS_TOKEN="<paste token>"
Run:            python drive_probe.py
Optional:       set DRIVE_LIBRARY_NAME=d-<dataset-version-uuid>
"""
import os
import sys
import json
import time
import base64
import requests

SERVER = "https://drive.ebrains.eu"
TOKEN = os.environ.get("EBRAINS_TOKEN", "").strip().strip("'\"")
LIB_NAME = os.environ.get("DRIVE_LIBRARY_NAME", "d-724d4af0-fe28-4032-8837-120b0d64a81c")
results = {}


def record(name, ok, detail=""):
    results[name] = ok
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" - {detail}" if detail else ""))


def token_info():
    """Decode (NOT verify) the JWT payload to check expiry and scopes."""
    try:
        payload = TOKEN.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        claims = json.loads(base64.urlsafe_b64decode(payload))
    except Exception as exc:
        print(f"Could not decode token as a JWT ({exc}); continuing anyway.")
        return
    mins = (claims.get("exp", 0) - time.time()) / 60
    scopes = claims.get("scope", "").split()
    print(f"Token expires in {mins:.0f} min" + ("  <-- EXPIRED, get a fresh one" if mins <= 0 else ""))
    print(f"Has collab.drive scope: {'collab.drive' in scopes}")
    print(f"Client (azp): {claims.get('azp')}")
    print()


def walk_names(dirobj, depth=0, limit=40, out=None):
    out = [] if out is None else out
    for e in dirobj.ls(force_refresh=True):
        if len(out) >= limit:
            break
        out.append(("  " * depth) + e.name + ("/" if e.__class__.__name__ == "SeafDir" else ""))
        if e.__class__.__name__ == "SeafDir" and depth < 1 and not e.name.startswith("."):
            walk_names(e, depth + 1, limit, out)
    return out


def test_ebrains_drive_package():
    """Method A: the official python package (worked in your notebook)."""
    try:
        import ebrains_drive
    except ImportError:
        return record("A. ebrains_drive package", False, "not installed: pip install ebrains-drive")
    try:
        client = ebrains_drive.connect(token=TOKEN)
        repos = client.repos.get_repos_by_filter("name", LIB_NAME)
        if not repos:
            return record("A. ebrains_drive package", False, f"connected, but no library named {LIB_NAME}")
        names = walk_names(repos[0].get_dir("/"))
        record("A. ebrains_drive package", True, f"listed {len(names)} entries")
        for n in names[:15]:
            print("      " + n)
    except Exception as exc:
        record("A. ebrains_drive package", False, str(exc)[:200])


def test_rest():
    """Methods B/C: plain REST calls (what the Node code would do)."""
    try:
        r = requests.get(f"{SERVER}/api2/account/token/",
                         headers={"Authorization": f"Bearer {TOKEN}", "Accept": "text/plain"}, timeout=30)
    except Exception as exc:
        return record("B. REST token exchange", False, str(exc)[:200])
    if r.status_code != 200:
        return record("B. REST token exchange", False, f"HTTP {r.status_code}")
    drive_token = r.text.strip().strip('"')
    record("B. REST token exchange", True, "got a drive token")

    for style in ("Bearer", "Token"):
        h = {"Authorization": f"{style} {drive_token}", "Accept": "application/json"}
        try:
            libs = requests.get(f"{SERVER}/api2/repos/", headers=h, timeout=30)
            ok = libs.status_code == 200
            repo = next((l for l in libs.json() if l.get("name") == LIB_NAME), None) if ok else None
            record(f"C. REST list libraries ({style} header)", ok,
                   f"HTTP {libs.status_code}" + ("" if repo or not ok else f", but {LIB_NAME} not in the list"))
            if repo:
                d = requests.get(f"{SERVER}/api2/repos/{repo['id']}/dir/", params={"p": "/"}, headers=h, timeout=30)
                ok2 = d.status_code == 200
                record(f"D. REST list folder ({style} header)", ok2,
                       f"HTTP {d.status_code}" + (f", {len(d.json())} entries" if ok2 else ""))
        except Exception as exc:
            record(f"C. REST ({style} header)", False, str(exc)[:200])


if __name__ == "__main__":
    if not TOKEN:
        sys.exit("Set the EBRAINS_TOKEN environment variable first (see the top of this file).")
    print(f"Probing {SERVER}, library {LIB_NAME}\n")
    token_info()
    test_ebrains_drive_package()
    test_rest()
    print("\nSummary:", ", ".join(f"{k.split('.')[0]}={'ok' if v else 'FAIL'}" for k, v in results.items()))
