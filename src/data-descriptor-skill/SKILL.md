---
name: data-descriptor-generator
description: >-
  Generate an EBRAINS data descriptor for a research dataset as a Markdown
  document and as a Word document filled from the EBRAINS template. The Data
  Records section is derived from a file listing of the deposit and, when
  files may be opened, from a sample of them; every other section comes from
  a structured interview with the researcher. Use when a researcher wants to
  document a dataset for sharing or publication: title, authors, summary,
  materials and methods, usage notes, data records, references. Requires at
  least a file listing; file access is optional.
---

# Data Descriptor Generator

Lead a researcher through writing an EBRAINS data descriptor, assemble the
answers into a Markdown file that follows the standard EBRAINS template, and
render that file into the EBRAINS Word template for submission.

## Two sources, kept apart

**The interview** supplies what only the author knows: title, authors, summary,
how the data was collected and processed, what a reuser should be careful about,
what to cite.

**The deposit** supplies Data Records. The directory tree, the file counts, the
extensions, the naming scheme and, where files can be opened, the container
contents and units are read from the files, not typed from memory. The author
confirms and annotates; the author does not dictate paths or counts.

The reason is that a descriptor written from memory disagrees with its files in
predictable ways: a task described that has no data; a selection rule stated that
most records fail; a column documented in milliseconds that holds seconds; a file
tree that differs from the storage in one letter of a licence file's name. Every
one of these is answered by the listing or by one opened file, and none is
answered by a better interview question.

## Inputs

1. **A file listing — required.** Relative paths of every object in the deposit,
   with sizes and checksums when the source provides them. A local folder walk,
   a storage-bucket listing, or a manifest the author exported all qualify. See
   [reference/listing-and-sampling.md](reference/listing-and-sampling.md) for
   how to obtain one and what to record about it.
2. **A sample of files — when permitted.** Data-protection or licensing terms
   may forbid opening files. When they do not, open one file of each kind and
   read its structure, not its bulk data. When they do, Data Records still holds
   everything the listing gives, and the container contents, units and sampling
   rates come from the interview and are marked as author-stated in the final
   validation summary.
3. **The interview**, for everything else.

## Output

Two files in the user's chosen location:

1. `data-descriptor.md`, in the section order of
   `templates/markdown_template.md`. This is the working copy: it is what the
   interview drafts into, what the author reviews, and what a later version
   edits.
2. `data-descriptor.docx`, the EBRAINS Word template filled from the Markdown
   by `scripts/fill_word_template.py`. This is the file submitted to EBRAINS.
   It is regenerated from the Markdown, never edited by hand.

Alongside them, a short validation summary to the user (not part of the
descriptor) listing what was verified against the listing, what was verified
against sampled files, and what rests on the author's statement alone.

## Workflow

1. **Orient.** Confirm the domain (fMRI, histology / microscopy,
   electrophysiology, behaviour) and load the matching `domains/*.md`. Confirm
   where to save the output. Ask whether files may be opened, and if not, why —
   the answer decides step 4.
2. **Ingest the listing.** Record its source, date, object count and total
   size. Derive the draft Data Records from it: tree, counts, extensions,
   dataset-level files, naming-scheme candidates, file-kind ownership. Follow
   [reference/data-records-guide.md](reference/data-records-guide.md).
3. **Interview**, walking `templates/markdown_template.md` top to bottom with
   the question bank below. Echo a draft of each section back before moving on.
   Question 9 shows the author the derived Data Records and asks for what the
   listing cannot say.
4. **Sample files**, when permitted. One file per kind per distinct branch of the
   tree, read for structure only. Fill the container-contents table, the units
   and the sampling rates from what is read. Check that sampled files of one
   kind agree with each other.
5. **Reconcile.** Compare the author's statements with the listing and the
   samples: every count, every task or condition named, every file kind, every
   unit. Where they disagree, show both and ask which is right. Do not resolve a
   disagreement by preferring the interview.
