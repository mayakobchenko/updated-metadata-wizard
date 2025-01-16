"use client";
import React, { createContext, useState, useContext } from 'react';

const FormContext = createContext();

export const useFormContext = () => useContext(FormContext);

export const FormProvider = ({ children }) => {
  const [formData, setFormData] = useState({});
  const [currentStep, setCurrentStep] = useState(1); // Manage the current step within the state

  const updateFormData = (data) => {
    setFormData((prevData) => ({ ...prevData, ...data }));
  };

  const completeStep = (step) => {
    setCurrentStep(step);
  };

  return (
    <FormContext.Provider value={{ formData, updateFormData, currentStep, completeStep }}>
      {children}
    </FormContext.Provider>
  );
};
