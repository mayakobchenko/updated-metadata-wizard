import { Fragment, useLayoutEffect, useRef, useState } from 'react'
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
const DATA_DESCRIPTOR_INDEX = 7

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

const ProgressBar = ({ step, status, onChanged, subjectStepVisible, dataDescriptorEnabled = true }) => {
  const [, setCurrent] = useState(0)
  // The labelled steps need about 140 px each. When the room is smaller (phone, tablet, narrow window) only dots are shown
  // and the current step is written above them. The room is measured, not guessed from the screen size.
  const boxRef = useRef(null)
  const [room, setRoom] = useState(null)
  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return undefined
    const measure = () => setRoom(el.getBoundingClientRect().width)
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    window.addEventListener('resize', measure)
    return () => { ro?.disconnect(); window.removeEventListener('resize', measure) }
  }, [])

  const onChange = (value) => {
    setCurrent(value)
    onChanged(value)
  }

  // Build visible items — skip Subjects (index 6) when not needed, and skip
  // Data Descriptor (index 7) when the feature flag has it disabled.
  const items = []
  for (let i = 0; i < BASE_STEP_NAMES.length; i++) {
    if (i === SUBJECTS_INDEX && !subjectStepVisible) continue
    if (i === DATA_DESCRIPTOR_INDEX && !dataDescriptorEnabled) continue

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

  const compact = room !== null && room < items.length * 140 + 16

  const wrap = (node) => <div ref={boxRef}>{node}</div>

  if (compact) {
    const cur = items[Math.min(step, items.length - 1)] || items[0]
    return wrap(
      <div className="wizard-progress-compact" style={{ marginBottom: '16px' }}>
        <span className="wizard-progress-label"><b>Step {Math.min(step, items.length - 1) + 1} of {items.length}:</b> {cur?.title}</span>
        <div className="wizard-dots" role="tablist" aria-label="Steps of the wizard">
          {items.map((it, i) => (
            <Fragment key={i}>
              <button type="button" role="tab" aria-selected={i === step} aria-label={`Step ${i + 1}: ${it.title}`} title={it.title}
                className={`wizard-dot ${i === step ? 'is-current' : it.status === 'finish' ? 'is-done' : ''}`}
                onClick={() => onChange(i)}><span /></button>
              {i < items.length - 1 && <span className={`wizard-dot-line ${i < step ? 'is-done' : ''}`} />}
            </Fragment>
          ))}
        </div>
      </div>
    )
  }

  return wrap(
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