6. **Assemble** into `data-descriptor.md`.
7. **Validate.** Run the checklist. Report what is missing and what rests on the
   author's statement alone.
8. **Render to Word.** Run

   ```bash
   python3 <skill-dir>/scripts/fill_word_template.py data-descriptor.md
   ```

   which writes `data-descriptor.docx` beside the Markdown file. The script
   needs `python-docx` (`pip install python-docx`). It exits non-zero and lists
   the problems when a section is missing or empty, the title or summary
   exceeds the template's limits, a placeholder survives, or an image cannot be
   found; fix the Markdown and run it again. Do not edit the `.docx` by hand.

## Template (section order)

Every descriptor uses this structure. The heading names and levels are those
of the EBRAINS Word template; the renderer matches Markdown sections to Word
sections by heading name. A running header
`Title: '<short label>' | version: <version>` precedes the body.

1. `# DATA DESCRIPTOR`
2. `## TITLE` — full descriptive title, at most 110 characters, no colons or
   parentheses
3. `## AUTHORS` — names with superscript affiliation indices (`^1,2^`)
4. `### AFFILIATIONS` — numbered institution list
5. `### CORRESPONDING AUTHOR(S)` — `Forename Surname: email`, one per line
6. `## SUMMARY` — one paragraph, at most 220 words, no references
7. `## VERSION SPECIFICATIONS` — what's in this version / changes since last
8. `## MATERIALS AND METHODS` — domain subsections as `###` headings
   (Subjects/Animals, Equipment, Experimental Procedure, Stimuli, Data/Image
   analysis); may embed figures as `![**Figure N:** caption](figureN.png)`
9. `## USAGE NOTES` — caveats, software versions, units, license
10. `## DATA RECORDS` — (a) annotated directory tree; (b) Format / Extension /
    Software table; (c) filename legend; (d) container contents
11. `## Acknowledgements` — funding
12. `## Author contributions` — per-author roles, one per line
13. `## REFERENCES` — numbered citations

The Markdown conventions the Word renderer understands (hard line breaks,
superscripts, the tree block, tables with `<br>`, figures) are listed at the
top of `templates/markdown_template.md`.

## Question bank

Ask these in order. Questions 5–8 expand into domain-specific sub-questions
(see "Domain variants").

1. **Title** — Full title of the dataset, plus a short label (2–4 words) for the
   running page header?
2. **Authors & affiliations** — All authors in order; institution(s) for each.
   Which are corresponding, and their email addresses?
3. **Summary** — One paragraph: what the dataset contains, why it was collected,
   what makes it valuable. Written for a first-time reader.
4. **Version** — First release? If not, what changed since the previous version?
   The subject and session counts come from the listing; confirm them here.
5. **Subjects / animals** — Who/what was studied: counts, demographics
   (age, sex, species, strain), grouping, and ethics approval / consent. Where a
   group label has a specific meaning in this dataset (an "adult" group aged
   P18–P24), state the definition.
6. **Acquisition equipment & parameters** — Instrument(s) used and key
   acquisition settings. Give the sampling rate per file kind, not per dataset,
   when kinds differ.
7. **Experimental procedure & stimuli** — What subjects did/underwent: task,
   paradigm, protocol, stimuli, timing. Every task or condition named here must
   have data in the listing; the reconcile step checks it.
8. **Processing & analysis** — Steps from raw data to shared data, with software
   and versions. Ask separately: **what was removed, filtered, down-sampled or
   selected before upload, and is the unselected set kept anywhere?** A deposit
   that holds only samples above a speed threshold, or only units passing a
   quality rule, must say so here.
9. **Data records** — Show the author the tree, counts, format table and
   naming-scheme candidates derived from the listing. Ask only for what the
   listing cannot give: what each file kind contains; how each format was
   produced (standard or a named script); for every quantity, the unit stored in
   the file and any conversion a reader must apply; reserved in-band values (a
   code for a blank trial, a value meaning "no response"); for containers whose
   files could not be opened, the internal variables, fields or columns.
