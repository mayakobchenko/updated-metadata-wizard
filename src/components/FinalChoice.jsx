import { useState } from 'react'
import { Button, Modal, Result, Spin, Alert, Input, Form } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  CloudUploadOutlined,
  ShareAltOutlined,
  SaveOutlined
} from '@ant-design/icons'

const LABEL_STYLE = { fontSize: 12, color: '#666' }

export default function PopoverSave({ uploadpythonKG, saveJsonToDrive, saveJsonToZammad }) {

  const [uploadStatus, setUploadStatus] = useState(null)
  const [driveStatus,  setDriveStatus]  = useState(null)
  const [zammadStatus, setZammadStatus] = useState(null)
  // null | 'loading' | 'success' | 'error' | 'session_expired'

  const [errorMessage,  setErrorMessage]  = useState('')
  const [modalVisible,  setModalVisible]  = useState(false)
  const [activeAction,  setActiveAction]  = useState(null)
  // 'kg' | 'drive' | 'zammad' | 'kg_and_zammad'

  const [ticketId, setTicketId] = useState('')
  const [zammadResult, setZammadResult] = useState(null)  // { articleId, filename }

  // ── upload to KG only ────────────────────────────────────────────────────────
  const handleUpload = async () => {
    setActiveAction('kg')
    setUploadStatus('loading')
    setModalVisible(true)
    setErrorMessage('')

    try {
      const response = await uploadpythonKG()
      if (!response) { setUploadStatus('error'); setErrorMessage('No response from server.'); return }
      const data = await response.json()
      if (response.status === 401) { setUploadStatus('session_expired'); setErrorMessage(data.message || 'Session expired.'); return }
      if (!response.ok || data.error) { setUploadStatus('error'); setErrorMessage(data.error || data.message || `Server error: ${response.status}`); return }
      setUploadStatus('success')
    } catch (err) {
      setUploadStatus('error')
      setErrorMessage(err.message || 'Unknown error occurred.')
    }
  }

  // ── upload to KG + save JSON to Zammad ticket ─────────────────────────────────
  const handleUploadAndZammad = async () => {
    if (!ticketId.trim()) {
      setErrorMessage('Please enter a Zammad ticket ID before submitting.')
      return
    }

    setActiveAction('kg_and_zammad')
    setUploadStatus('loading')
    setZammadStatus(null)
    setZammadResult(null)
    setModalVisible(true)
    setErrorMessage('')

    // step 1 — KG upload
    try {
      const kgResponse = await uploadpythonKG()
      if (!kgResponse) { setUploadStatus('error'); setErrorMessage('No response from KG upload.'); return }
      const kgData = await kgResponse.json()
      if (kgResponse.status === 401) { setUploadStatus('session_expired'); setErrorMessage(kgData.message || 'Session expired.'); return }
      if (!kgResponse.ok || kgData.error) { setUploadStatus('error'); setErrorMessage(kgData.error || kgData.message || `KG error: ${kgResponse.status}`); return }
      setUploadStatus('success')
    } catch (err) {
      setUploadStatus('error')
      setErrorMessage(`KG upload failed: ${err.message}`)
      return
    }

    // step 2 — save JSON to Zammad (only if KG succeeded)
    setZammadStatus('loading')
    try {
      const zResponse = await saveJsonToZammad(ticketId.trim())
      if (!zResponse) { setZammadStatus('error'); setErrorMessage('No response from Zammad.'); return }
      const zData = await zResponse.json()
      if (!zResponse.ok || zData.error) {
        setZammadStatus('error')
        setErrorMessage(zData.error || `Zammad error: ${zResponse.status}`)
        return
      }
      setZammadStatus('success')
      setZammadResult({ articleId: zData.articleId, filename: zData.filename })
    } catch (err) {
      setZammadStatus('error')
      setErrorMessage(`Zammad save failed: ${err.message}`)
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
      if (!response) { setDriveStatus('error'); setErrorMessage('No response from server.'); return }
      const data = await response.json()
      if (response.status === 401) { setDriveStatus('session_expired'); setErrorMessage(data.message || 'Session expired.'); return }
      if (!response.ok || data.error) { setDriveStatus('error'); setErrorMessage(data.error || data.message || `Server error: ${response.status}`); return }
      setDriveStatus('success')
    } catch (err) {
      setDriveStatus('error')
      setErrorMessage(err.message || 'Unknown error occurred.')
    }
  }

  // ── derive current status for modal ──────────────────────────────────────────
  const currentStatus = (() => {
    if (activeAction === 'kg')            return uploadStatus
    if (activeAction === 'drive')         return driveStatus
    if (activeAction === 'kg_and_zammad') {
      // overall status: show loading until both done, then error if either failed
      if (uploadStatus === 'loading' || zammadStatus === 'loading') return 'loading'
      if (uploadStatus === 'error'   || zammadStatus === 'error')   return 'error'
      if (uploadStatus === 'session_expired')                        return 'session_expired'
      if (uploadStatus === 'success' && zammadStatus === 'success') return 'success'
      if (uploadStatus === 'success' && zammadStatus === null)       return 'loading'
      return uploadStatus
    }
    return null
  })()

  const handleCloseModal = () => {
    if (currentStatus !== 'loading') {
      setModalVisible(false)
      setUploadStatus(null)
      setDriveStatus(null)
      setZammadStatus(null)
      setZammadResult(null)
      setErrorMessage('')
      setActiveAction(null)
    }
  }

  const handleReload = () => window.location.reload()

  // ── modal content strings ─────────────────────────────────────────────────────
  const loadingTitle = (() => {
    if (activeAction === 'kg_and_zammad') {
      if (uploadStatus === 'loading') return 'Uploading to Knowledge Graph...'
      if (zammadStatus === 'loading') return 'Saving JSON to Zammad ticket...'
    }
    if (activeAction === 'drive')     return 'Sharing to Collab...'
    return 'Uploading to Knowledge Graph...'
  })()

  return (
    <>
      {/* ── ticket ID input ── */}
      <div style={{ marginBottom: 12 }}>
        <Form.Item
          label={<span style={LABEL_STYLE}>Zammad ticket ID (for full submit)</span>}
          style={{ marginBottom: 4 }}
        >
          <Input
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            placeholder="e.g. 4824171"
            style={{ width: 220 }}
            size="small"
          />
        </Form.Item>
        {errorMessage && !modalVisible && (
          <Alert type="warning" message={errorMessage} showIcon style={{ marginTop: 4 }} />
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>

        {/* ── full submit: KG + Zammad ── */}
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleUploadAndZammad}
          disabled={currentStatus === 'loading' || !ticketId.trim()}
          title={!ticketId.trim() ? 'Enter a ticket ID to enable full submit' : ''}
        >
          Submit (KG + save to ticket)
        </Button>

        {/* ── KG only ── */}
        <Button
          icon={<CloudUploadOutlined />}
          onClick={handleUpload}
          disabled={currentStatus === 'loading'}
        >
          Upload to KG only
        </Button>

        {/* ── Collab ── */}
        <Button
          icon={<ShareAltOutlined />}
          onClick={handleShareToCollab}
          disabled={currentStatus === 'loading'}
        >
          Share JSON to Collab
        </Button>

      </div>

      {/* ── status modal ── */}
      <Modal
        open={modalVisible}
        onCancel={handleCloseModal}
        footer={null}
        closable={currentStatus !== 'loading'}
        maskClosable={currentStatus !== 'loading'}
        centered
      >

        {/* loading */}
        {currentStatus === 'loading' && (
          <Result
            icon={<Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />}
            title={loadingTitle}
            subTitle="Please wait, this may take a moment."
          />
        )}

        {/* success */}
        {currentStatus === 'success' && (
          <Result
            status="success"
            icon={<CheckCircleOutlined style={{ color: '#52c41a', fontSize: 48 }} />}
            title={
              activeAction === 'kg_and_zammad'
                ? 'Submitted successfully!'
                : activeAction === 'drive'
                  ? 'Shared successfully!'
                  : 'Upload successful!'
            }
            subTitle={
              activeAction === 'kg_and_zammad'
                ? 'Metadata uploaded to the Knowledge Graph and JSON saved to the Zammad ticket.'
                : activeAction === 'drive'
                  ? 'Your JSON file has been saved to the EBRAINS Collab.'
                  : 'Your metadata has been saved to the EBRAINS Knowledge Graph.'
            }
            extra={[
              // show Zammad article info if available
              zammadResult && (
                <Alert
                  key="zammad-info"
                  type="success"
                  message={`Saved to ticket ${ticketId} — article #${zammadResult.articleId}`}
                  description={`File: ${zammadResult.filename}`}
                  showIcon
                  style={{ marginBottom: 12, textAlign: 'left' }}
                />
              ),
              <Button type="primary" key="close" onClick={handleCloseModal}>
                Close
              </Button>
            ].filter(Boolean)}
          />
        )}

        {/* error */}
        {currentStatus === 'error' && (
          <Result
            status="error"
            icon={<CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 48 }} />}
            title={
              activeAction === 'kg_and_zammad' && uploadStatus === 'success' && zammadStatus === 'error'
                ? 'KG upload succeeded but Zammad save failed'
                : 'Upload failed'
            }
            subTitle="There was a problem completing the submission."
            extra={[
              <Button
                type="primary"
                key="retry"
                onClick={
                  activeAction === 'kg'            ? handleUpload :
                  activeAction === 'drive'         ? handleShareToCollab :
                  handleUploadAndZammad
                }
              >
                Try again
              </Button>,
              <Button key="close" onClick={handleCloseModal}>Close</Button>
            ]}
          >
            <Alert
              type="error"
              message="Error details"
              description={errorMessage}
              showIcon
            />
            {/* partial success info */}
            {activeAction === 'kg_and_zammad' && uploadStatus === 'success' && zammadStatus === 'error' && (
              <Alert
                type="info"
                message="KG upload completed successfully"
                description="Only the Zammad save failed. You can retry or download the JSON manually."
                showIcon
                style={{ marginTop: 8 }}
              />
            )}
          </Result>
        )}

        {/* session expired */}
        {currentStatus === 'session_expired' && (
          <Result
            status="warning"
            title="Session expired"
            subTitle="Your login session has expired. Please reload the page and log in again."
            extra={[
              <Button type="primary" key="reload" onClick={handleReload}>Reload page</Button>,
              <Button key="close" onClick={handleCloseModal}>Close</Button>
            ]}
          >
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