---
name: data-descriptor-generator
description: >-
  Generate an EBRAINS-style data descriptor for a research dataset through a
  structured interview, producing a Markdown document. Use when a researcher
  wants to document a dataset for sharing/publication: title, authors, summary,
  materials and methods, usage notes, data records, and references. Interview-
  driven — the skill does not inspect the dataset on disk; the researcher
  provides all content.
---

# Data Descriptor Generator

Lead a researcher through writing an EBRAINS data descriptor and assemble the
answers into a single Markdown file that follows the standard EBRAINS template.

This skill is **interview-only**: it never reads the dataset from disk. The
researcher supplies every piece of content. The skill's job is to ask the right
questions in the right order, fill gaps from a bundled reference table where it
safely can, and produce a complete, validated document.

## Output

A single Markdown file, `data-descriptor.md`, in the user's chosen location.
Section order, headers, and tables match the EBRAINS template (see below).

## Workflow

1. **Orient.** Confirm the dataset's broad domain (e.g. fMRI, histology /
   microscopy, electrophysiology, behaviour) so Materials & Methods questions
   can be tailored — load the matching `domains/*.md` for sub-questions. Confirm
   where to save the output.
2. **Interview.** Walk `template.md` top to bottom using the question bank below.
   Ask one section at a time. Echo back a draft of each section as you go so the
   user can correct it before moving on.
3. **Auto-fill where safe.** When the user lists file extensions for Data
   Records, fill the Format and Software columns from `reference/file-formats.md`
   instead of asking. Flag any unknown extension and ask the user to describe it.
4. **Assemble.** Render all sections into `data-descriptor.md` following
   `template.md` order.
5. **Validate.** Run the checklist. Report anything missing; do not silently
   omit a required section.

## Template (section order)

Every descriptor uses this structure. A running header
`Title: '<short label>' | version: <version>` precedes the body.

1. `# DATA DESCRIPTOR`
2. `## TITLE` — full descriptive title
3. `## AUTHORS` — names with superscript affiliation indices
4. `## AFFILIATIONS` — numbered institution list
5. `## CORRESPONDING AUTHOR(S)` — name + email
6. `## SUMMARY` — one-paragraph abstract
7. `## VERSION SPECIFICATIONS` — what's in this version / changes since last
8. `## MATERIALS AND METHODS` — domain subsections (Subjects/Animals,
   Equipment, Experimental Procedure, Stimuli, Data/Image analysis); may embed
   figures
9. `## USAGE NOTES` — caveats, software versions, units, license
10. `## DATA RECORDS` — (a) annotated directory tree; (b) Format / Extension /
    Software table
11. `## Acknowledgements` — funding
12. `## Author contributions` — per-author roles
13. `## REFERENCES` — numbered citations

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
   How many subjects/sessions in this version?
5. **Subjects / animals** — Who/what was studied: counts, demographics
   (age, sex, species, strain), grouping, and ethics approval / consent.
6. **Acquisition equipment & parameters** — Instrument(s) used and key
   acquisition settings (resolution, sampling rate, sequence/channel details).
7. **Experimental procedure & stimuli** — What subjects did/underwent: task,
   paradigm, protocol, stimuli, timing.
8. **Processing & analysis** — Steps from raw data to shared data
   (preprocessing, registration, segmentation, quantification); software and
   versions.
9. **Data records (structure & formats)** — On-disk folder/file hierarchy; each
   file type and its contents; standards used (e.g. BIDS). For tabular/structured
   files, the column headers, keys, or variable names and their units. For
   container files (`.mat`, `.npz`, `.json`, HDF5), the internal variables/fields
   they hold. Whether filenames encode metadata via a naming scheme, and how each
   format was produced (standard vs. custom / generating script).
10. **Usage notes, license & references** — Reuse caveats, required software
    versions, units, limitations; license; funding; publications to cite.

### Domain variants (questions 5–8)

Tailor the Materials & Methods prompts to the domain by loading the matching
file, each with sub-questions and Data Records pointers:

- **fMRI / MRI** → `domains/fmri.md`
- **Histology / microscopy** → `domains/histology.md`
- **Electrophysiology** → `domains/electrophysiology.md`

For domains not yet covered, fall back to the generic questions 5–8 above.

## Data Records

The most information-dense section, and the one reusers depend on most. It has up
to four parts: (1) directory tree and (2) format table — essentially universal;
(3) filename-code legend and (4) container-file contents table — conditional but
common. The full formatting guidance, with corpus-grounded detail and examples,
is in **`reference/data-records-guide.md`** — load it when writing this section.

## Validation checklist

Before finishing, confirm:

- [ ] All 13 sections are present and in order.
- [ ] Every author maps to an affiliation index, and every affiliation index is
      used.
- [ ] At least one corresponding author with a valid email.
- [ ] Version is stated; if not v1, changes are described.
- [ ] Every file extension in the directory tree appears in the Format table.
- [ ] Every token used in a filename/folder naming scheme is defined in a legend.
- [ ] Container files (`.mat`, `.npz`, HDF5, etc.) have their internal
      variables/fields/keys documented.
- [ ] Tabular/structured files list their column headers or keys, with units.
- [ ] Units are stated for any quantitative measures in Usage Notes.
- [ ] A license is specified.
- [ ] References are numbered and cited where used.

## Bundled resources

- `template.md` — the empty 13-section skeleton with the running header.
- `reference/data-records-guide.md` — full Data Records formatting guidance.
- `reference/file-formats.md` — extension → format name → software lookup,
  mined from the EBRAINS corpus.
- `domains/{fmri,histology,electrophysiology}.md` — domain-tailored Materials &
  Methods sub-questions and Data Records pointers.
- `examples/` — Materials & Methods + Data Records excerpts from four real
  descriptors spanning the main patterns: `fmri-bids-ibc.md`,
  `histology-microscopy-iegs.md`, `ephys-custom-naming-pci.md` (custom filename
  scheme), `container-mat-decision.md` (per-variable container table).

A dev-time helper, `scripts/extract_sections.py` (repo root, outside the skill),
regenerates examples and re-mines formats from `data_descriptors/`. It is not
part of the skill runtime.
