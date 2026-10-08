# Example: Container files — per-variable .mat tables

> Source: `data-descriptor_913a8cd21a6a.pdf`. Only the **Materials and Methods** and
> **Data Records** sections are reproduced here, as reference for the skill.
> Running headers and page numbers removed; text extracted from PDF (spacing may
> be imperfect).

---

## MATERIALS AND METHODS 
1.1 Experimental Setup 
Participants were naive as to the purpose of the study, and gave informed consent before participating. 
The study was approved by the local Clinical Research Ethics Committee (CEIm Ref. #2021/9743/I) and 
was conducted in accordance with relevant guidelines and regulations. Participants were paid a €10 
show-up fee. Participants performed the consequential decision-making task, designed to assess the 
role of consequence on decision-making while promoting prefrontal inhibitory control. Since 
 
 
 
consequence depends on a predictive evaluation of future contexts, we designed a task in which trials 
were grouped together into episodes (groups of one, two or three consecutive trials), establishing the 
horizon of consequence for the decision-making problem within that block of trials. 
 
Participants were situated in the laboratory room at the Facultat de Matemàtiques i Informàtica, 
Universitat de Barcelona, where the task was performed. The participants were seated in a chair, facing 
the experimental table, with their chest approximately 10cm from the table edge and their right arm 
resting on its surface. The table defined the plane where reaching movements were to be performed by 
sliding a light computer mouse (Logitech Inc). On the table, approximately 60cm away from the 
participant’s sitting position, we placed a vertically-oriented, 24” Acer G245HQ computer screen 
(1920x1080). This monitor was connected to an Intel i5 (3.20GHz, 64-bit OS, 8 GB RAM) portable 
computer that ran custom-made scripts, programmed in MATLAB with the help of the MonkeyLogic 
toolbox, to control task flow (NIMH MonkeyLogic, NIH, USA; https://monkeylogic.nimh.nih.gov). The 
screen was used to show the stimuli at each trial and the position of the mouse in real time. An Eyetribe 
oculometer (Oculus, Inc) to record eye movements and pupil sizes was placed under the screen, and 
aligned with the participant’s eyesight when looking at the screen. 
 
As part of the experiment, the participants had to respond by performing overt movements with their 
arm along the table plane while holding the computer mouse. Their movements were recorded with a 
Mouse (Logitech, Inc), sampled at 1 kHz, which we used to track hand position. Given that the monitor 
was placed upright on the table and movements were performed on the table plane (horizontally, 
approximately from the center of the table to the left or right target side), the plane of movement was 
perpendicular to that of the screen, where the stimuli and finger trajectories were presented. Data 
analyses were performed with custom-built MATLAB scripts (The Mathworks, Natick, MA), licensed to 
the Universitat de Barcelona. 
 
1.2 Consequential Decision-Making Task 
This section describes the consequential decision-making task, designed to assess the role of 
consequence on decision-making while promoting prefrontal inhibitory control. Since consequence 
depends on a predictive evaluation of future contexts, we designed a task in which trials were grouped 
together into episodes (groups of one, two or three consecutive trials), establishing the horizon of 
consequence for the decision-making problem within that block of trials. 
 
At the beginning of a session, participants were given instructions on how to perform the task. 
Specifically, using some sample trials, we demonstrated them how to select a stimulus by moving the 
mouse. Step by step we showed that a target appears in the center of the screen indicating the start of 
an episode. We told them that they had 4 seconds to move the cursor to the central cross. After moving 
the cursor to the central cross, two bars appear, one after the other, and once both appear 
together/simultaneously, they had 4 seconds to make their decision by moving the cursor over one of 
the two bars. At that point a yellow dot appears over the bar indicating their selection. After that, the 
central target appears again indicating the beginning of a new trial. After explaining how to technically 
execute the task, we focused on explaining the task goal. We showed them a schematic of the task, 
much like the one in Figure 1a illustrating the structure of trials and episodes. We told them that the 
goal is to get as much reward (water) as possible in each episode, and that for episodes with more than 
1 trial each, the choice in a trial may have an effect on what appears in the next trial in the same 
episode. We encouraged them to explore in order to try to figure out what that effect might be, while 
keeping in mind that their goal is always to maximize the total reward in each episode. Finally, we told 
 
 
 
them that they will be presented with a series of episodes in a row, each episode is independent, 
meaning that their decisions in one episode have no effect on subsequent ones. 
 
The number of trials per episode equals the horizon nH plus 1. In brief, within an episode, a decision in 
the initial trial influences the stimuli to be shown in the next trial(s) in a specific fashion, unbeknown to 
our participants. Although a reward value is gained by selecting one of the stimuli presented in each 
trial, the goal is not to gain the largest amount as possible per trial, but rather per episode. 
 
Each participant performed 100 episodes for each horizon nH = 0, 1, and 2. In the interest of comparing 
results, we have generated a list of stimuli for each nH and used it for all participants. To avoid fatigue 
and keep the participants focused, we divided the experiment into 6 blocks, to be performed on the 
same day, each consisting of approximately 100 trials. More specifically, there was 1 block of nH=0 with 
100 trials, 2 blocks of nH=1 each with 100 trials, and 3 blocks of nH=2 with two of them of 105 trials and 
one of 90. Finally, we have randomized the order in which participants performed the horizons. Figure 1 
in Cecchini et al. 2023 (reported below) visualizes the task set-up. 
 
 
Figure 1. Time-course of a typical horizon 1 episode of the consequential decision -making task. (a) The episode consists of two 
dependent trials. The first starts with the message “New Episode Starting” in the center -top of the screen, a circle surrounding a 
cross in the center (central target), and half full progress bar at the bottom of the screen. The progress bar indicates the current 
trial within the episode (for horizon 1, 50% during the first trial, 100% during the second trial). After holding for 500ms, the left or 
right (chosen at random) stimulus is shown, followed by its complementary stimulus 500ms later. Both stimuli are shown together 
500ms later which serves as the GO signal. At GO, the participant has to slide the mouse from the central target to the bar of their 
choosing. Once the selected target is reached, a yellow dot appears over that target. The second trial follows the same pattern as 
the first. See Methods for more details. (b): Construction scheme for the size of the stimuli in each episode. The first t rial within 
the episode consists of 2 stimuli of size M+d/2 and M -d/2. The second trial within the episode depends on the selection made in 
the previous trial. If the first selected stimulus is M-d/2 (following symbol “-” in the figure), then the second trial consists of stimuli 
with size M+G+d/2 and M+G -d/2, otherwise M-G+d/2 and M-G-d/2 (following symbol “+” in the figure). The cumulative reward 

 
 
 
value of the episode can therefore assume 4 distinct values (ordered from best to worst): 2M+G, 2M+G-d, 2M-G+d, and 2M-G. See 
Methods for more details on the values of M, G, d.

---

## DATA RECORDS 
The files of this dataset are .mat files (Matlab 2021). Each file refers to a single participant. 
 
/ repository-root 
∕ subj_0XX.mat [contains behavioral metrics and tasks details] 
∕ participants.tsv [contains biological sex and age range of participants] 
 
 
 Each file contains the following variables. 
 
Variable 
name 
Type Description Note 
allEvents 3x1 cell,  
each cell: #trials 
x 14 double 
Each cell refers to nH=0,1,2. Events are 
time stamps in ms and refer to:  
1. Beginning of trial 
2. Presentation of crosswire 
3. End of trial 
4. Presentation of first stimulus 
5. First stimulus disappears 
6. Presentation of second 
stimulus 
7. Second stimulus disappears 
8. Both stimuli appear 
9. No target selected 
10. One target selected 
11. Left target selected 
12. Right target selected 
13. Empty 
14. Empty 
  
block_withinH 3x1 cell, 
each cell: #trials 
x 1 double 
Each cell refers to nH=0,1,2. Order of 
execution of the block within the 
respective horizon. 
  
choice 3x1 cell, 
each cell: #trials 
x 1 double 
Each cell refers to nH=0,1,2. Choice 
(selection) made for that trial: 
-1: left 
0: no target 
1: right 
  
 
 
 
decision 3x1 cell, 
each cell: #trials 
x 1 double 
Each cell refers to nH=0,1,2. Decision 
made for that trial: 
0: smaller target 
1: bigger target 
  
eLp 3x1 cell, 
each cell: time 
points x #trials 
double 
Each cell refers to nH=0,1,2. Left pupil 
dilation in time. 
Only participants 
080-097 
eLx 3x1 cell, 
each cell: time 
points x #trials 
double 
Each cell refers to nH=0,1,2. Left eye 
oculometry x-position. 
Only participants 
080-097 
eLy 3x1 cell, 
each cell: time 
points x #trials 
double 
Each cell refers to nH=0,1,2. Left eye 
oculometry y-position.  
Only participants 
080-097 
eRp 3x1 cell, 
each cell: time 
points x #trials 
double 
Each cell refers to nH=0,1,2. Right pupil 
dilation in time. 
Only participants 
080-097 
err_trial 3x1 cell,  
each cell: #trials 
x 1 double 
Each cell refers to nH=0,1,2. If different 
from 0, it is an error trial.  
More info on the 
type of error can 
be found in the 
documentation 
of monkey logic 
(https://monkeyl
ogic.nimh.nih.gov
/docs.html). 
eRx 3x1 cell, 
each cell: time 
points x #trials 
double 
Each cell refers to nH=0,1,2. Right eye 
oculometry x-position. 
Only participants 
080-097 
eRy 3x1 cell, 
each cell: time 
points x #trials 
double 
Each cell refers to nH=0,1,2. Right eye 
oculometry y-position. 
Only participants 
080-097 
eTime 3x1 cell, 
each cell: time 
points x #trials 
double 
Each cell refers to nH=0,1,2. Time 
stamps in ms for the oculometry data. 
Only participants 
800-097 
eventsTime 3x1 cell, 
each cell: #trials 
x 5 double 
Each cell refers to nH=0,1,2. Events are 
time stamps in ms and refer to:  
1. Presentation of crosswire 
2. First stimulus disappears 
  
 
 
 
3. Second stimulus disappears 
4. Both stimuli appear 
5. One target selected 
eyesP 3x1 cell, 
each cell: time 
points x #trials 
double 
Each cell refers to nH=0,1,2. Mean eyes 
pupil dilation. 
Only participants 
080-097 
eyesX 3x1 cell, 
each cell: time 
points x #trials 
double 
Each cell refers to nH=0,1,2. Mean eyes 
oculometry x-position. 
Only participants 
080-097 
eyesY 3x1 cell, 
each cell: time 
points x #trials 
double 
Each cell refers to nH=0,1,2. Mean eyes 
oculometry y-position. 
Only participants 
080-097 
MT 3x1 cell,  
each cell: #trials 
x 1 double 
Each cell refers to nH=0,1,2. Movement 
time in ms. 
  
mvOff 3x1 cell,  
each cell: #trials 
x 1 double 
Each cell refers to nH=0,1,2. Time in ms 
of movement offset. 
  
mvOn 3x1 cell,  
each cell: #trials 
x 1 double 
Each cell refers to nH=0,1,2. Time in ms 
of movement onset. 
  
OrderTask 3x1 cell,  
each cell: #trials 
x 1 double 
Each cell refers to nH=0,1,2. Order of 
execution of the block. 
  
peakVel 3x1 cell,  
each cell: #trials 
x 1 double 
Each cell refers to nH=0,1,2. Peak 
velocity. 
  
Performance 3x1 cell,  
each cell: #trials 
x 1 double 
Each cell refers to nH=0,1,2. 
Performance of the episode.  
Only values for 
the last trial of 
the episode are 
meaningful. 
RT 3x1 cell,  
each cell: #trials 
x 1 double 
Each cell refers to nH=0,1,2. Reaction 
time in ms. 
  
Stimuli 3x1 cell,  
each cell: #trials 
x 2 double 
Each cell refers to nH=0,1,2. Size of the 
left and right stimuli. If 0 the bar is 
empty, if 1 it is full. 
  
tPeakVel 3x1 cell,  
each cell: #trials 
x 1 double 
Each cell refers to nH=0,1,2. Time in ms 
to peak velocity. 
  
 
 
 
TrialDiff 3x1 cell, each 
c3x1 cell,  
each cell: #trials 
x 1 double ell 
Each cell refers to nH=0,1,2. Difficulty 
to visually distinguish between stimuli. 
It is calculated as 
1-(difference 
between stimuli). 
y_cross 3x1 cell,  
each cell: #trials 
x 1 double 
Each cell refers to nH=0,1,2. Y-
coordinate when crossing the target 
area. Zero is the middle point.
