// Short, invented example texts shown behind the "?" next to a field, so data providers can see
// what a good answer looks like without cluttering the page. (Illustrative only: not real data.)
export const EXAMPLES = {
  summary: `This dataset contains resting-state functional MRI volumes acquired from 12 adult mice (6 males, 6 females) at 9.4 T under light anaesthesia. Each scan consists of 300 volumes with a repetition time of 1 s. The data were motion-corrected and registered to a common mouse brain template. The dataset can be used as a reference for resting-state brain activity in the adult mouse, for example to study functional connectivity between brain regions.`,
  methods: `All animal procedures were approved by [committee name, permit number] and followed [relevant guidelines].

Subjects and preparation: Twelve adult C57BL/6J mice (6 males, 6 females, 12 weeks old) were anaesthetised with isoflurane (induction 3%, maintenance 1.2%) and placed in an MRI-compatible cradle. Body temperature was kept at 36–37 °C.

Data acquisition: Images were acquired on a 9.4 T Bruker system with a gradient-echo EPI sequence (TR/TE = 1000/11 ms, flip angle 55°, 25 coronal slices, 300 repetitions).

Data processing: Images were converted to NIfTI with BrkRaw 0.3.3, motion-corrected with ANTs 2.4.0 and registered to the template with RABIES 0.5.1.`,
  software: `RABIES 0.5.1 (motion correction, registration)
ANTs 2.4.0 (image registration)
BrkRaw 0.3.3 (conversion to NIfTI)
Python (version unknown, custom analysis scripts)`,
  dataRecords: `The data are organised according to BIDS. Each subject folder contains one functional run per session. Motion parameters are provided as tables next to the images.`,
  tree: `/dataset-root
  /sub-01 [Directory for one subject]
    /func [Functional data]
      /sub-01_task-rest_bold.nii.gz [Preprocessed resting-state fMRI time series of subject 01]
      /sub-01_task-rest_motion.csv [Motion parameters of the same run]
  /sub-02 [Directory for the next subject; same layout as sub-01]`,
  usage: `The data are intended as a reference for resting-state activity of the adult mouse brain. Time series can be extracted from regions of the template to compute functional connectivity. The data should not be used to draw conclusions about awake animals or development, since all animals were adult and anaesthetised. The NIfTI files can be opened with common neuroimaging software such as ITK-SNAP, 3D Slicer, FSL, ANTs or AFNI.`,
}
