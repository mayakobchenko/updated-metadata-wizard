# Domain variant: electrophysiology

Tailored Materials & Methods sub-questions for electrophysiology datasets
(intracranial/ECoG, LFP, EEG, in vitro/in vivo recordings). Use alongside the
core question bank in SKILL.md. Reference examples:
`examples/ephys-custom-naming-pci.md`, `examples/container-mat-decision.md`.

## Subjects / clinical information
- Human or animal? Counts and demographics.
- For patients: clinical indication, and that placement was driven by clinical
  need (not the study)?
- Ethics approval / informed consent?

## Electrodes & implantation
- Electrode type, manufacturer, channel count, geometry/spacing?
- Anatomical placement and how locations were determined (imaging, coregistration
  software)?

## Recording hardware
- Amplifier / acquisition system (model)?
- Sampling rate per file kind — field recordings and sweeps often differ, and the
  rate in the files is what is stated, not the acquisition setting?
- Reference scheme?

## Task / stimulation
- Behavioural task or stimulation protocol (paradigm, timing, intensities)?
- Stimulus delivery / task-control software (e.g. MATLAB + MonkeyLogic)?
- Synchronisation method (e.g. photodiode, TTL)?

## Pre-processing
- Filtering (line-noise removal, band-pass), artifact rejection, re-referencing?
- Software and versions (e.g. MATLAB R2020b, EEGLAB, FieldTrip)?
- What is shared — raw, or pre-processed (e.g. LFP)?

## Data Records pointers
- Recording mode (voltage clamp, current clamp), holding potential and cell type
  are stated as fields or columns, per recording, not as a sentence in a free-text
  description. Where files of one kind differ in mode, give the count on each side.
- Calibration a comparison depends on (access resistance, bridge balance) is either
  recorded per recording or stated as not recorded, so a reuser knows which
  comparisons the data supports.
- Recordings often use a rich custom filename scheme encoding subject /
  condition / stimulation parameters — define every token in a filename-code
  legend (see ephys example).
- If data is delivered in container files (`.mat`, `.set`/`.fdt`), document the
  internal variables/fields in a per-variable table.
- Common formats: `.smr` (Spike2), `.set`/`.fdt` (EEGLAB), `.eeg`/`.vhdr`
  (BrainVision), `.mat`, `.nwb`. See `reference/file-formats.md`.
