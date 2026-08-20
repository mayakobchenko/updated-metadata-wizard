import { useState } from 'react'
import { Button, Modal, Result, Spin, Alert } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  SendOutlined,
  WarningOutlined,
  ReloadOutlined,
  DownloadOutlined,
} from '@ant-design/icons'

export default function FinalChoice({ uploadpythonKG, saveJsonToZammad, getTicketId, formData }) {

  const [status, setStatus]             = useState(null)
  const [errorDetail, setErrorDetail]   = useState('')
  const [modalVisible, setModalVisible] = useState(false)

  // ── download the form data as a JSON file ─────────────────────────────────
  const handleDownloadJson = () => {
    try {
      const dataToSave = formData || {}
      const blob       = new Blob(
        [JSON.stringify(dataToSave, null, 2)],
        { type: 'application/json' }
      )
      const url      = URL.createObjectURL(blob)
      const link     = document.createElement('a')
      link.href      = url
      link.download  = `ebrains_metadata_${Date.now()}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Download failed:', e.message)
    }
  }

  const handleSubmit = async () => {
    setStatus('loading')
    setErrorDetail('')
    setModalVisible(true)

    // ── step 1: fetch ticket ID silently ──────────────────────────────────────
    let ticketId = null
    try {
      const ticketRes  = await getTicketId()
      const ticketData = await ticketRes.json()
      ticketId = ticketData?.ticketId ?? null
    } catch (e) {
      console.warn('Could not fetch ticket ID:', e.message)
    }

    // ── step 2: KG upload ─────────────────────────────────────────────────────
    let kgSucceeded   = false
    let kgErrorDetail = ''
    let sessionExpired = false

    try {
      const kgResponse = await uploadpythonKG()

      if (!kgResponse) {
        kgErrorDetail = 'No response from the upload server.'
      } else if (kgResponse.status === 401) {
        try {
          const errData = await kgResponse.json()
          if (errData.code === 'SESSION_EXPIRED') {
            sessionExpired = true
          } else {
            kgErrorDetail = errData.error || 'Authentication failed.'
          }
        } catch {
          sessionExpired = true
        }
      } else {
        let kgData
        try {
          kgData = await kgResponse.json()
        } catch {
          kgErrorDetail = 'Could not parse server response.'
        }

        if (kgData) {
          if (kgResponse.ok && !kgData.error) {
            kgSucceeded = true
          } else {
            kgErrorDetail = kgData.error || kgData.message || `Server error ${kgResponse.status}`
          }
        }
      }
    } catch (err) {
      kgErrorDetail = err.message || 'Network error during upload.'
    }

    // ── step 3: save JSON to Zammad ───────────────────────────────────────────
    let zammadSucceeded = false
    if (ticketId && saveJsonToZammad) {
      try {
        const zRes      = await saveJsonToZammad(ticketId)
        zammadSucceeded = !!(zRes?.ok)
        if (!zammadSucceeded) {
          console.warn('Zammad save returned non-OK response')
        }
      } catch (e) {
        console.warn('Zammad save failed:', e.message)
      }
    }

    // ── step 4: set final status ──────────────────────────────────────────────
    if (sessionExpired) {
      setStatus('session_expired')
      return
    }

    if (kgSucceeded) {
      setStatus(zammadSucceeded ? 'success' : 'success_no_ticket')
      return
    }

    setErrorDetail(kgErrorDetail)
    setStatus(zammadSucceeded ? 'error_but_json_saved' : 'error')
  }

  const handleClose = () => {
    if (status !== 'loading') {
      setModalVisible(false)
      setStatus(null)
      setErrorDetail('')
    }
  }

  const handleReload = () => window.location.reload()

  const downloadButton = (
    <Button
      key="download"
      icon={<DownloadOutlined />}
      onClick={handleDownloadJson}
    >
      Download JSON
    </Button>
  )

  return (
    <>
      <Button
        type="primary"
        size="large"
        icon={<SendOutlined />}
        onClick={handleSubmit}
        disabled={status === 'loading'}
        style={{ minWidth: 180 }}
      >
        Submit
      </Button>

      <Modal
        open={modalVisible}
        onCancel={handleClose}
        footer={null}
        closable={status !== 'loading'}
        maskClosable={status !== 'loading'}
        centered
        width={540}
      >

        {/* ── loading ── */}
        {status === 'loading' && (
          <Result
            icon={<Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />}
            title="Submitting your metadata..."
            subTitle="Please wait, this may take a moment."
          />
        )}

        {/* ── full success ── */}
        {status === 'success' && (
          <Result
            status="success"
            icon={<CheckCircleOutlined style={{ color: '#52c41a', fontSize: 56 }} />}
            title="Submission successful!"
            subTitle="Your metadata has been submitted to the EBRAINS Knowledge Graph and saved to your support ticket."
            extra={[
              <Button type="primary" key="close" onClick={handleClose}>Close</Button>
            ]}
          />
        )}

        {/* ── KG succeeded but Zammad failed ── */}
        {status === 'success_no_ticket' && (
          <Result
            icon={<WarningOutlined style={{ color: '#faad14', fontSize: 56 }} />}
            title="Metadata uploaded successfully"
            subTitle="Your metadata is in the Knowledge Graph, but could not be saved to your support ticket automatically."
            extra={[
              downloadButton,
              <Button type="primary" key="close" onClick={handleClose}>Close</Button>
            ]}
          >
            <Alert
              type="warning"
              showIcon
              message="Please send your JSON manually"
              description={
                <span>
                  Use the <strong>Download JSON</strong> button to save your form
                  data, then send it to{' '}
                  <a href="mailto:curation-support@ebrains.eu">
                    curation-support@ebrains.eu
                  </a>
                </span>
              }
            />
          </Result>
        )}

        {/* ── KG failed but JSON saved to Zammad ── */}
        {status === 'error_but_json_saved' && (
          <Result
            icon={<WarningOutlined style={{ color: '#fa8c16', fontSize: 56 }} />}
            title="Knowledge Graph upload failed"
            subTitle="Your metadata could not be uploaded to the Knowledge Graph, but your JSON has been saved to your support ticket so the curation team can assist you."
            extra={[
              downloadButton,
              <Button key="close" onClick={handleClose}>Close</Button>
            ]}
          >
            <Alert
              type="warning"
              showIcon
              message="The curation team has your JSON"
              description={
                <span>
                  Your form data was saved to your support ticket automatically.
                  The curation team at{' '}
                  <a href="mailto:curation-support@ebrains.eu">
                    curation-support@ebrains.eu
                  </a>
                  {' '}can complete the upload manually.
                  {errorDetail && (
                    <span style={{ display: 'block', marginTop: 8, color: '#888', fontSize: 12 }}>
                      Technical details: {errorDetail}
                    </span>
                  )}
                </span>
              }
            />
          </Result>
        )}

        {/* ── session expired ── */}
        {status === 'session_expired' && (
          <Result
            icon={<WarningOutlined style={{ color: '#faad14', fontSize: 56 }} />}
            title="Your session has expired"
            subTitle="Your login session timed out before the upload could complete. Your form data is safe — please reload the page to log back in, then submit again."
            extra={[
              downloadButton,
              <Button
                type="primary"
                key="reload"
                icon={<ReloadOutlined />}
                onClick={handleReload}
              >
                Reload page
              </Button>,
              <Button key="close" onClick={handleClose}>Cancel</Button>
            ]}
          >
            <Alert
              type="info"
              showIcon
              message="Your data will not be lost"
              description={
                <span>
                  Use <strong>Download JSON</strong> to save your current form
                  data before reloading. After logging back in, use{' '}
                  <strong>Import JSON</strong> to restore it instantly.
                </span>
              }
            />
          </Result>
        )}

        {/* ── both KG and Zammad failed ── */}
        {status === 'error' && (
          <Result
            status="error"
            icon={<CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 56 }} />}
            title="Submission failed"
            extra={[
              downloadButton,
              <Button key="close" onClick={handleClose}>Close</Button>
            ]}
          >
            <Alert
              type="error"
              showIcon
              message="Please download your JSON and send it manually"
              description={
                <span>
                  Use the <strong>Download JSON</strong> button to save your form
                  data, then send it to{' '}
                  <a href="mailto:curation-support@ebrains.eu">
                    curation-support@ebrains.eu
                  </a>
                  {errorDetail && (
                    <span style={{ display: 'block', marginTop: 8, color: '#888', fontSize: 12 }}>
                      Technical details: {errorDetail}
                    </span>
                  )}
                </span>
              }
            />
          </Result>
        )}

      </Modal>
    </>
  )
}