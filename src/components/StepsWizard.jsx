import { React, useState } from 'react';
import Form from '@rjsf/core';
import validator from '@rjsf/validator-ajv8'; 
import ProgressBar from './ProgressBar';
//import schematest from './source_schemas/schematest.json';
//import datasetPart1 from './source_schemas/datasetPart1.json';
import general from './source_schemas/general.json'
import { useAuthContext } from './context/AuthProviderContext';

const StepsWizard = () => {

  const [currentFormStep, setCurrentFormStep] = useState(0);  
  const steps = [
    { id: 0, component: Introduction },
    { id: 1, component: Dataset1 },
    { id: 2, component: Dataset2 },
    { id: 3, component: Funding },
    { id: 4, component: Contributors },
    { id: 5, component: Experiments },
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

const Contributors = () => (
<div>
    <h3>Step 5: Contributors</h3>
</div>
);  

const Experiments = () => (
    <div>
        <h3>Step 6: Experiments</h3>
    </div>
);

const Introduction = () => {
  const userInfo = useAuthContext();
  //console.log('user', userInfo.user)
  const userName = userInfo?.user?.fullname;
  const emailUser = userInfo?.user?.email;
  const handleSubmit = ({ formData }) => {
    console.log('Submit button pushed: ', formData);
  };
  const formData = userName
  ? {
    contactperson: { 
      firstName: userName,
      lastName: userName,
      email: emailUser
    },
    ticketNumber: "",
  } 
  : {
    contactperson: { 
      firstName: '',
      lastName: '',
      email: ''
    },
    ticketNumber: "",
  }    
  return (
    <Form 
      schema={general} 
      onSubmit={handleSubmit}
      validator={validator}
      formData={formData}
    >
    <div>
      <button type='submit'>Submit customised</button>
      <button type='button'>Cancel</button>
    </div>
    </Form>
  );
};  

export default StepsWizard;
