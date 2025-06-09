import { useState } from 'react'
import { useAuthContext } from './context/AuthProviderContext'
import ProgressBar from './ProgressBar'
import ContributorsAntd from './Contributors_antd'
import Subjects from './Subjects'
import Introduction from './Introduction'
import WelcomeAlert from './WelcomeAlert'
import Dataset1 from './Dataset1'
import Dataset2 from './Dataset2'
import Funding from './Funding'
import Experiments from './Experiments'
//import { saveAs } from 'file-saver'
//npm install file-saver

const StepsWizard = () => {
  const [formData, setFormData] = useState({})
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const steps = [
    { id: 0, component: Intro },
    { id: 1, component: Dataset1 },
    { id: 2, component: Dataset2 },
    { id: 3, component: Funding },
    { id: 4, component: ContributorsAntd },
    { id: 5, component: Experiments },
    { id: 6, component: Subjects }]

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
      // Assuming formData is defined and contains your data
      const json = JSON.stringify(formData, null, 2); // Use JSON, not json
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'metadata_wizard.json';
      document.body.appendChild(a); // Append to body to work in Firefox
      a.click();
      document.body.removeChild(a); // Clean up
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
      <div className="buttons-save-next-back">
        {currentStepIndex > 0 && (
            <button onClick={prevStep} className="next-back-button">Back</button>)}
        <div className="spacer"></div> {/* Spacer for alignment */}
        {currentStepIndex < steps.length - 1 && (
            <button onClick={nextStep} className="next-back-button">Next</button>)}
        {currentStepIndex === steps.length - 1 && (
            <button onClick={downloadJson} className="next-back-button">Save</button>)}
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

export default StepsWizard