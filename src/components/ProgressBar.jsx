import { useState } from 'react'
import { Popover, Steps } from 'antd'

const BASE_STEP_NAMES = [
  'Introduction',
  'Dataset part 1',
  'Dataset part 2',
  'Funding',
  'Contributors',
  'Experiments',
  'Subjects',
]

// factory so we can pass the totalSteps dynamically
const makeCustomDot = (totalSteps) => (dot, { status, index }) => {
  let label
  switch (status) {
    case 'process':
      label = 'In progress'
      break
    case 'finish':
      label = 'Completed'
      break
    case 'wait':
    default:
      label = 'Incomplete'
  }

  return (
    <Popover
      content={
        <span>
          Step {index + 1} of {totalSteps} - Status: {label}
        </span>
      }
    >
      {dot}
    </Popover>
  )
}

const ProgressBar = ({ step, status, onChanged, subjectStepVisible }) => {
  const [, setCurrent] = useState(0)

  const onChange = (value) => {
    setCurrent(value)
    onChanged(value)
  }

  // how many steps are visible in the UI
  const totalSteps = subjectStepVisible
    ? BASE_STEP_NAMES.length          // 7
    : BASE_STEP_NAMES.length - 1      // 6 (no Subjects)

  const items = []
  for (let i = 0; i < BASE_STEP_NAMES.length; i++) {
    // hide Subjects step if not visible
    if (!subjectStepVisible && i === 6) continue

    let thisDescription = 'Incomplete'
    let thisStatus = 'wait'

    if (status[i]) {
      thisDescription = 'Completed'
      thisStatus = 'finish'
    } else if (i === step) {
      thisStatus = 'process'
      thisDescription = 'In progress'
    }

    items.push({
      title: BASE_STEP_NAMES[i],
      description: thisDescription,
      status: thisStatus,
    })
  }

  return (
    <div style={{ marginBottom: '30px' }}>
      <Steps
        current={step}
        onChange={onChange}
        progressDot={makeCustomDot(totalSteps)}
        items={items}
      />
    </div>
  )
}

export default ProgressBar
