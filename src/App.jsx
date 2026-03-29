import { useState } from 'react'
import { Button } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import './App.css'
import PrivacyBanner from './components/PrivacyBanner'
import Header from './components/Header'
import Footer from './components/Footer'
import StepsWizard from './components/StepsWizard'
import NewContextProvider from './components/context/NewContextProvider'
import LoginButton from './components/LoginButton'
import Greetings from './components/Greetings'

function App() {
  const [formData, setFormData] = useState({})
/*
  const downloadJson = () => {
    const json = JSON.stringify(formData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'metadata_wizard.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }*/

  const downloadJson = async () => {
    const payload = await mapDataset1OptionsToIds(formData)
    const json = JSON.stringify(payload, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'metadata_wizard.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  const mapDataset1OptionsToIds = async (formData) => {
    try {
      const res = await fetch('api/kginfo/datatypes')
      if (!res.ok) throw new Error(`Error fetching data types: ${res.status}`)
      const json = await res.json()
      const types = json.dataTypes || []
      const labelToId = new Map(types.map((t) => [t.name.toLowerCase(), t.identifier]))
      const labels = formData.dataset1?.optionsData || []
      console.log(labels)
      const mapped = labels.map((val) => {
          if (typeof val !== 'string') return val
          const id = labelToId.get(val.toLowerCase())
          return id || val 
        })
      return {
        ...formData, dataset1: {...(formData.dataset1 || {}), optionsData: mapped },
      }
    } catch (e) {
      console.error('Error mapping dataset1.optionsData to KG ids:', e)
      return formData
    }
    }
  
  return (
    <div className="body-wrapper">
      <Header/>
        <NewContextProvider>
          <div className="container-subheader">
            <div className="privacy-banner"><PrivacyBanner /></div>
            <div className="greetings"><Greetings/></div>
            <div className="login-container">
              <Button
                icon={<DownloadOutlined />}
                onClick={downloadJson}
                className="next-back-button">
                Download form data
              </Button>
              <div className="login-button"><LoginButton/></div>
            </div>
          </div>
          <div className='container-form'>
            <StepsWizard
              externalFormData={formData}
              onFormDataChange={setFormData}
            />
          </div>
        </NewContextProvider>
      <Footer />
    </div>
  )
}

export default App