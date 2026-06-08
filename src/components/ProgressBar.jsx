import { useState } from 'react'
import { Popover, Steps } from 'antd'

// Step definitions — order matches the steps array in StepsWizard
const BASE_STEP_NAMES = [
  'Introduction',    // 0
  'Dataset part 1',  // 1
  'Dataset part 2',  // 2
  'Funding',         // 3
  'Contributors',    // 4
  'Experiments',     // 5
  'Subjects',        // 6  — conditionally hidden
  'Data descriptor', // 7  — always last
]

const SUBJECTS_INDEX = 6

const makeCustomDot = (totalSteps) => (dot, { status, index }) => {
  let label
  switch (status) {
    case 'process': label = 'In progress'; break
    case 'finish':  label = 'Completed';   break
    default:        label = 'Incomplete'
  }
  return (
    <Popover content={<span>Step {index + 1} of {totalSteps} — {label}</span>}>
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

  // Build visible items — skip Subjects (index 6) when not needed
  const items = []
  for (let i = 0; i < BASE_STEP_NAMES.length; i++) {
    if (i === SUBJECTS_INDEX && !subjectStepVisible) continue

    let thisStatus      = 'wait'
    let thisDescription = 'Incomplete'

    if (status[i]) {
      thisStatus      = 'finish'
      thisDescription = 'Completed'
    } else if (i === step) {
      thisStatus      = 'process'
      thisDescription = 'In progress'
    }

    items.push({
      title:       BASE_STEP_NAMES[i],
      description: thisDescription,
      status:      thisStatus,
    })
  }

  return (
    <div style={{ marginBottom: '30px' }}>
      <Steps
        current={step}
        onChange={onChange}
        progressDot={makeCustomDot(items.length)}
        items={items}
      />
    </div>
  )
}

export default ProgressBar
