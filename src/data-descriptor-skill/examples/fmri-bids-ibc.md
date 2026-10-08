# Example: fMRI / BIDS — Individual Brain Charting

> Source: `data-descriptor_2241f46ee586.pdf`. Only the **Materials and Methods** and
> **Data Records** sections are reproduced here, as reference for the skill.
> Running headers and page numbers removed; text extracted from PDF (spacing may
> be imperfect).

---

## MATERIALSANDMETHODS
Subjects
Thisreleasefocussesonrawfunctionaldatafrom13paricipants.
Sub-02droppedoutbutisincludedinthedatasetforcompletenessbutonlyhaspartialacquisitions.
Dataforsubjectsub-01arealsoincomplete:ThissubjectdidnotcompletetheBiologicalMotiontask,
theCamCanandfbirnbatteries,northeFaceBody,NARPS,RewProc,Scene,VisualSearchtasks.
MRIEquipment
ThefMRIdatawereacquiredusinganMRIscannerSiemens3TMagnetomPrismafitalongwitha
SiemensHead/Neck64-channelcoil.BehavioralresponsesfortheRetinotopytaskswereobtainedwitha
MR-compatible,five-buttonergonomicpad(CurrentDesigns,Package932withPykaHHSC-1x5-N4)and
theMRI-environmentaudiosystemfortheRaiderstaskwassetwiththeMR-Confonpackage.
AllsessionswereconductedattheNeuroSpinplatformoftheCEAResearchInstitute,Saclay,France.
ExperimentalProcedure
Uponarrivaltotheresearchinstitute,participantswereinstructedabouttheexecutionandtimingof
thetasksreferringtotheupcomingsession.Particularly,behavioraltrainingsessionspriortotheMRI
sessionswereconductedfortheClipsandRetinotopytasks.
AllMRIsessionswerecomposedofseveralroundsdedicatedtooneortwotasks.Thestructureofthe
sessionsaccordingtotheMRImodalityemployedateveryroundsisdetailedin https://individual-brain-
charting.github.io/docs/.
Stimuli
Thestimuliofthetasksweredeliveredthroughcustom-madescriptsthatensuredafullyautomated
environmentandcomputer-controlledcollectionofthebehavioraldata.
AllprotocolsweresetunderPython2.7orPython3.7.
ThesematerialsareavailableinapublicGitHubrepositorydedicatedtothebehavioralprotocolsofthe
tasksfeaturingtheIBCdataset: https://github.com/individual-brain-charting/public_protocols(consult
SectionCodeAvailabilityforfurtherdetailsabouttherepository).
Aextensivedescritpionofthetasksperformedisprovidedin https://individual-brain-
charting.github.io/docs/.
ExperimentalParadigms
Materialsusedforstimuluspresentationhavebeenmadepubliclyavailable,togetherwithvideo
annotationsofthecorrespondingprotocols,on https://github.com/individual-brain-
charting/public_protocols.
Listoftheincludedtasks,wherethetasksthatarenewinthisversionreleasearehighlightedinbold:
Nameofthebattery Correspondingtasks
Archibattery ArchiEmotional,ArchiSocial,ArchiSpatial,
ArchiStandard
HCPbattery HcpEmotion,HcpGambling,
HcpLanguage,HcpMotor,HcpRelational,
HcpSocial,HcpWm
LyonBattery Moto,Lec1,Lec2,MVEB,MVIS,MCSE,Visu,Audi
StanfordBattery WardAndAllport,SelectiveStopSignal,StopSignal,
Stroop,Attention,TwoByTwo,ColumbiaCards,
Discount,DotPatterns
TasksdesignedatNeurospin MTTNS,MTTWE,RSVPLanguage,MathLanguage,
VSTM,Enumeration
Movieandnaturalisticstimuli Bang,ClipsTrn,ClipsVal,Raiders,RestingState,
GoodBadUgly
Retinotopy WedgeAnti,ExpRing,ContRing,
WedgeClock
CamCanbattery EmoMem,EmoReco,StopNogo,Catell,
FingerTapping,VSTMC
Fbirnbattery BreathHolding,Checkerboard,FingerTap,
ItemRecognition
TheoryofMind EmotionalPain,PainMovie,TheoryOfMind
Misc Audio,FaceBody,NARPS,RewProc,Scene ,Self,
SpatialNavigation,VisualSearch,
BiologicalMotion1,BiologicalMotion2
SpatialAnchoring:
ThespatialhavebeenresampledinMNIICBM152[2009c,nonlinear,asymmetric]withtheirnative
resolution(1mmforanatomicalMRI,1.5mmforfMRI).

