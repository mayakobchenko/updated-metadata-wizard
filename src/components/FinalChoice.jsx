import { useState } from 'react'
import { Button, Modal, Result, Spin, Alert } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  SendOutlined,
  WarningOutlined,
} from '@ant-design/icons'

export default function FinalChoice({ uploadpythonKG, saveJsonToDrive, saveJsonToZammad, getTicketId }) {

  const [status, setStatus]           = useState(null)
  // null | 'loading' | 'success' | 'success_no_ticket' | 'error'
  const [errorDetail, setErrorDetail] = useState('')
  const [modalVisible, setModalVisible] = useState(false)

  const handleSubmit = async () => {
    setStatus('loading')
    setErrorDetail('')
    setModalVisible(true)

    // ── step 1: fetch ticket ID silently ─────────────────────────────────────
    let ticketId = null
    try {
      const ticketRes  = await getTicketId()
      const ticketData = await ticketRes.json()
      ticketId = ticketData?.ticketId ?? null
    } catch (e) {
      console.warn('Could not fetch ticket ID:', e.message)
    }

    // ── step 2: KG upload ─────────────────────────────────────────────────────
    let kgResponse
    try {
      kgResponse = await uploadpythonKG()
    } catch (err) {
      setStatus('error')
      setErrorDetail(err.message || 'Network error during upload.')
      return
    }

    if (!kgResponse) {
      setStatus('error')
      setErrorDetail('No response from the upload server.')
      return
    }

    if (kgResponse.status === 401) {
      setStatus('error')
      setErrorDetail('Your session has expired. Please reload the page, then try again.')
      return
    }

    let kgData
    try {
      kgData = await kgResponse.json()
    } catch {
      setStatus('error')
      setErrorDetail('Could not parse server response.')
      return
    }

    if (!kgResponse.ok || kgData.error) {
      setStatus('error')
      setErrorDetail(kgData.error || kgData.message || `Server error ${kgResponse.status}`)
      return
    }

    // ── step 3: save JSON to Zammad (best-effort) ─────────────────────────────
    if (ticketId && saveJsonToZammad) {
      try {
        const zRes = await saveJsonToZammad(ticketId)
        if (!zRes || !zRes.ok) {
          // KG succeeded but Zammad failed — show partial success
          setStatus('success_no_ticket')
          return
        }
      } catch (e) {
        console.warn('Zammad save failed:', e.message)
        setStatus('success_no_ticket')
        return
      }
    } else if (!ticketId) {
      // No ticket found — still a success for KG, but warn about ticket
      setStatus('success_no_ticket')
      return
    }

    setStatus('success')
  }

  const handleClose = () => {
    if (status !== 'loading') {
      setModalVisible(false)
      setStatus(null)
      setErrorDetail('')
    }
  }

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

        {/* loading */}
        {status === 'loading' && (
          <Result
            icon={<Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />}
            title="Submitting your metadata..."
            subTitle="Please wait, this may take a moment."
          />
        )}

        {/* full success */}
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

        {/* KG succeeded but Zammad failed or no ticket */}
        {status === 'success_no_ticket' && (
          <Result
            icon={<WarningOutlined style={{ color: '#faad14', fontSize: 56 }} />}
            title="Metadata uploaded successfully"
            subTitle="Your metadata is in the Knowledge Graph, but could not be saved to the support ticket automatically."
            extra={[
              <Button type="primary" key="close" onClick={handleClose}>Close</Button>
            ]}
          >
            <Alert
              type="warning"
              showIcon
              message="Please send your JSON manually"
              description={
                <span>
                  Use the <strong>Download JSON</strong> button in the header to save
                  your form data, then send it to{' '}
                  <a href="mailto:curation-support@ebrains.eu">
                    curation-support@ebrains.eu
                  </a>
                </span>
              }
            />
          </Result>
        )}

        {/* error */}
        {status === 'error' && (
          <Result
            status="error"
            icon={<CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 56 }} />}
            title="Submission failed"
            extra={[
              <Button type="primary" key="retry" onClick={handleSubmit}>Try again</Button>,
              <Button key="close" onClick={handleClose}>Close</Button>
            ]}
          >
            <Alert
              type="error"
              showIcon
              message="Please download your JSON and send it manually"
              description={
                <span>
                  Use the <strong>Download JSON</strong> button in the header to save
                  your form data, then send it to{' '}
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