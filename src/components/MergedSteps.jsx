import { useRef } from 'react'
import { Form as AntForm } from 'antd'
import { useAuthContext } from './context/NewContextProvider.jsx'
import LoadingSpinner from './LoadingSpinner.jsx'
import Dataset1 from './Dataset1.jsx'
import Dataset2 from './Dataset2.jsx'
import Introduction from './Introduction.jsx'
import Contributors from './Contributors.jsx'

// Pages made of several sections that share ONE form: each section hands its change handler to the page,
// the page calls all of them when a field changes.
function useSharedForm() {
  const handlers = useRef({})
  const register = (key) => (fn) => { handlers.current[key] = fn }
  const onValuesChange = (changed, all) => Object.values(handlers.current).forEach((h) => h?.(changed, all))
  return { register, onValuesChange }
}

// Step "Dataset": welcome text, the dataset questions (title, data type, licence ...), then the additional
// information (home page, support channels, related publications).
export function DatasetStep({ form, onChange, data }) {
  const userInfo = useAuthContext()
  const { register, onValuesChange } = useSharedForm()
  if (!userInfo?.user) return userInfo?.reloadWizard ? null : <LoadingSpinner />
  return (
    <div>
      <p className="step-title">Welcome to the EBRAINS Metadata Wizard!</p>
      <p>
        Thank you for choosing EBRAINS to share your research data. In this form, you can
        describe key aspects of your dataset so that other researchers will be able to find,
        reuse and cite your work. While filling out this form, please remember to consider
        all data related to the dataset that you wish to publish on EBRAINS. Some fields
        might be pre-filled from the curation request form that you had submitted earlier.
        You can edit the fields or leave them unchanged and once you complete the form,
        metadata describing your dataset will be curated according to the{' '}
        <a href="https://openminds-documentation.readthedocs.io/en/latest/"
          target="_blank" rel="noopener noreferrer">
          openMINDS standard.
        </a>
      </p>
      <AntForm form={form} layout="vertical" onValuesChange={onValuesChange}>
        <Dataset1 embedded register={register('dataset1')} form={form} onChange={onChange} data={data} />
        <Dataset2 embedded register={register('dataset2')} form={form} onChange={onChange} data={data} />
      </AntForm>
    </div>
  )
}

// Step "Contributors": contact person and data custodian (from the curation request), then the authors and
// other contributors.
export function ContributorsStep({ form, onChange, data, showErrors }) {
  const { register, onValuesChange } = useSharedForm()
  return (
    <div>
      <AntForm form={form} layout="vertical" onValuesChange={onValuesChange}>
        <Introduction embedded register={register('people')} form={form} onChange={onChange} data={data} />
        <Contributors embedded register={register('contributors')} form={form} onChange={onChange} data={data} showErrors={showErrors} />
      </AntForm>
    </div>
  )
}
