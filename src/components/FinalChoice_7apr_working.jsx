import { useState } from 'react'
import { Button, Modal, Result, Spin, Alert } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  SendOutlined,
} from '@ant-design/icons'

export default function FinalChoice({ uploadpythonKG, saveJsonToDrive, saveJsonToZammad, getTicketId }) {

  const [status, setStatus]       = useState(null)
  // null | 'loading' | 'success' | 'error'
  const [errorDetail, setErrorDetail] = useState('')
  const [modalVisible, setModalVisible] = useState(false)

  // ── main submit handler ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setStatus('loading')
    setErrorDetail('')
    setModalVisible(true)

    try {
      // ── step 1: fetch ticket ID from Zammad in the background ─────────────
      // getTicketId() calls GET /api/zammad/zammadinfo with the ticket number
      // stored in the wizard context — the user never sees this step
      let ticketId = null
      try {
        const ticketRes  = await getTicketId()
        const ticketData = await ticketRes.json()
        ticketId = ticketData?.ticketId ?? null
      } catch (e) {
        // ticket fetch failing is non-fatal — we still attempt the KG upload
        console.warn('Could not fetch ticket ID:', e.message)
      }

      // ── step 2: upload metadata to Knowledge Graph ────────────────────────
      const kgResponse = await uploadpythonKG()

      if (!kgResponse) {
        setStatus('error')
        setErrorDetail('No response from the upload server.')
        return
      }

      // check for session expiry first
      if (kgResponse.status === 401) {
        setStatus('error')
        setErrorDetail('Your session has expired. Please reload the page, then try again.')
        return
      }

      const kgData = await kgResponse.json()

      if (!kgResponse.ok || kgData.error) {
        setStatus('error')
        setErrorDetail(kgData.error || kgData.message || `Server error ${kgResponse.status}`)
        return
      }

      // ── step 3: save JSON to Zammad ticket (best-effort, non-fatal) ───────
      if (ticketId && saveJsonToZammad) {
        try {
          await saveJsonToZammad(ticketId)
        } catch (e) {
          // Zammad save failing does NOT block success — KG upload already succeeded
          console.warn('Zammad save failed (non-fatal):', e.message)
        }
      }

      // ── all done ──────────────────────────────────────────────────────────
      setStatus('success')

    } catch (err) {
      setStatus('error')
      setErrorDetail(err.message || 'An unexpected error occurred.')
    }
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
      {/* ── single submit button ── */}
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

      {/* ── status modal ── */}
      <Modal
        open={modalVisible}
        onCancel={handleClose}
        footer={null}
        closable={status !== 'loading'}
        maskClosable={status !== 'loading'}
        centered
        width={520}
      >

        {/* loading */}
        {status === 'loading' && (
          <Result
            icon={<Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />}
            title="Submitting your metadata..."
            subTitle="Please wait, this may take a moment."
          />
        )}

        {/* success */}
        {status === 'success' && (
          <Result
            status="success"
            icon={<CheckCircleOutlined style={{ color: '#52c41a', fontSize: 56 }} />}
            title="Submission successful!"
            subTitle="Your metadata has been submitted to the EBRAINS Knowledge Graph."
            extra={[
              <Button type="primary" key="close" onClick={handleClose}>
                Close
              </Button>
            ]}
          />
        )}

        {/* error */}
        {status === 'error' && (
          <Result
            status="error"
            icon={<CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 56 }} />}
            title="Submission failed"
            extra={[
              <Button type="primary" key="retry" onClick={handleSubmit}>
                Try again
              </Button>,
              <Button key="close" onClick={handleClose}>
                Close
              </Button>
            ]}
          >
            <Alert
              type="error"
              showIcon
              message="Please download your JSON and send it manually"
              description={
                <span>
                  Use the <strong>Download JSON</strong> button in the header to save your
                  form data, then send it to{' '}
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