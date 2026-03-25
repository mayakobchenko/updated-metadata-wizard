import { useState } from 'react'
import { Button, Modal, Result, Spin, Alert } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, 
         LoadingOutlined, CloudUploadOutlined } from '@ant-design/icons'

export default function PopoverSave({ downloadJson, uploadpythonKG, saveJsonToDrive }) {

  const [uploadStatus, setUploadStatus] = useState(null)
  // null | 'loading' | 'success' | 'error' | 'session_expired'
  const [errorMessage, setErrorMessage]   = useState('')
  const [modalVisible, setModalVisible]   = useState(false)

  const handleUpload = async () => {
    setUploadStatus('loading')
    setModalVisible(true)
    setErrorMessage('')

    try {
      const response = await uploadpythonKG()

      // uploadpythonKG should return the fetch response
      if (!response) {
        setUploadStatus('error')
        setErrorMessage('No response from server.')
        return
      }

      const data = await response.json()

      // session expired
      if (response.status === 401) {
        setUploadStatus('session_expired')
        setErrorMessage(data.message || 'Session expired. Please reload.')
        return
      }

      // other server error
      if (!response.ok || data.error) {
        setUploadStatus('error')
        setErrorMessage(data.error || data.message || 
                        `Server error: ${response.status}`)
        return
      }

      // success
      setUploadStatus('success')

    } catch (err) {
      setUploadStatus('error')
      setErrorMessage(err.message || 'Unknown error occurred.')
    }
  }

  const handleCloseModal = () => {
    if (uploadStatus !== 'loading') {
      setModalVisible(false)
      setUploadStatus(null)
      setErrorMessage('')
    }
  }

  const handleReload = () => {
    window.location.reload()
  }

  return (
    <>
      {/* ── upload button ── */}
      <Button
        type="primary"
        icon={<CloudUploadOutlined />}
        onClick={handleUpload}
        className="next-back-button"
        disabled={uploadStatus === 'loading'}>
        Upload to Knowledge Graph
      </Button>

      {/* ── download button ── */}
      <Button
        icon={<DownloadOutlined />}
        onClick={downloadJson}
        className="next-back-button">
        Download JSON
      </Button>

      {/* ── status modal ── */}
      <Modal
        open={modalVisible}
        onCancel={handleCloseModal}
        footer={null}
        closable={uploadStatus !== 'loading'}
        maskClosable={uploadStatus !== 'loading'}
        centered>

        {/* loading */}
        {uploadStatus === 'loading' && (
          <Result
            icon={<Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />}
            title="Uploading to Knowledge Graph..."
            subTitle="Please wait, this may take a moment."
          />
        )}

        {/* success */}
        {uploadStatus === 'success' && (
          <Result
            status="success"
            icon={<CheckCircleOutlined style={{ color: '#52c41a', fontSize: 48 }} />}
            title="Upload successful!"
            subTitle="Your metadata has been saved to the EBRAINS Knowledge Graph."
            extra={[
              <Button type="primary" key="close" onClick={handleCloseModal}>
                Close
              </Button>
            ]}
          />
        )}

        {/* error */}
        {uploadStatus === 'error' && (
          <Result
            status="error"
            icon={<CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 48 }} />}
            title="Upload failed"
            subTitle="There was a problem uploading to the Knowledge Graph."
            extra={[
              <Button type="primary" key="retry" onClick={handleUpload}>
                Try again
              </Button>,
              <Button key="close" onClick={handleCloseModal}>
                Close
              </Button>
            ]}>
            <Alert
              type="error"
              message="Error details"
              description={errorMessage}
              showIcon
            />
          </Result>
        )}

        {/* session expired */}
        {uploadStatus === 'session_expired' && (
          <Result
            status="warning"
            title="Session expired"
            subTitle="Your login session has expired. Please reload the page and log in again."
            extra={[
              <Button type="primary" key="reload" onClick={handleReload}>
                Reload page
              </Button>,
              <Button key="close" onClick={handleCloseModal}>
                Close
              </Button>
            ]}>
            <Alert
              type="warning"
              message="Your form data is not lost"
              description="Use the Download JSON button to save your work before reloading."
              showIcon
            />
          </Result>
        )}

      </Modal>
    </>
  )
}