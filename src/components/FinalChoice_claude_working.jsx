import { useState } from 'react'
import { Button, Modal, Result, Spin, Alert } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  CloudUploadOutlined,
  ShareAltOutlined
} from '@ant-design/icons'

export default function PopoverSave({ uploadpythonKG, saveJsonToDrive }) {

  const [uploadStatus, setUploadStatus]   = useState(null)
  const [driveStatus, setDriveStatus]     = useState(null)
  // null | 'loading' | 'success' | 'error' | 'session_expired'
  const [errorMessage, setErrorMessage]   = useState('')
  const [modalVisible, setModalVisible]   = useState(false)
  const [activeAction, setActiveAction]   = useState(null)
  // 'kg' | 'drive'

  // ── upload to KG ────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    setActiveAction('kg')
    setUploadStatus('loading')
    setModalVisible(true)
    setErrorMessage('')

    try {
      const response = await uploadpythonKG()

      if (!response) {
        setUploadStatus('error')
        setErrorMessage('No response from server.')
        return
      }

      const data = await response.json()

      if (response.status === 401) {
        setUploadStatus('session_expired')
        setErrorMessage(data.message || 'Session expired. Please reload.')
        return
      }

      if (!response.ok || data.error) {
        setUploadStatus('error')
        setErrorMessage(data.error || data.message ||
                        `Server error: ${response.status}`)
        return
      }

      setUploadStatus('success')

    } catch (err) {
      setUploadStatus('error')
      setErrorMessage(err.message || 'Unknown error occurred.')
    }
  }

  // ── share to Collab ──────────────────────────────────────────────────────────
  const handleShareToCollab = async () => {
    setActiveAction('drive')
    setDriveStatus('loading')
    setModalVisible(true)
    setErrorMessage('')

    try {
      const response = await saveJsonToDrive()

      if (!response) {
        setDriveStatus('error')
        setErrorMessage('No response from server.')
        return
      }

      const data = await response.json()

      if (response.status === 401) {
        setDriveStatus('session_expired')
        setErrorMessage(data.message || 'Session expired. Please reload.')
        return
      }

      if (!response.ok || data.error) {
        setDriveStatus('error')
        setErrorMessage(data.error || data.message ||
                        `Server error: ${response.status}`)
        return
      }

      setDriveStatus('success')

    } catch (err) {
      setDriveStatus('error')
      setErrorMessage(err.message || 'Unknown error occurred.')
    }
  }

  // ── derive current status for the modal ──────────────────────────────────────
  const currentStatus = activeAction === 'kg' ? uploadStatus : driveStatus

  const handleCloseModal = () => {
    if (currentStatus !== 'loading') {
      setModalVisible(false)
      setUploadStatus(null)
      setDriveStatus(null)
      setErrorMessage('')
      setActiveAction(null)
    }
  }

  const handleReload = () => {
    window.location.reload()
  }

  // ── modal titles and subtitles per action ─────────────────────────────────────
  const modalContent = {
    kg: {
      loadingTitle:   "Uploading to Knowledge Graph...",
      successTitle:   "Upload successful!",
      successSub:     "Your metadata has been saved to the EBRAINS Knowledge Graph.",
      errorTitle:     "Upload failed",
      errorSub:       "There was a problem uploading to the Knowledge Graph.",
    },
    drive: {
      loadingTitle:   "Sharing to Collab...",
      successTitle:   "Shared successfully!",
      successSub:     "Your JSON file has been saved to the EBRAINS Collab.",
      errorTitle:     "Share failed",
      errorSub:       "There was a problem sharing the file to the Collab.",
    }
  }

  const mc = modalContent[activeAction] || modalContent.kg

  return (
    <>
      {/* ── upload to KG button ── */}
      <Button
        type="primary"
        icon={<CloudUploadOutlined />}
        onClick={handleUpload}
        className="next-back-button"
        disabled={currentStatus === 'loading'}>
        Upload to Knowledge Graph
      </Button>

      {/* ── share to Collab button ── */}
      <Button
        icon={<ShareAltOutlined />}
        onClick={handleShareToCollab}
        className="next-back-button"
        disabled={currentStatus === 'loading'}>
        Share JSON to Collab
      </Button>

      {/* ── status modal ── */}
      <Modal
        open={modalVisible}
        onCancel={handleCloseModal}
        footer={null}
        closable={currentStatus !== 'loading'}
        maskClosable={currentStatus !== 'loading'}
        centered>

        {/* loading */}
        {currentStatus === 'loading' && (
          <Result
            icon={<Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />}
            title={mc.loadingTitle}
            subTitle="Please wait, this may take a moment."
          />
        )}

        {/* success */}
        {currentStatus === 'success' && (
          <Result
            status="success"
            icon={<CheckCircleOutlined style={{ color: '#52c41a', fontSize: 48 }} />}
            title={mc.successTitle}
            subTitle={mc.successSub}
            extra={[
              <Button type="primary" key="close" onClick={handleCloseModal}>
                Close
              </Button>
            ]}
          />
        )}

        {/* error */}
        {currentStatus === 'error' && (
          <Result
            status="error"
            icon={<CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 48 }} />}
            title={mc.errorTitle}
            subTitle={mc.errorSub}
            extra={[
              <Button
                type="primary"
                key="retry"
                onClick={activeAction === 'kg' ? handleUpload : handleShareToCollab}>
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
        {currentStatus === 'session_expired' && (
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
              description="Use the Download JSON button in the header to save your work before reloading."
              showIcon
            />
          </Result>
        )}

      </Modal>
    </>
  )
}