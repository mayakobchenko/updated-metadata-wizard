import React from 'react';
import Form from '@rjsf/core';

const schema = {
  title: "Intro Data",
  type: "object",
  properties: {
    name: { type: "string", title: "Name" },
  },
};

const uiSchema = {
  name: {
    "ui:placeholder": "Enter your name",
  },
};

const IntroForm = () => {
  // Add console logs
  console.log("Rendering IntroForm");
  
  try {
    return (
      <Form
        schema={schema}
        uiSchema={uiSchema}
        onSubmit={(data) => console.log("Form data:", data)}
      />
    );
  } catch (error) {
    console.error("Error rendering Form component:", error); // Log error message
    return <div>There was an error rendering the form.</div>; // Fallback UI
  }
};

export default IntroForm;
