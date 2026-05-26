import { useState } from 'react'
import { Button, Modal, Tooltip } from 'antd'
import { DownloadOutlined, FilePdfOutlined, FileWordOutlined, FileTextOutlined } from '@ant-design/icons'
import './App.css'
import PrivacyBanner from './components/PrivacyBanner'
import Header from './components/Header'
import Footer from './components/Footer'
import StepsWizard from './components/StepsWizard'
import NewContextProvider from './components/context/NewContextProvider'
import LoginButton from './components/LoginButton'
import Greetings from './components/Greetings'
import { generateMetadataPdf }  from './components/generateMetadataPdf'
import { generateMetadataDocx } from './components/generateMetadataDocx'
import { generateMetadataTxt }  from './components/generateMetadataTxt'

function App() {
  const [formData, setFormData] = useState({})
  const [formatModalOpen, setFormatModalOpen] = useState(false)
  const [downloading, setDownloading]         = useState(null)  // 'pdf' | 'docx' | 'txt' | null
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
/*
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
*/
  const handleDownload = async (format) => {
  setDownloading(format)
  try {
    if (format === 'pdf')  await generateMetadataPdf(formData)
    if (format === 'docx') await generateMetadataDocx(formData)
    if (format === 'txt')  generateMetadataTxt(formData)
  } catch (err) {
    console.error(`${format} generation failed:`, err)
  } finally {
    setDownloading(null)
    setFormatModalOpen(false)
  }
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
            {/*
              <Button
                icon={<DownloadOutlined />}
                onClick={downloadJson}
                className="next-back-button">
                Download form data
              </Button> */}
            
          <>
            <Tooltip title="Download a summary of your metadata">
              <Button
                icon={<DownloadOutlined />}
                onClick={() => setFormatModalOpen(true)}
                className="next-back-button"
              >
                Download form data
              </Button>
            </Tooltip>

            <Modal
              open={formatModalOpen}
              title="Choose download format"
              onCancel={() => setFormatModalOpen(false)}
              footer={null}
              width={360}
            >
              <p style={{ color: '#555', fontSize: 13, marginBottom: 20 }}>
                Download a human-readable summary of your metadata with all
                controlled terms resolved to their full names.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Button
                  icon={<FilePdfOutlined style={{ color: '#e74c3c' }} />}
                  size="large"
                  block
                  loading={downloading === 'pdf'}
                  onClick={() => handleDownload('pdf')}
                >
                  PDF — formatted report
                </Button>
                <Button
                  icon={<FileWordOutlined style={{ color: '#2b579a' }} />}
                  size="large"
                  block
                  loading={downloading === 'docx'}
                  onClick={() => handleDownload('docx')}
                >
                  Word (.docx) — editable document
                </Button>
                <Button
                  icon={<FileTextOutlined style={{ color: '#27ae60' }} />}
                  size="large"
                  block
                  loading={downloading === 'txt'}
                  onClick={() => handleDownload('txt')}
                >
                  Plain text (.txt) — simple summary
                </Button>
              </div>
            </Modal>
          </>

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