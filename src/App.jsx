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