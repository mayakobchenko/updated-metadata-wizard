# Domain variant: histology / microscopy

Tailored Materials & Methods sub-questions for histology / microscopy datasets
(immunostaining, slide scanning, atlas registration, cell quantification). Use
alongside the core question bank in SKILL.md. Reference example:
`examples/histology-microscopy-iegs.md`.

## Animals
- Species, strain, supplier, sex, age, and group sizes (n per condition)?
- Housing conditions and animal licence / ethics approval?

## Behavioural / experimental procedures (if any)
- What manipulation preceded tissue collection (e.g. behavioural paradigm)?
- Timing between manipulation and sacrifice?

## Perfusion & tissue processing
- Anaesthesia, perfusion/fixation protocol, post-fixation, sectioning method,
  and section thickness?
- Sampling scheme (e.g. 1 in 4 sections)?

## Immunostaining
- Primary and secondary antibodies (target, host, dilution, catalogue number)?
- Markers and their fluorophore channels (e.g. cFos / AF568, Arc / AF647)?
- Counterstain (e.g. DAPI)?

## Imaging
- Microscope and camera (model, sensor, pixel size)?
- Objective (magnification / NA)?
- Resulting image pixel size and bit depth?

## Image analysis
- Atlas and version registered to (e.g. Allen CCFv3)?
- Registration tool (e.g. ABBA / QuickNII) and manual refinement steps?
- Quantification software and version (e.g. QuPath + BraiAn); detection /
  classifier parameters?
- Units of the quantified output (e.g. cells/mm² — state explicitly)?

## Data Records pointers
- Often custom per-subject/per-slide naming — define a filename-code legend
  (e.g. `mouseXXX_[age]_[sex]_[stain]`).
- Common formats: `.czi`, `.tif`, `.qpproj`/`.qpdata`, `.json` (ontologies,
  transforms), `.txt`/`.csv` (region counts), `.yml` (configs). State the column
  scheme for region/count tables. See `reference/file-formats.md`.
