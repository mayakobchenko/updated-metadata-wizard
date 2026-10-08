# Example: Histology / microscopy — whole-brain IEG atlas

> Source: `data-descriptor_35b26b43655d.pdf`. Only the **Materials and Methods** and
> **Data Records** sections are reproduced here, as reference for the skill.
> Running headers and page numbers removed; text extracted from PDF (spacing may
> be imperfect).

---

## MATERIALS AND METHODS
Animals
For all experimental procedures male C57BL/6J mice obtained from Charles River were used (n=17).
Animals were delivered at 6-7 weeks of age and were used for behavioural testing after two weeks of
acclimatation. All animals were housed at 22-25° C on a 12 h light-dark cycle (light on 7AM) with water
and food ad libitum. Mice were housed in groups of 5 animals and were single housed 2 days before
sacrifice. All animals were handled according to protocols and ethical guidelines approved in the Italian
animal licence 911/2021-PR approved by the Italian ministry of health.
Behavioural procedures
Mice were handled 5 times (once per day for 5 days) and habituated to the behavioural room one day
prior to behavioural testing. Behavioural experiments were conducted in an isolated room in the
morning (between 8:00 to 12:00) and animals were randomly assigned to the different experimental
groups. The behavioural apparatus was cleaned between animals with a 70% ethanol solution.
Contextual fear conditioning (FC) consisted of a 3 min habituation to the conditioning chamber
(StartFear Combined system, PanLab, USA) followed by three 2s foot shocks (0.8 mA) with an interval of
28 s. After the shocks, animals were kept in the conditioning chamber for an additional 15 s. Animals
belonging to the novel context group (CTX) were subjected to an identical procedure but did not receive
electrical foot-shocks. Animals belonging to the “home cage” group (HC) were left undisturbed in the
home cage.
Immunofluorescence
Mice were sacrificed 90 min after the behavioural task. Mice were deeply anaesthetised with ketamine
and xylazine (100 mg/kg + 10 mg/kg, intraperitoneally). The brain was removed after transcardiac
perfusion (4.0% paraformaldehyde, 1X PBS, pH 7.4) and then postfixed overnight using ice-cold 4%
paraformaldehyde solution, after which they were put in sucrose solution for 3 days (30% sucrose, 1X
PBS, 4° C). Brains were subsequently frozen at -80°C and 40 um coronal sections were cut with a sliding
cryostat (Histo-line, MC 4000). Whole-brain sections were stored at -20 °C in antifreeze solution (sucrose
30%, ethylene glycol 15%, Na-azide 0.02%, PBS). Immunohistochemistry was performed on free floating
sections (1 in 5 whole brain series). First, sections were washed 3 times in PBS at RT (10 min each), and
subsequently incubated in blocking solution at room temperature (1% PBS, Triton 0.3% and bovine
serum albumin, 1%) for 90 minutes under constant shaking. Sections were then incubated in primary
antibody solution for two days at 4°C under constant shaking. Two separate immunohistochemistry
procedures were performed on parallel series for cFos-Arc and cFos-NPAS4 co-expression experiments.
The first contained a mixture of a rabbit anti-Arc antibody (1:1000, Synaptic System, #156 003) and
guinea pig anti-cFos antibody (1:1000, Synaptic System #226 008). The second contained a mixture of a
rabbit anti NPAS4 antibody (1:1000, Activity Signaling, #AS-AB18A-100) and guinea pig anti-cFos
antibody (1:1000, Synaptic System #226 008). Both were dissolved in PBS 1% and Tryton 0.1%. After a 20
min incubation at room temperature, sections were extensively washed in PBST and incubated with
Alexa conjugated secondary antibodies: Donkey anti-rabbit 647 (1:1000, Invitrogen, A31573) and Goat
anti-guinea pig 568 (1:500, Invitrogen, A11075) diluted in PBST 0.1 % at RT for 2 hours at room
temperature under constant shaking. Sections were then washed 3 times with PBS 1% and then
mounted on superfrost glass slides (ThermoScientific) with DAPI Fluoromount (Invitrogen #00-4959-52).
Images were acquired with a Zeiss Axioscan microscope Z1 equipped with a Hamamatsu Orca Flash 4
camera (2048x2048 pixels, 6.5 µm pixel size) with a 20x/0.8 Plan Apochromat objective. Resulting
image's pixel size is 0.325 µm.
Image analysis
Whole-brain datasets were first registered to the Allen Brain Atlas (adult mouse brain CCFv3) using
ABBA1. Slice positioning and angle correction were manually performed. For all sections, Atlas
alignments were first performed automatically concatenating affine and spline registrations and
subsequently manually refined using BigWarp to maximize precision. For this white matter landmarks
and DAPI densities were used. Atlas registration accuracy was checked by at least two independent
experimenters. All atlas annotations were imported into QuPath v0.5.1.2 Quantification of cFos, Arc and
NPAS4 was performed on 16-bit grey scale images using BraiAn extension for QuPath software. For each
quantified channel, the threshold for positive cell detection (QuPath watershed algorithm) was set at
the first peak of the intensity histogram derived from the corresponding image. Histograms were
previously smoothed using moving average (window size 15). This was performed to ensure consistent
cell detection outcomes on unevenly colour-distributed images. Other automatic segmentation
parameters were fine tuned for each IEG in order to minimise false negatives, at the expense of a higher
number of false positive detections that were excluded in a second step. This was achieved via QuPath
built-in random tree classifier for each IEG. Specifically, the classifiers were trained by an expert user
manually labelling all detections in randomly defined areas equally represented across HC, CTX and FC
groups. For Arc, due to its visible expression levels difference between cortical and subcortical areas, we
trained and applied two different classifiers (one for Isocortex, CTXsp, OLF, CA1, and one for the
remaining brain regions). For the RT, classifier corrections were not applied as no false positives
detections were present. For all three markers positive cell detection accuracy was verified by at least
two trained experts.
For co-localization analysis, we assessed whether cFos+ detections contained an Arc+ or NPAS4+
centroid.
Importantly, damaged or mis-aligned tissue portions were excluded from further analysis.
Finally, we calculated the number of positive cells for each brain region by summing detected cells
across all sections. The same was done with the associated structures' area in mm².

---

## DATA RECORDS
/repository-root
/cFos_Arc [contains data on the cFos-Arc double staining]
/braian_config.yml [metadata on the project used by python-braian for the whole-brain analysis]
/images
/XXX [contains image data from subject XXX]
/<brain_slide_YYY>.czi [scan of brain slide YYY from subject XXX containing from 1 to 8 brain sections]
/<brain_slide_YYY>pt1.czi [image of the labels brain slide YYY from subject XXX]
/<brain_slide_YYY>pt2.czi [image of the whole slide YYY from subject XXX containing from 1 to 8 brain sections]
/QuPath_projects
/BraiAn.yml [configuration file for QuPath image analysis with BraiAn extension]
/BraiAn_region_params.yml [region specific configuration file for QuPath image analysis with BraiAn extension]
/XXX_YYY_classifier.json [QuPath classifier of channel XXX (marker YYY) detections, used to delete the bad ones]
/XXX [QuPath project for subject XXX]
/project.qpproj [QuPath project file for animal XXX]
/project.qpproj.backup [QuPath project file for animal XXX]
/data [QuPath project for each brain section of animal XXX]
/X [QuPath data for each image/section X of animal XXX]
/ABBA-RoiSet-Adult Mouse Brain - Allen Brain Atlas V3p1.zip[roiset of Allen’s
CCFv3 region boundaries adapted to the section]
/ABBA-Transform-Adult Mouse Brain - Allen Brain Atlas V3p1.json[geometric
transformations and positioning of the section into Allen’s CCFv3]
/data.qpdata[serialized QuPath data of the section image]
/server.json[parameters used by QuPath to read the section image]
/summary.json[summary QuPath metadata of the section image]
/thumbnail.jpg[thumbnail used by QuPath to preview the section image]
/YYY-Ontology.json [ontology of the atlas to which XXX sections were aligned]
/abba
/*.abba [save state from ABBA from the atlas registration process]
/*_bdv_view.json[visualization settings of the sections of the associated .abba project]
/classifiers [folderusedbyQuPathtoinform about classificationsandeventualclassifiersusedintheproject]
/classes.json[information about the classifications used in the project]
/QuPath_output
/XXX [BraiAnoutputfromQuPathforsubjectXXX]
/results [contains cell counts for section and for each brain region of subject XXX]
/<brain_slide_YYY>.czi - Scene YY_regions.txt[resulting TSV data of image analysis that is defined in
‘BraiAn.yml’. Refers to brain slice YY from slide YYY]
/regions_to_exclude[contains the list of the brain regions to be excluded from further analysis with python-braian]
/<brain_slide_YYY>.czi - Scene YY_regions_to_exclude.txt[list of brain regions to be excluded
from further analysis with python-braian. Refers to brain slice YY from slide YYY]
/BraiAn_output
XXX_sum.csv [resulting CSV data of python-braian analysis that read each data XXX section data exported from QuPath]
/cFos_NPAS4[contains data on the cFos-NPAS4 double staining. The folder structure is the same as the above cFos_Arc]
Format Extension Software used / file specification
YAML Ain't Markup Language .yml self made.
BraiAn.yml: configuration file used by BraiAn extension
for QuPath to run the image analysis on each brain
project with the same parameters.
braian_conf.yml: configuration file used by python-
braian to perform the analysis of the data exported from
QuPath.
Carl Zeiss Image .czi generated by Zeiss Axioscan 7.
JavaScript Object Notation .json XXX_YYY_classifier.json:generatedbyQuPath.Itdefines
the the model and weights used to by QuPath to classify
detection.
YYY-Ontology.json: generated by ABBA. It defines the
structure ontology of the brain regions of the atlas to
which the brain section are aligned.
ZIP compressed file .abba generated by ABBA. It contains the save state of a brain
alignment to an atlas.
QuPath Project .qpproj generated by QuPath.
project.qpproj: the file of the defining the structure of a
QuPath project. It is associated with a data/ folder in the
same location.
Tab Separated Value .txt generated by BraiAn extension for QuPath.
<brain_slide_YYY>.czi - Scene YY_regions.txt: column
headers: Image Name, Name (acronym of the brain
region), Classification (acronym with hemisphere
distinction), Area um^2, Num Detections, Num AF568
(or Num AF594 if NPAS4 data), Num AF647, Num
AF568~AF647 (number of overlapping positive cells);
one row per brain region.
Text .txt generated by BraiAn extension for QuPath.
<brain_slide_YYY>.czi - Scene
YY_regions_to_exclude.txt: list of brain acronyms with
hemisphere distinction to exclude from further analysis,
sperated by new lines.
QuPath data .qpdata file generated by QuPath and saved using Java
serialization. Due to it’s structure it is not intended to be
read elsewhere other than with QuPath.
