import { React, useState } from 'react'
import { useAuthContext } from './context/AuthProviderContext'
import ProgressBar from './ProgressBar'
import ContributorsAntd from './Contributors_antd'
import Subjects from './Subjects'
import Introduction from './Introduction'
import * as uiSchemaModule from './Schemas/uiSchema.json'
export const uiSchema = uiSchemaModule.default

const StepsWizard = () => {

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
  const nextStep = () => {
    if (currentFormStep < steps.length - 1) {
        setCurrentFormStep(currentFormStep + 1);
    }
  };
  const prevStep = () => {
    if (currentFormStep > 0) {
        setCurrentFormStep(currentFormStep - 1);
    }
  };
  const initializeValidSteps = () => {
    return Array(steps.length).fill(false)
  }
  const CurrentStep = steps[currentFormStep].component;
  const validSteps = initializeValidSteps();

  const goToWizardStep = (nextWizardStep) => {
    if (typeof nextWizardStep === "number") {
      nextWizardStep = steps[nextWizardStep].id;
    }
    setCurrentFormStep(nextWizardStep);
  };
  
  return (
    <div>
      <div>
        <ProgressBar step={currentFormStep} status={validSteps} onChanged={goToWizardStep} />
      </div>
      <h2>Step {currentFormStep + 1}</h2>
        <CurrentStep />
      <div>
        <button disabled={currentFormStep === 0} onClick={prevStep}>Back</button>
        <button disabled={currentFormStep >= steps.length - 1} onClick={nextStep}>Next</button>
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
function Intro () {
  const userInfo = useAuthContext()
  return (
    <div>
        <h3>Step 1: Introduction</h3>
        <p>{userInfo.user ? `Welcome, ${userInfo.user.fullname}!` : 'Please log in'}</p>
        <Introduction/>
    </div>
  )}

export default StepsWizard
