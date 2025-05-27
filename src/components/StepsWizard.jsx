import { React, useState } from 'react'
import { useAuthDispatch, useAuthContext } from './context/AuthProviderContext'
import ProgressBar from './ProgressBar'
import ContributorsAntd from './Contributors_antd'
import Subjects from './Subjects'
import Introduction from './Introduction'
import WelcomeAlert from './WelcomeAlert'
//import MountingFlag from './MountingFlag'

const StepsWizard = () => {

  const [formData, setFormData] = useState({})
  const [currentFormStep, setCurrentFormStep] = useState(0);  
  const steps = [
    { id: 0, component: Intro },
    { id: 1, component: Dataset1 },
    { id: 2, component: Dataset2 },
    { id: 3, component: Funding },
    { id: 4, component: ContributorsAntd },
    { id: 5, component: Experiments },
    { id: 6, component: Subjects },
  ];
  const handleInputChange = (e) => {
    console.log('Event:', e); 
    if (!e || !e.target) {
        console.error('Event or event target is undefined');
        return; 
    }
    const { name, value } = e.target;
    setFormData((prev) => ({
        ...prev,
        [`id${currentFormStep}`]: {
            ...prev[`id${currentFormStep}`],
            [name]: value,
        }
    }))
    console.log('form data:', formData)
  }

  const nextStep = () => {
    if (currentFormStep < steps.length - 1) {
        setCurrentFormStep(currentFormStep + 1)}}
  const prevStep = () => {
    if (currentFormStep > 0) {
        setCurrentFormStep(currentFormStep - 1)}}
  const initializeValidSteps = () => {
    return Array(steps.length).fill(false)}
  const CurrentStep = steps[currentFormStep].component
  const validSteps = initializeValidSteps()

  const goToWizardStep = (nextWizardStep) => {
    if (typeof nextWizardStep === "number") {
      nextWizardStep = steps[nextWizardStep].id}
    setCurrentFormStep(nextWizardStep)}

  const saveToJson = () => {
    const json = JSON.stringify(formData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formData.json';
    a.click();
    URL.revokeObjectURL(url)}

  return (
    <div>
      <div>
        <ProgressBar step={currentFormStep} status={validSteps} onChanged={goToWizardStep} />
      </div>
        <CurrentStep onChange={handleInputChange}  data={formData[`step${currentFormStep}`]}/>
      <div>
        {currentFormStep > 0 && ( <button onClick={prevStep}>Back</button>)}
        {currentFormStep < steps.length - 1 && (<button onClick={nextStep}>Next</button>)}
        {currentFormStep === steps.length - 1 && (<button onClick={saveToJson}>Save</button>)}
      </div>
    </div>
  );
};

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

function Intro ({ onChange, data }) {
  const userInfo = useAuthContext()
  if (userInfo.user) {
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

export default StepsWizard

{/*<MountingFlag />*/}
