import React, { useState } from 'react';

const StepsWizard = () => {

  const [currentFormStep, setCurrentFormStep] = useState(0);  
  const steps = [
    { id: 1, component: Welcome },
    { id: 2, component: Dataset1 },
    { id: 3, component: Dataset2 },
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

  const CurrentStep = steps[currentFormStep].component;

  return (
    <div>
      <h2>Step {currentFormStep + 1}</h2>
      <CurrentStep />
      <div>
        <button disabled={currentFormStep === 0} onClick={prevStep}>Back</button>
        <button disabled={currentFormStep >= steps.length - 1} onClick={nextStep}>Next</button>
      </div>
    </div>
  );
};

const Welcome = () => (
  <div>
    <h3>Step 1: Basic Information</h3>
  </div>
);

const Dataset1 = () => (
  <div>
    <h3>Step 2: Additional Details</h3>
  </div>
);

const Dataset2 = () => (
  <div>
    <h3>Step 3: Confirmation</h3>
  </div>
);

export default StepsWizard;
