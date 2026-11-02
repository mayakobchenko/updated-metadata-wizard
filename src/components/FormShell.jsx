import { useEffect } from 'react'
import { Form as AntForm } from 'antd'

// One <Form> per step, or - when several sections share one page - ONE <Form> owned by the page and the sections
// rendered inside it (`embedded`). An embedded section hands its change handler to the page through `register`,
// and puts its start values into the shared form once.
export default function FormShell({ embedded = false, form, initialValues, onValuesChange, register, children }) {
  useEffect(() => {
    if (embedded && form && initialValues) form.setFieldsValue(initialValues)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, form])
  if (embedded) {
    register?.(onValuesChange)
    return <>{children}</>
  }
  return <AntForm form={form} layout="vertical" initialValues={initialValues} onValuesChange={onValuesChange}>{children}</AntForm>
}
