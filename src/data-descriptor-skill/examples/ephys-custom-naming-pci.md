# Example: Electrophysiology — custom filename scheme (.smr)

> Source: `data-descriptor_b4eded3bb3c1.pdf`. Only the **Materials and Methods** and
> **Data Records** sections are reproduced here, as reference for the skill.
> Running headers and page numbers removed; text extracted from PDF (spacing may
> be imperfect).

---

## MATERIALS AND METHODS
Animals were treated in accordance with protocols approved by the Animal Ethics Committee
of the University of Barcelona, which comply with the European Union guidelines on the
protection of vertebrates used for experimentation (Directive 2010/63/EU of the European
Parliament and the Council of 22 September 2010).
in vivo dataset
Surgical procedures
C57BL/6malemicewereanesthetizedwithisoflurane.First,buprenorphinewasadministered
sub-cutaneously (0.1 mg/kg) just before the induction, and the animal was placed in the
inductioncage.Thelevelofisofluranewasincreasedslowlyduring10mintoavoidrespiratory
depression, up to a level of 2.5%. At that moment, mice were placed in the stereotaxic frame
withalevelofisofluraneof0 .5−1%duringthesurgery.Oncetheanimalwascompletelyfixed
in the stereotaxic apparatus, methylprednisolone (30 mg/kg) and mannitol (40 mg/kg) were
administered subcutaneously. The isoflurane level was adjusted during the recording session
to get different light and deep anesthesia states.
Electrophysiological recordings
Extracellular LFP activity was recorded from different motor and somatosensory cortical
areasthroughasuperficial32-channelsmulti-electrodearrayplacedinthecortexofthemice
left hemisphere (see Fig. 1). The signal was amplified by 100 and high-pass filtered above 0.1
Hz (Multichannel Systems, GmbH) and digitized at 5 kHz. In each anesthesia level, the first
500 s of spontaneous activity were recorded.
Electrical stimulation
For each level of anesthesia, following the spontaneous activity, the responses to stimulation
were recorded. Electrical stimulation was delivered to perturb the cortical network through
a bipolar electrode (210µm spacing between tips, FHC Inc., USA) by means of a constant
current isolated stimulator (DS3, Digitimer Ltd., UK) controlled by Spike2 software using a
CED Power 1401 interface (Cambridge Electronic Design, UK). In particular, 50 electrical
stimulation pulses (0.1Hz, 1ms, random delay of 0.5-1.5s) were applied with an intensity
current range of 80-150µA in the thalamus and 500-600µA in the cortex.
Thecurrentintensitywasadjustedineachexperimentalcasetoelicitstrongresponsesinthe
recorded area. Given the small dimensions of the mouse thalamic nuclei, smaller intensity
currents (ranging from 80 to 150 uA) were used when compared to the cortex (500-600 uA),
and selective stimulation was performed by aiming the electrode to a central zone of the
nucleus, and histologically verifying the electrode tip position after the experiments.
in vitro dataset
Slice preparation
Ferrets (4–10 months, either sex) were deeply anesthetized with isoflurane and sodium
pentobarbital (40mg/kg) before decapitation. The brain was quickly removed and placed in
an ice-cold sucrose solution containing the following: 213 mM sucrose, 2.5 mM KCl, 1 mM
NaH2PO4, 26 mm NaHCO3, 1 mm CaCl2, 3 mm MgSO4, and 10 mm glucose. Acute coronal
slices (400µm thick) of the occipital cortex containing visual cortical areas 17, 18, and 19
from both hemispheres were cut with a Microm HM 650V vibratome (Thermo Scientific).
Slices were placed in an interface-style recording chamber (Fine Science Tools) and superfused
with an equal mixture of the above-mentioned sucrose solution and artificial CSF (ACSF)
containing the following (in mM): NaCl,126; KCl, 2.5; MgSO4, 2; Na2HPO,1; CaCl2, 2; NaHCO3,
26; dextrose, 10; and was aerated with 95%O2,5%CO2 to a final pH of 7.4. Then, a modified
slicesolutionwasusedthroughouttherestoftheexperiment;ithadthesameioniccomposition
except for different levels of the following (in mM ): KCl, 4; MgSO,1; and CaCl2,1.78; Bath
temperature was maintained at 34 − 36◦C.
In addition to the SO condition, to achieve a desynchronization state that mimics the awake
state, we used the CCh (0.5 mM) and NE (50 mM) neuromodulators and we decreased the
temperature to 32°C and reduced calcium in the bath from 1–1.2 mM to 0.8–0.9 mM. For the
blockade of GABAA-Rs we used SR-95531 hydrobromide [gabazine (GBZ) 200 nM], obtained
from SigmaAldrich. We also progressively blocked slow inhibition (GABAB-Rs) by means of CGP
55845 (CGP 1 mM), obtained from Tocris Bioscience.
Electrophysiological recordings
Extracellular LFP recordings were obtained with flexible arrays of 16 electrodes arranged in
columns. The multielectrode array covered most of the area occupied by a cortical slice. It
consisted of six groups of electrodes positioned to record electrophysiological activity from
supra and infragranular layers (see Fig. 2). Signals were amplified by 100 using a PGA16
Multichannel System (Multichannel Systems MCS GmbH-Harvard Bioscience Inc). LFPs were
digitized with a Power 1401 or 1401 mkII CED interface (Cambridge Electronic Design) at a
samplingrateof5or10kHzandacquiredwithSpike2software(CambridgeElectronicDesign).
Electrical Stimulation
The stimulation electrode was placed in infragranular layers. Pulses had a duration of 0.1 ms,
an intensity of 150–200µA, and were applied every 10 s, with a random jitter from 0.5–1.5 s
to avoid activity entrainment to the specific frequency of stimulation.
The order of experiments was consistent for both the GBZ and CGP conditions. Within each
experiment, the recordings were performed in the following sequence: Stimulation of the
slice in a controlled Slow Oscillatory activity, stimulation of the desynchronized state after
the application of CCh and NE, and finally the stimulation of the GBZ- or CGP-induced state.
This sequence ensured a systematic exploration of the effects of GABAergic inhibition on
cortical complexity.
Careful attention was given to the preparation of the cortical slices to maintain the integrity
of the cortical tissue. The slicing process was conducted meticulously to maintain both the
structural and functional properties of the cortical tissue. The baseline activity, which
exhibited SOs, was recorded as the control activity, serving as a reference for subsequent
comparisons.
in vivoarray
MEA positioned in the brain Spike2 Port Number Spike2 Channel Label
Fig. 1. Multi-Electrode Array (MEA) positioned in the mouse brain together with the
stimulationelectrodetargetingthalamicnuclei(Left).Spatialdistributionofthechannels
in the MEA, with the Spike2 Port numbers (middle) and Spike 2 Channel Labels (right)

