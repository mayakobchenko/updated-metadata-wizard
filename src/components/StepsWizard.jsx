import React, { useState } from 'react';
import ProgressBar from './ProgressBar';

const StepsWizard = () => {

  const [currentFormStep, setCurrentFormStep] = useState(0);  
  const steps = [
    { id: 1, component: Introduction },
    { id: 2, component: Dataset1 },
    { id: 3, component: Dataset2 },
    { id: 4, component: Funding },
    { id: 5, component: Contributors },
    { id: 6, component: Experiments },
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

const Introduction = () => (
  <div>
    <h3>Step 1: Basic Information</h3>
  </div>
);

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

export default StepsWizard;
