import React from 'react';
import Form from '@rjsf/core';
import validator from '@rjsf/validator-ajv8'; 

const IntroductionForm = () => {
  const schematest = {
    title: 'Test form',
    type: 'object',
    properties: {
      name: {
        type: 'string',
      },
      age: {
        type: 'number',
      },
      institution: {
        type: 'string',
      },
    },
    required: ['name', 'age'],
  };

/* const handleSubmit = ({ formData }) => {
    console.log('Submit button pushed: ', formData);
  };   */

  return (
    <Form 
      schema={schematest} 
      formData={inputData} 
      validator={validator}
    />
  );
};

export default IntroductionForm;
//onSubmit={handleSubmit}
//onChange={(e) => setFormData(e.formData)} 