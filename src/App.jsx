import { useState, useRef } from 'react'
import './App.css'
import PrivacyBanner from './components/PrivacyBanner'
import Header from './components/Header'
import Footer from './components/Footer'
import DropdownMenu from './components/DropdownMenu'
import StepsWizard from './components/StepsWizard_old'
import NewContextProvider from './components/context/NewContextProvider'
import LoginButton from './components/LoginButton'
import Greetings from './components/Greetings'

function App() {
  const [formData, setFormData] = useState({})
  const uploadInputRef = useRef(null)

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

  // ── upload: read JSON file and populate formData ─────────────────────────
  const handleUpload = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result)
        setFormData(parsed)
      } catch (err) {
        console.error('Invalid JSON file:', err)
        alert('The selected file is not valid JSON. Please choose a valid metadata_wizard.json file.')
      }
    }
    reader.readAsText(file)
  }

  const handleMenuSelection = (selection) => {
    if (selection === 'Download form data as...') {
      downloadJson()
    } else if (selection === 'Upload form data') {
      uploadInputRef.current?.click()
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
              <div className='dropdown-menu'>
                <DropdownMenu handleMenuSelection={handleMenuSelection}/>
                {/* hidden file input for upload */}
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleUpload(e.target.files[0])
                      e.target.value = ''  // reset so same file can be re-uploaded
                    }
                  }}
                />
              </div>
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