'use client'
import React, { useState } from 'react';
import { useFormContext } from '@/context/formContext.js';
import { useRouter } from 'next/navigation';

const Step1 = () => {
  const { formData, updateFormData, completeStep } = useFormContext();
  const [name, setName] = useState(formData.name || '');
  const router = useRouter();

  const handleNext = (e) => {
    e.preventDefault();
    updateFormData({ name });
    completeStep(1);
    router.push('/?step=2');
  };

  return (
    <form onSubmit={handleNext}>
      <label>
        Name:
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <button type="submit">Next</button>
    </form>
  );
};

export default Step1;
