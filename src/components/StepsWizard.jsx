import { React, useState } from 'react'
import { useAuthContext } from './context/AuthProviderContext'
import ProgressBar from './ProgressBar'
import ContributorsAntd from './Contributors_antd'
import Subjects from './Subjects'
import Introduction from './Introduction'
import WelcomeAlert from './WelcomeAlert'
//import MountingFlag from './MountingFlag'
//import { saveAs } from 'file-saver'
//npm install file-saver

const StepsWizard = () => {
  const [formData, setFormData] = useState({
    contactperson: {
      firstName: '',
      familyName: '',
      email: '',
    },
    ticketNumber: '',
    dataset: {
      // Define fields related to dataset steps here
    },
    funding: {
      // Fields for the funding step
    },
    contributors: {
      contributorId: '', // For selected contributors
      firstName: '',     // Additional fields for new contributors
      lastName: '',
    },
  });
  //const [currentFormStep, setCurrentFormStep] = useState(0);  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const steps = [
    { id: 0, component: Intro },
    { id: 1, component: Dataset1 },
    { id: 2, component: Dataset2 },
    { id: 3, component: Funding },
    { id: 4, component: ContributorsAntd },
    { id: 5, component: Experiments },
    { id: 6, component: Subjects },
  ];

  const handleInputChange = (data) => {
    console.log('Updated Form Data:', data)
    setFormData((prev) => ({ ...prev, ...data }))}

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1)}}
  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1)}}

  const CurrentStep = steps[currentStepIndex].component
      
  const initializeValidSteps = () => {
    return Array(steps.length).fill(false)}
  const validSteps = initializeValidSteps()
  const goToWizardStep = (nextWizardStep) => {
    if (typeof nextWizardStep === "number") {
      nextWizardStep = steps[nextWizardStep].id}
    setCurrentStepIndex(nextWizardStep)}

  const downloadJson = () => {
    const json = JSON.stringify(formData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'metadata.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  const saveToJson = () => {
    const json = JSON.stringify(formData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    saveAs(blob, 'formData.json'); // Use 'file-saver' to save the JSON file
  }

  return (
    <div>
      <div>
        <ProgressBar step={currentStepIndex} status={validSteps} onChanged={goToWizardStep} />
      </div>
        <CurrentStep onChange={handleInputChange}  data={formData}/>
      <div>
        {currentStepIndex > 0 && ( <button onClick={prevStep}>Back</button>)}
        {currentStepIndex < steps.length - 1 && (<button onClick={nextStep}>Next</button>)}
        {currentStepIndex === steps.length - 1 && (<button onClick={downloadJson}>Save</button>)}
      </div>
    </div>
  );
};

function Intro ({ onChange, data }) {
  const userInfo = useAuthContext()
  if (userInfo?.user) {
    return (
      <div>
          <p className="step-title">Welcome to the EBRAINS Metadata Wizard!</p>
          <p>Thank you for choosing EBRAINS to share your research data. 
            While filling out this form, please remember to consider all data related 
            to the dataset that you wish to publish on EBRAINS. Once you complete the form, 
            metadata describing your dataset will be curated according to the openMINDS standard.</p>
      <Introduction onChange={onChange} data={data}/>
      </div>
    )}
return (<WelcomeAlert/>)}

const Dataset1 = () => (
  <div>
    <h3>Step 2: Dataset part 1</h3>
  </div>
);

const Dataset2 = () => (
  <div>
    <h3>Step 3: Dataset part 2</h3>
  </div>
);

const Funding = () => (
    <div>
      <h3>Step 4: Funding</h3>
    </div>
  );

const Experiments = () => (
    <div>
        <h3>Step 6: Experiments</h3>
    </div>
);

export default StepsWizard

{/*<MountingFlag />*/}
//https://react-hook-form.com/docs/useform/getvalues