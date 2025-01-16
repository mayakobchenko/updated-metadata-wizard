'use client'
import React from 'react';
import { useState } from 'react';
import { useFormContext } from '@/context/formContext';
import { useRouter } from 'next/navigation';

const Step2 = () => {
  const { formData, updateFormData, completeStep } = useFormContext();
  const [email, setEmail] = useState(formData.email || '');
  const router = useRouter();

  const handleNext = (e) => {
    e.preventDefault();
    updateFormData({ email });
    completeStep(2);
    router.push('/?step=3');
  };

  const handleBack = () => {
    router.push('/?step=1');
  };

  return (
    <form onSubmit={handleNext}>
      <label>
        Email:
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <button type="button" onClick={handleBack}>Back</button>
      <button type="submit">Next</button>
    </form>
  );
};

export default Step2;
