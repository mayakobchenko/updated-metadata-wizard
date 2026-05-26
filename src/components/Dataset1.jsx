import { useState, useEffect } from 'react'
import { Form as AntForm, Input, Checkbox, Select, DatePicker, Radio } from 'antd'
import { ExportOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Option }   = Select

export default function Dataset1({ form, onChange, data }) {
  const [license, setLicense]               = useState([])
  const [embargo, setEmbargo]               = useState(data.dataset1?.embargo || false)
  const [copyright, setCopyright]           = useState(data.dataset1?.copyright || '')
  const [copyrightHolder, setCopyrightHolder] = useState(data.dataset1?.copyrightHolder || 'Person')
  const [showOtherStandart, setShowOtherStandart] = useState(
    (data.dataset1?.dataStandart || []).includes('other(s)')
  )
  const currentYear = dayjs().year()

  // ── normalize a raw date string or dayjs object safely ───────────────────
  const toSafeDayjs = (val) => {
    if (!val) return null
    if (dayjs.isDayjs(val)) return val.isValid() ? val : null
    const d = dayjs(val)
    return d.isValid() ? d : null
  }

  const initialValues = {
    dataset1: {
      dataTitle:          data.dataset1?.dataTitle          || '',
      briefSummary:       data.dataset1?.briefSummary       || '',
      shortTitle:         data.dataset1?.shortTitle         || '',
      optionsData:        data.dataset1?.optionsData        || [],
      dataStandart:       data.dataset1?.dataStandart       || [],
      otherDataStandart:  data.dataset1?.otherDataStandart  || '',
      embargo:            data.dataset1?.embargo            ?? false,
      embargoReview:      data.dataset1?.embargoReview      || false,
      submitJournalName:  data.dataset1?.submitJournalName  || '',
      copyright:          data.dataset1?.copyright          || '',
      copyrightHolder:    data.dataset1?.copyrightHolder    || 'Person',
      copyrightFirstName: data.dataset1?.copyrightFirstName || '',
      copyrightLastName:  data.dataset1?.copyrightLastName  || '',
      copyrightOrganization: data.dataset1?.copyrightOrganization || '',
      copyrightYear:      toSafeDayjs(data.dataset1?.copyrightYear),
      license:            data.dataset1?.license            || '',
    }
  }

  // ── re-sync form when data changes from outside (e.g. JSON import) ────────
  useEffect(() => {
    form.setFieldsValue({
      dataset1: {
        ...data.dataset1,
        copyrightYear: toSafeDayjs(data.dataset1?.copyrightYear),
      }
    })
    // sync local state too
    setEmbargo(data.dataset1?.embargo || false)
    setCopyright(data.dataset1?.copyright || '')
    setCopyrightHolder(data.dataset1?.copyrightHolder || 'Person')
    setShowOtherStandart((data.dataset1?.dataStandart || []).includes('other(s)'))
  }, [data.dataset1])

  // ── fetch licenses ────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('api/kginfo/license')
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json() })
      .then(d => setLicense(d.license || []))
      .catch(e => console.error('Error fetching licenses:', e))
  }, [])

  const handleValuesChange = (changedValues, allValues) => {
    const d1 = changedValues['dataset1']
    if (d1?.embargo      !== undefined) setEmbargo(d1.embargo)
    if (d1?.copyright)                  setCopyright(d1.copyright)
    if (d1?.copyrightHolder)            setCopyrightHolder(d1.copyrightHolder)
    if (d1?.dataStandart !== undefined) setShowOtherStandart((d1.dataStandart || []).includes('other(s)'))
    onChange(allValues)
  }

  // ── options ───────────────────────────────────────────────────────────────
  const optionsData = [
    { label: 'Experimental data', value: 'Experimental data' },
    { label: 'Simulated data',    value: 'Simulated data'    },
    { label: 'Raw data',          value: 'Raw data'          },
    { label: 'Derived data',      value: 'Derived data'      },
  ]
  const dataStandartOptions = [
    { label: "No, I didn't use a standard", value: "No, I didn't use a standard" },
    { label: 'NIX',       value: 'NIX'       },
    { label: 'NWB',       value: 'NWB'       },
    { label: 'SONATA',    value: 'SONATA'    },
    { label: 'BIDS',      value: 'BIDS'      },
    { label: 'neuroML',   value: 'neuroML'   },
    { label: 'odML',      value: 'odML'      },
    { label: 'openMINDS', value: 'openMINDS' },
    { label: 'other(s)',  value: 'other(s)'  },
  ]
  const optionsYesNo = [
    { label: 'Yes', value: 'Yes' },
    { label: 'No',  value: 'No'  },
  ]
  const optionsCopyright = [
    { label: 'Person',       value: 'Person'       },
    { label: 'Organization', value: 'Organization' },
  ]

  return (
    <div>
      <div><p className="step-title">Dataset part 1</p></div>
      <AntForm
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onValuesChange={handleValuesChange}
      >
        <AntForm.Item
          label="Dataset title"
          name={['dataset1', 'dataTitle']}
          rules={[{ required: true, message: 'Please enter title of your dataset' }]}
          extra="Please provide a title for your dataset (max. 110 characters including spaces).
          Please choose a descriptive title, and avoid acronyms and abbreviations where possible."
        >
          <Input />
        </AntForm.Item>

        <AntForm.Item
          label="Short title"
          name={['dataset1', 'shortTitle']}
          extra="Enter a short name (alias) that could be used as a shortened title
          for visualization in cases where there is limited space for display (max 30 characters)."
          rules={[{ required: true, message: 'Please enter short title of your dataset' }]}
        >
          <Input />
        </AntForm.Item>

        <AntForm.Item
          label="Brief Summary"
          name={['dataset1', 'briefSummary']}
          extra="This is the data description that you provided earlier."
        >
          <TextArea
            autoSize={{ minRows: 3, maxRows: 10 }}
            style={{ resize: 'none' }}
            placeholder="Please enter a brief summary..."
            readOnly
          />
        </AntForm.Item>

        <AntForm.Item
          name={['dataset1', 'optionsData']}
          label="What type of data would you like to share (You can select multiple values)?"
          rules={[{ required: true, message: 'Please select at least one option!' }]}
          extra="Note: Raw data refers to data which has not been processed or analysed.
          Derived data refers to data which has been processed or analysed."
        >
          <Checkbox.Group options={optionsData} style={{ padding: '20px' }} />
        </AntForm.Item>

        <AntForm.Item
          name={['dataset1', 'embargo']}
          label="Embargo status:"
          extra="In case you wish to publish a scientific article before sharing
          the associated data through EBRAINS, you have the possibility to embargo
          your data for a certain period of time."
        >
          <Radio.Group
            onChange={e => {
              const val = e.target.value
              setEmbargo(val)
              form.setFieldsValue({ dataset1: { ...form.getFieldValue('dataset1'), embargo: val } })
            }}
          >
            <Radio style={{ padding: '20px' }} value={true}>Yes, embargo dataset</Radio>
            <Radio style={{ padding: '20px' }} value={false}>No, data can be freely available</Radio>
          </Radio.Group>
        </AntForm.Item>

        <AntForm.Item
          name={['dataset1', 'copyright']}
          label="Is this version of the dataset copyrighted?"
          rules={[{ required: true, message: 'Please select yes or no!' }]}
        >
          <Radio.Group onChange={(e) => setCopyright(e.target.value)}>
            {optionsYesNo.map(option => (
              <Radio key={option.value} value={option.value}>{option.label}</Radio>
            ))}
          </Radio.Group>
        </AntForm.Item>

        {copyright === 'Yes' && (
          <>
            <AntForm.Item
              label="Copyright Holder"
              name={['dataset1', 'copyrightHolder']}
              rules={[{ required: true, message: 'Please select legal entity!' }]}
              extra="Select the type of legal entity in possession of the copyright."
            >
              <Select
                style={{ minWidth: 240 }}
                onChange={(value) => setCopyrightHolder(value)}
              >
                {optionsCopyright.map(option => (
                  <Option key={option.value} value={option.value}>{option.label}</Option>
                ))}
              </Select>
            </AntForm.Item>

            {copyrightHolder === 'Person' && (
              <>
                <AntForm.Item
                  label="First Name"
                  name={['dataset1', 'copyrightFirstName']}
                  rules={[{ required: true, message: 'Please enter the first name!' }]}
                >
                  <Input placeholder="First Name..." />
                </AntForm.Item>
                <AntForm.Item
                  label="Last Name"
                  name={['dataset1', 'copyrightLastName']}
                  rules={[{ required: true, message: 'Please enter the last name!' }]}
                >
                  <Input placeholder="Last Name..." />
                </AntForm.Item>
              </>
            )}

            {copyrightHolder === 'Organization' && (
              <AntForm.Item
                label="Organization Name"
                name={['dataset1', 'copyrightOrganization']}
                rules={[{ required: true, message: 'Please enter the organization name!' }]}
              >
                <Input placeholder="Organization Name..." />
              </AntForm.Item>
            )}

            <AntForm.Item
              label="Copyright Year"
              name={['dataset1', 'copyrightYear']}
              rules={[{ required: true, message: 'Please select a copyright date!' }]}
            >
              <DatePicker
                picker="year"
                style={{ width: '10%' }}
                placeholder="Select copyright year"
                disabledDate={(date) => !date || date.year() > currentYear}
              />
            </AntForm.Item>
          </>
        )}

        <AntForm.Item
          label="License"
          name={['dataset1', 'license']}
          rules={[{ required: true, message: 'Please select license!' }]}
        >
          <Select
            style={{ minWidth: 240 }}
            showSearch
            filterOption={(input, option) =>
              option?.props?.children?.toLowerCase().includes(input.toLowerCase())
            }
          >
            {license
              .filter(o => o.shortName?.includes('CC-BY') || o.shortName?.includes('CC0'))
              .map(option => {
                const firstWebpage = Array.isArray(option.webpage) ? option.webpage[0] : option.webpage
                return (
                  <Option key={option.identifier} value={option.identifier}>
                    <span>{option.shortName} </span>
                    <span>{option.fullName}</span>
                    {firstWebpage && (
                      <> {' '}
                        <a href={firstWebpage} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}>
                          <ExportOutlined style={{ fontSize: 12 }} /> more info
                        </a>
                      </>
                    )}
                  </Option>
                )
              })
            }
          </Select>
        </AntForm.Item>

        <AntForm.Item
          name={['dataset1', 'dataStandart']}
          label="Data organization standard(s)"
          rules={[{ required: false }]}
          extra="Did your data organization follow any community standards such as BIDS or NWB?"
        >
          <Checkbox.Group
            options={dataStandartOptions}
            style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}
          />
        </AntForm.Item>

        {showOtherStandart && (
          <AntForm.Item
            label="Please specify other standard(s)"
            name={['dataset1', 'otherDataStandart']}
          >
            <Input placeholder="e.g. NIfTI, DICOM..." />
          </AntForm.Item>
        )}

      </AntForm>
    </div>
  )
}