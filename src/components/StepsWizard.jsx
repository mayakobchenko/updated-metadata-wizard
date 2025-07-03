import { useState, useEffect } from 'react'
import { useAuthContext } from './context/AuthProviderContext'
import { useNettskjema } from "./context/useNettskjema"
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
  useNettskjema()
  const skjemaInfo = useAuthContext()
  const initialValues = {
    ticketNumber: skjemaInfo?.ticketNumber  || '',
    contactperson: {
      firstName: skjemaInfo?.nettskjemaInfo?.contactFirstName || '',
      familyName: skjemaInfo?.nettskjemaInfo?.contactSurname || '',
      email: skjemaInfo?.nettskjemaInfo?.contactEmail || ''},
    custodian: {
      firstName: skjemaInfo?.nettskjemaInfo?.custodionaFirstName || '',
      familyName: skjemaInfo?.nettskjemaInfo?.custodianSurname || '',
      email: skjemaInfo?.nettskjemaInfo?.custodianEmail || '',
      orcid: skjemaInfo?.nettskjemaInfo?.custodianORCID || ''}}
  
  //console.log('initial form values:',initialValues)

  const [formData, setFormData] = useState({})

  useEffect(() => {
    setFormData(initialValues)
  }, [skjemaInfo])

  //console.log('formData:',formData)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const steps = [
    { id: 0, component: Intro },
    { id: 1, component: Dataset1 },
    { id: 2, component: Dataset2 },
    { id: 3, component: Funding },
    { id: 4, component: ContributorsAntd },
    { id: 5, component: Experiments },
    { id: 6, component: Subjects }]

  const handleInputChange = (data) => {
    //console.log('Updated Form Data:', data)
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
      const json = JSON.stringify(formData, null, 2)
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
            In this form, you can describe key aspects of your dataset so that other researchers will be able to find,
            reuse and cite your work. While filling out this form, please remember to consider all data related 
            to the dataset that you wish to publish on EBRAINS. Some fields might be pre-filled from the curation request
            form that you had submited ealier. You can edit the fields or leave them unchanged and once you complete the form, metadata describing your dataset will be curated according to the   
            <a href="https://openminds-documentation.readthedocs.io/en/latest/" target="_blank" rel="noopener noreferrer"
            style={{ margin: '0 5px' }}>
               openMINDS standard.
            </a></p>
      <Introduction onChange={onChange} data={data}/>
      </div>
    )}
return (<WelcomeAlert/>)}

export default StepsWizard