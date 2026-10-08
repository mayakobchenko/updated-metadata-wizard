// Loads the EBRAINS "data-descriptor-generator" skill (maintained by the data
// curation team; see src/data-descriptor-skill/) as raw text, so the prompt the
// wizard builds always contains the CURRENT skill text — to update the skill,
// replace the files in src/data-descriptor-skill/ and re-zip it to
// public/data-descriptor-generator.zip (the file offered for download).
//
// `?raw` is Vite's way of importing a file's contents as a string.
import skillMd from '../data-descriptor-skill/SKILL.md?raw'
import template from '../data-descriptor-skill/template.md?raw'
import dataRecordsGuide from '../data-descriptor-skill/reference/data-records-guide.md?raw'
import fileFormats from '../data-descriptor-skill/reference/file-formats.md?raw'
import fmri from '../data-descriptor-skill/domains/fmri.md?raw'
import histology from '../data-descriptor-skill/domains/histology.md?raw'
import electrophysiology from '../data-descriptor-skill/domains/electrophysiology.md?raw'

export const SKILL_TEXTS = {
  skillMd,
  template,
  dataRecordsGuide,
  fileFormats,
  domains: { fmri, histology, electrophysiology },
}

export const SKILL_ZIP_URL = '/data-descriptor-generator.zip'
