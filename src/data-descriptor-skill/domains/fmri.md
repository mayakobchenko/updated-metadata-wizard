# Domain variant: fMRI / MRI

Tailored Materials & Methods sub-questions for (f)MRI datasets. Use alongside the
core question bank in SKILL.md. Reference example: `examples/fmri-bids-ibc.md`.

## Subjects
- How many participants, and their demographics (age, sex)?
- Any dropouts or partial/incomplete acquisitions? Note them explicitly.
- Ethics approval / informed consent under which they were scanned?

## MRI equipment
- Scanner manufacturer, model, and field strength (e.g. Siemens 3T Prisma)?
- Head/neck coil (channel count)?
- Any response devices or in-bore audio/visual equipment?
- Acquisition site?

## Experimental procedure
- Session structure — how many sessions, what was acquired in each?
- Any pre-scan training or behavioural sessions?

## Stimuli & paradigms
- What tasks/paradigms were run? Provide a task list if many.
- How were stimuli delivered (software, Python/PsychoPy version)?
- Are stimulus materials / protocols publicly available (link)?

## Sequence parameters (per modality acquired)
- For each sequence (T1w, T2w, BOLD, DWI, fieldmaps, ASL, qMT, …): resolution,
  TE/TR, flip angle, and any sequence-specific parameters (b-values/directions
  for DWI; phase-encoding directions; number of volumes).

## Spatial anchoring / preprocessing
- Template space and resolution data were resampled to (e.g. MNI152NLin2009cAsym)?
- Preprocessing pipeline and software (with versions)?
- Does the layout follow BIDS?

## Data Records pointers
- Expect placeholders `sub-XX`, `ses-YY`, `task-ZZZ`, phase-encoding `dir-{ap,pa}`
  — define them in a filename-code legend.
- Common formats: `.nii.gz`, `.tsv` (events/participants), `.json` (sidecars),
  `.bval`/`.bvec` (DWI). See `reference/file-formats.md`.