---

## DATARECORDS
Thedataarestoredinthefollowingstructure(incl.infoonfilecontent):
where XXXX represents the subject id, YYY represents the session id, ZZZ represents the task id and CCC
represents the contrast id.
Repository-root/
data-descriptor_2241f46ee586.pdf [containsashortdescriptionofthedataset]
task-ZZZ_dir-{ap;pa}_{bold/sbref}.json [containstheacquisitionsparametersandtaskcharacterizationfortaskZZZ]
participants.tsv [Overviewofparticipants]
dataset_description.json[containsanoverviewofthedataset]
*_epi.json[containstheacquisitionsparametersforfunctionaldata]
dwi.json[containstheacquisitionsparametersfordiffusion-weighteddata]
.README[containsgeneralinformationaboutthedataset]
 sub-XX/
 ses-YY/
 anat/[Structuralimaging,recorded inses-00,anatomicalacquisitionmayhavebeenrepetedinothersessions]
o sub-XX_ses-00_acq-spc_T2w.nii.gz
o sub-XX_ses-00_FLAIR.nii.gz
o sub-XX_ses-00_T1w.nii.gz
 dwi/[Diffusionweightedimages,recordedonlyinses-00]
o sub-XX-ses-00_dwi.bval
o sub-XX-ses-00_dwi.bvec
o sub-XX-ses-00_dwi.nii.gz
 func/[TaskbasedfunctionalMRI]
o sub-XX_ses-YY_task-ZZZ_dir-{pa;ap}_bold.nii.gz
o sub-XX_ses-YY_task-ZZZ_dir-{pa;ap}_events.tsv
o sub-XX_ses-YY_task-ZZZ_dir-{pa;ap}_sbref.nii.gz
 fmap/[Fieldinhomogeneitymappingdata]
o sub-XX_ses-YY_dir-{pa;ap}_epi.nii.gz
Format Extension Softwareused/filespecification
PortableDocument
Format
pdf data-descriptor_2241f46ee586.pdf:EBRAINSdata
descriptor
Bval bval sub-XX-ses-00_dwi.bval:containesB-values
associatedwithdiffusion-weightedimages.Partof
theBIDSspecification
Bvec bvec sub-XX-ses-00_dwi.bvec:containesB-vectors
associatedwithdiffusion-weightedimages.Partof
theBIDSspecification
Comma-Separated
Value
tsv selfmade
participants.tsv:partoftheBIDSdatasetdescription
scheme.columns={participant_id;age;sex;
handednessscore}participantsdescriptor
*events.tsv:columns={onset;duration;trial_type}
BIDS-compatiblecognitiveprotocoldescriptor
JavaScriptObject
Notation
json dataset_description.json:partoftheBIDSdataset
descriptionscheme.Genericdatasetdescription
task-ZZZ_dir-{ap;pa}_{bold/sbref}.json:partofthe
BIDSdatasetdescriptionscheme.
“pa”standsfor“posterior-anterior”phaseencoding
direction
“ap” standsfor“anterior-posterior”phaseencoding
direction
keys:path,subject,modality,image_type,
map_type,study,task,analysis_level,
number_of_subjects,tags,
cognitive_paradigm_cogatlas,
cognitive_paradigm_description_url,
contrast_definition
GzippedNifti1Image .nii.gz sub-XXX_ses-YYY_task-ZZZ_dir-{pa;ap}_space-
MNI152NLin2009cAsym_desc-preproc_bold.nii.gz
“pa”standsfor“posterior-anterior”phaseencoding
direction
“ap” standsfor“anterior-posterior”phaseencoding
direction
