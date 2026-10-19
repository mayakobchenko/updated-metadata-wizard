# Listing and sampling

Data Records is derived from the deposit. This file says how to obtain a file
listing, what the listing alone can give, how to sample files when they may be
opened, what to do when they may not, and how to reconcile the author's
statements with both.

## 1. Obtaining a listing

A listing is the set of relative paths of every object in the deposit, with
sizes and checksums when the source provides them. Any of these qualifies:

- **A local folder.** `find <root> -type f -printf '%P\t%s\n'` on Linux, or
  `find <root> -type f -exec stat -f '%N %z' {} +` on macOS, gives path and
  size. Strip the root so paths are relative.
- **An object-storage bucket.** Most archives expose a paged listing. The
  EBRAINS data proxy lists a free-access bucket at
  `https://data-proxy.ebrains.eu/api/v1/buckets/<bucket>?limit=1000`, paged by
  `marker`, with a `prefix` parameter to list one folder. Listing is slow, about
  30 s per 1000 objects, so look for an index file the deposit ships first
  (an SQLite catalogue, `manifest.json`, `sessions.csv`) and check its row count
  against the listing rather than trusting either alone.
- **A manifest the author exported**, as long as it carries every path.

Record about the listing: its source, the date it was taken, the object count,
and the total size. These go in the validation summary.

## 2. What the listing alone gives

Derive all of this before asking the author anything about Data Records:

- **The tree**, collapsed to patterns where siblings repeat
  (`sub-XX/ses-YY/`), with counts at each level.
- **Dataset-level files**: the descriptor, the licence, tables such as
  `participants.tsv` or `sessions.csv`, `README`, `code/`, `docs/`. List them in
  the tree and label them as belonging to the dataset, not to any subject or
  session.
- **The extension set**, which becomes the rows of the Format table.
- **File-kind ownership**: which entity's folder each file kind is a direct
  child of. A `scans.tsv` beside run folders belongs to the session; a
  `settings.xml` beside stream folders belongs to the recording. Label this in
  the tree, because a reader cannot infer it from the name.
- **Naming-scheme candidates**: the parts of sibling names that vary become the
  tokens of the legend. Present them to the author to name and define; do not
  guess what a token means.
- **Variants**: sessions or subjects whose file sets differ. Example: one subject
  recorded with one acquisition system and the rest with another, visible as two
  different extension sets under otherwise parallel folders. State which subjects
  have which set.
- **Depth**: files inside subfolders of a session folder stay at that depth in
  the tree; do not flatten them.
- **Duplicates**: when checksums are available, files with identical digests that
  should differ. Example: a treatment recording that is a byte-for-byte copy of
  its own control.
- **Index files**: compare the row count of any catalogue the deposit ships with
  the listing. A catalogue that lists 52 sessions for a deposit of 53 files is a
  finding to put in Usage Notes.

## 3. Sampling, when files may be opened

Open one file of each kind per distinct branch of the tree, including the first
and the last in sort order and at least one per subject or group. Read structure,
not bulk data:

- **Containers (NWB, HDF5, `.mat`, `.npz`)**: group and dataset names, shapes,
  dtypes, and the attributes that carry units and conversions. For NWB, the
  value in the declared unit is `data * conversion + offset`; record both the
  declared unit and the conversion for every series. A structural read of an
  NWB file touches a few hundred kilobytes however large the file is.
- **Tables (TSV, CSV, Parquet)**: the header row and a few rows, to confirm
  column names, units and the delimiter.
- **Per kind**: sampling rate, duration, number of channels or sweeps.
- **Agreement across samples of one kind.** The same series name holding a
  voltage-clamp recording in one file and a current-clamp recording in another
  is a fact for the tree and for Usage Notes, not an anomaly to pick one of.
- **The reader.** Open the files with the library you will recommend in Usage
  Notes, and name its version. A recommendation that was not exercised is not
  made.
- **Reserved values**: scan small integer or categorical fields for codes outside
  the plausible range (an orientation of 666; a response of −1) and ask the
  author what each means.

## 4. When files may not be opened

Data-protection, licensing or access terms may forbid opening any file. Then:

- Data Records carries everything §2 gives from the listing alone.
- Container contents, units, conversions, sampling rates and reserved values come
  from the interview.
- The validation summary lists each such statement as **author-stated,
  unverified**, so a curator can see what to check at release.

Do not fill the gap by guessing from file names or extensions. A `.mat` file's
variables are not knowable from its name.

## 5. Reconcile

Before assembling, compare the author's statements with the deposit and show
every disagreement, with both values, for the author to resolve:

| Author statement | Checked against |
|---|---|
| subject, session, trial and file counts | the listing and any index file |
| tasks, conditions and groups named in Materials and Methods | folders and files present for each |
| the file tree and file names, including case | the listing |
| the licence name | the licence file's name and content in the listing |
| sampling rate, units, conversions, column names | sampled files |
| "readable with X" | the reader actually used in §3 |
| preprocessing applied before deposit | gaps and ranges in sampled timestamps |

A disagreement is resolved by the author, in the open, not by the skill
preferring one source.