in vitroarray
MEA positioned in the slice Spike2 Port Number Spike2 Channel Label
Fig. 2. Multi-Electrode Array (MEA) positioned in the ferret brain slice targeting supra- and
infragranularcorticallayers(Left).SpatialdistributionofthechannelsintheMEA,withthe
Spike2 Port numbers (middle) and Spike 2 Channel Labels (right)

---

## DATA RECORDS
in vivo dataset
The files for each subject are named as follows:
If no stimulus was applied:
sub-X_stim-off_type-preAREAstim_anest_LEVEL.smr, where X is the subject identifier, AREA is
either cortical (cortex) or thalam (thalamus), and LEVEL belong to light or deep.
If a stimulus was applied:
sub-X_stim-AREA_dur-1ms_freq-01Hz_int-INTENSITY_anest_LEVEL.smr, where X is the subject
identifier, AREA is either cortex or thalamus, INTENSITY is the intensity of stimulation (in uA)
and LEVEL is light or deep. The duration of the stimulus was always at a frequency of 0.1Hz
and with a duration of 1ms.
in vitro dataset
The files for each subject are named as:
sub-X_stim-INTENSITY_CONDITION.smr, where X is the subject identifier, INTENSITY is the
intensity of the stimulation (in uA) and CONDITION can either be: control, cchNE (carbachol
+ Norepinephrine), CGP+concentration
/data
/in_vivo
/sub-01
/sub-01_stim-off_type-precorticalstim_anest-light.smr
/sub-01_stim-cortex_dur-1ms_freq-01Hz_int-600uA_anest-light.smr
/sub-01_stim-off_type-precorticalstim_anest-deep.smr
/sub-01_stim-cortex_dur-1ms_freq-01Hz_int-600uA_anest-deep.smr
/sub-01_stim-off_type-prethalamstim_anest-light.smr
/sub-01_stim-thalamus_dur-1ms_freq-01Hz_int-150uA_anest-light.smr
/sub-01_stim-off_type-prethalamstim_anest-deep.smr
/sub-01_stim-thalamus_dur-1ms_freq-01Hz_int-150uA_anest-deep.smr
/sub-02
/sub-02_stim-off_type-precorticalstim_anest_light.smr
/sub-02_stim-cortex_dur-1ms_freq-01Hz_int-500uA_anest-light.smr
/sub-02_stim-off_type-precorticalstim_anest_deep.smr
/sub-02_stim-cortex_dur-1ms_freq-01Hz_int-500uA_anest-deep.smr
/sub-02_stim-off_type-prethalamstim_anest_light.smr
/sub-02_stim-thalamus_dur-1ms_freq-01Hz_int-130uA_anest-light.smr
/sub-02_stim-off_type-prethalamstim_anest_deep.smr
/sub-02_stim-thalamus_dur-1ms_freq-01Hz_int-130uA_anest-deep.smr
/sub-03
/sub-03_stim-off_type-precorticalstim_anest-light.smr
/sub-03_stim-cortex_dur-1ms_freq-01Hz_int-500uA_anest-light.smr
/sub-03_stim-off_type-precorticalstim_anest-deep.smr
/sub-03_stim-cortex_dur-1ms_freq-01Hz_int-500uA_anest-deep.smr
/sub-03_stim-off_type-prethalamstim_anest-light.smr
/sub-03_stim-thalamus_dur-1ms_freq-01Hz_int-80uA_anest-light.smr
/sub-03_stim-off_type-prethalamstim_anest-deep.smr
/sub-03_stim-thalamus_dur-1ms_freq-01Hz_int-80uA_anest-deep.smr
/sub-04
/sub-04_stim-off_type-precorticalstim_anest-light.smr
/sub-04_stim-cortex_dur-1ms_freq-01Hz_int-600uA_anest-light.smr
/sub-04_stim-off_type-precorticalstim_anest-deep.smr
/sub-04_stim-cortex_dur-1ms_freq-01Hz_int-600uA_anest-deep.smr
/sub-04_stim-off_type-prethalamstim_anest-light.smr
/sub-04_stim-thalamus_dur-1ms_freq-01Hz_int-100uA_anest-light.smr
/sub-04_stim-off_type-prethalamstim_anest-deep.smr
/sub-04_stim-thalamus_dur-1ms_freq-01Hz_int-100uA_anest-deep.smr
/in_vitro
/CGP
/sub-05
/sub-05_stim-150uA_control.smr
/sub-05_stim-150uA_cchNE.smr
/sub-05_stim-150uA_CGP1uM_cchNE.smr
/sub-06
/sub-06_stim-150uA_control.smr
/sub-06_stim-200uA_cchNE.smr
/sub-06_stim-200uA_CGP1uM_cchNE.smr
/sub-07
/sub-07_stim-150uA_control.smr
/sub-07_stim-150uA_cchNE.smr
/sub-07_stim-150uA_CGP1uM_cchNE.smr
/sub-08
/sub-08_stim-150uA_control.smr
/sub-08_stim-150uA_cchNE.smr
/sub-08_stim-150uA_CGP500nM_cchNE.smr
/GBZ
/sub-09
/sub-09_stim-150uA_control.smr
/sub-09_stim-150uA_cchNE.smr
/sub-09_stim-150uA_GBZ500nM_cchNE.smr
/sub-10
/sub-10_stim-150uA_control.smr
/sub-10_stim-150uA_cchNE.smr
/sub-10_stim-150uA_GBZ200nM_cchNE.smr
/sub-11
/sub-11_stim-150uA_control.smr
/sub-11_stim-150uA_cchNE.smr
/sub-11_stim-150uA_GBZ200nM_cchNE.smr
Format Extension Software used / file specification
Spike2 Data File smr To read the file, the neo Python package can be
used
All channels can be extracted from the file and
converted to a Python object/dictionary to perform
the analysis.
In order to extract the exact times where
stimulation was applied, the stimulation channels in
the .smr files are labelled as “Stim” (which is the
port number 36) for the in vivo dataset and labelled
as “pulse” (port number 18) for the in vivo dataset