10. **Usage notes, license & references** — Reuse caveats; the reader library
    and version that was actually used to open the files; limitations; what the
    deposit cannot support (recordings deposited at a rate too low for a
    published measure, a calibration value not recorded); license; funding;
    publications to cite, with DOIs.

### Domain variants (questions 5–8)

Tailor the Materials & Methods prompts to the domain by loading the matching
file, each with sub-questions and Data Records pointers:

- **fMRI / MRI** → `domains/fmri.md`
- **Histology / microscopy** → `domains/histology.md`
- **Electrophysiology** → `domains/electrophysiology.md`

For domains not yet covered, fall back to the generic questions 5–8 above.

## Validation checklist

Before finishing, confirm:

- [ ] All 13 sections are present and in order.
- [ ] The title is at most 110 characters and holds no colon or parenthesis.
- [ ] The summary is at most 220 words and cites no reference.
- [ ] Every author maps to an affiliation index, and every affiliation index is
      used.
- [ ] At least one corresponding author with a valid email.
- [ ] Version is stated; if not v1, changes are described.
- [ ] Every path in the directory tree exists in the listing, and every file in
      the listing is covered by the tree, including dataset-level files.
- [ ] Every count in the descriptor (subjects, sessions, files, trials) is
      traceable to the listing or to a table in the deposit.
- [ ] Every extension in the listing appears in the Format table, and every row
      of the Format table corresponds to an extension in the listing.
- [ ] Every token used in a filename or folder naming scheme is defined in a
      legend, with optional tokens, padding and date format stated.
- [ ] Every file kind in the tree names the entity it belongs to.
- [ ] Every task, condition or group named in Materials and Methods has
      corresponding files in the listing.
- [ ] Container files have their internal variables, fields or keys documented,
      from sampled files where permitted; otherwise marked author-stated.
- [ ] Every quantity states its stored unit and any conversion to apply.
- [ ] Preprocessing applied before deposit is stated, or stated as none.
- [ ] A reader library and version that opened the files is named.
- [ ] A license is specified, and its name matches the licence file in the
      listing exactly.
- [ ] No placeholder survives: `TODO`, `tbd`, `unknown`, `N/A`, `doi:TODO`.
- [ ] No parameter a reuser must apply exists only as an image.
- [ ] References are numbered and cited where used, with DOIs.
- [ ] `scripts/fill_word_template.py` ran without reporting a problem, and
      `data-descriptor.docx` is beside `data-descriptor.md`.

## Bundled resources

- `templates/markdown_template.md` — the empty 13-section skeleton with the
  running header and the Word template's guidance as comments.
- `templates/word_template.docx` — the EBRAINS Word template the `.docx` output
  is filled from.
- `scripts/fill_word_template.py` — renders `data-descriptor.md` into the Word
  template and validates the result; needs `python-docx`.
- `reference/listing-and-sampling.md` — obtaining a listing, what to derive from
  it, how to sample files, what to do when files may not be opened, and the
  reconcile step.
- `reference/data-records-guide.md` — Data Records formatting: tree, format
  table, legend, container contents.
- `reference/file-formats.md` — extension → format name → software lookup,
  mined from the EBRAINS corpus.
- `domains/{fmri,histology,electrophysiology}.md` — domain-tailored Materials &
  Methods sub-questions and Data Records pointers.
- `examples/` — Materials & Methods + Data Records excerpts from four real
  descriptors: `fmri-bids-ibc.md`, `histology-microscopy-iegs.md`,
  `ephys-custom-naming-pci.md` (custom filename scheme),
  `container-mat-decision.md` (per-variable container table).

A dev-time helper, `scripts/extract_sections.py` (repo root, outside the skill),
regenerates examples and re-mines formats from `data_descriptors/`. It is not
part of the skill runtime.
