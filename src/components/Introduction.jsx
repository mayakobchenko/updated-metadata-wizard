import { Form as AntForm, Input } from 'antd'

export default function Introduction({ form, onChange, data }) {
  const initialValues = {
    ticketNumber: data.ticketNumber || '',
    datasetVersionId: data.datasetVersionId || '',
    contactperson: {
      firstName: data.contactperson?.firstName || '',
      familyName: data.contactperson?.familyName || '',
      email: data.contactperson?.email || ''},
    custodian: {
      firstName: data.custodian?.firstName || '',
      familyName: data.custodian?.familyName || '',
      email: data.custodian?.email || '',
      orcid: data.custodian?.orcid || '',
      institution: data.custodian?.institution || ''},
    groupLeader: {
      name: data.groupLeader?.name || '',
      orcid: data.groupLeader?.orcid || ''}} 

  const handleValuesChange = (changedValues, allValues) => {
    //console.log('Changed Values:', changedValues)
    //console.log('All Values:', allValues)
    /*if (changedValues.isConfirmed !== undefined) {
      allValues.isConfirmed = changedValues.isConfirmed}*/
   onChange(allValues)}

  const checkEmail = (rule, value, callback) => {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (emailPattern.test(value)) {
      return callback()}
    callback('Price enter a valid email address')
  }
  
  const checkOrcid = (rule, value, callback) => {
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-[\dX]$/  
    const orcidUrlRegex = /^https:\/\/orcid\.org\/\d{4}-\d{4}-\d{4}-\d{4}$/
    if (orcidRegex.test(value) || orcidUrlRegex.test(value)) { return callback() }
    callback('Please provide the orchid number in this format: https://orcid.org/xxxx-xxxx-xxxx-xxxx')
  }

  return (
    <div>
      <div><p className="step-title">Contact person</p></div>
      <AntForm 
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onValuesChange={handleValuesChange}>
        <AntForm.Item
          label="Zammad ticket Number"
          name="ticketNumber"
          rules={[{ required: true, message: 'Please input your ticket number!' }]}>
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Dataset version uuid"
          name="datasetVersionId"
          rules={[{ required: false }]}>
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Contact person's first name"
          name={['contactperson', 'firstName']} 
          rules={[{ required: true, message: 'Please input your first name!' }]}>
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Contact person's family name"
          name={['contactperson', 'familyName']} 
          rules={[{ required: true, message: 'Please enter your family name!' }]}>
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Contact person's email"
          name={['contactperson', 'email']}
          rules={[
            { required: true, message: "Please enter contact person's E-mail!" },
            { validator: checkEmail }]}>
          <Input />
        </AntForm.Item>
        <div>
          <p className="step-title">Data custodian</p>
        </div>
        <AntForm.Item
          label="Data custodian's first name"
          name={['custodian', 'firstName']} 
          rules={[{ required: true, message: "Please enter custodian's first name!" }]}>
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Data custodian's family name"
          name={['custodian', 'familyName']} 
          rules={[{ required: true, message: "Please enter custodian's family name!" }]}>
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Data custodian's email"
          name={['custodian', 'email']} 
          rules={[
            { required: true, message: "Please enter data custodian's E-mail!" },
            { validator: checkEmail }]}>
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Institution Name"
          name={['custodian', 'institution']} 
          rules={[{ required: false}]}>
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Data custodian's ORCID"
          name={['custodian', 'orcid']} 
          placeholder="https://orcid.org/xxxx-xxxx-xxxx-xxxx"
          rules={[
            { validator: checkOrcid }]}>
          <Input/>
        </AntForm.Item>
        <AntForm.Item
          label="Group Leader / Principal Investigator"
          name={['groupLeader', 'name']} 
          rules={[{ required: true}]}>
          <Input />
        </AntForm.Item>
        <AntForm.Item
          label="Group Leader's ORCID"
          name={['groupLeader', 'orcid']} 
          rules={[{ required: false}]}>
          <Input />
        </AntForm.Item>
      </AntForm>
    </div>
  );
}
