import React from 'react';
import Form from '@rjsf/core';
import validator from '@rjsf/validator-ajv8';
import * as wizardInviteForm from '../Schemas/wizardInviteForm.json';
import * as trackerUiSchema from '../Schemas/trackerUISchema.json';

const formSchema = wizardInviteForm.default || wizardInviteForm; 
const uiSchema = trackerUiSchema.default || trackerUiSchema;

const Tracker = () => {
  const [formData, setFormData] = React.useState({});  // Initialize with an empty object
  
  const handleSubmit = ({ formData }) => {
    console.log("Form submitted:", formData);
    // Place your submission logic here
  };

  return (
    <div style={{ maxWidth: '600px', margin: 'auto' }}>
      <h2>Tracker Form</h2>
      <Form
        schema={formSchema}
        uiSchema={uiSchema}
        formData={formData}
        onChange={(e) => setFormData(e.formData)}
        onSubmit={handleSubmit}
        validator={validator}
      />
    </div>
  );
};

export default Tracker;
