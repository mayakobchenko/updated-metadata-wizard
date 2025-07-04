import {useState} from 'react'
import { Popover, Steps } from 'antd'

const STEPS_NAMES = [ "Introduction", "Dataset part 1", "Dataset part 2", "Funding", 
  "Contributors", "Experiments", "Subjects" ]
const NUM_STEPS = STEPS_NAMES.length

const customDot = (dot, { status, index }) => {
  switch (status) {
    case 'process':
      status = 'In progress';
      break;
    case 'finish':
      status = 'Completed';
      break;
    case 'wait':
      status = 'Incomplete';
      break;
    default:
      status = 'Incomplete';
  }
  return (
    <Popover
      content={
        <span>
          Step {index+1} of {NUM_STEPS} - Status: {status}
        </span>}>
      {dot}
    </Popover>
  );
};

const ProgressBar = ({step, status, onChanged}) => {
  const [, setCurrent] = useState(0)
  const onChange = (value) => {
    setCurrent(value)
    onChanged(value)}
  let items = [];
  for (let i = 0; i < NUM_STEPS; i++) {     
      let thisDescription = 'Incomplete';
      let thisStatus = 'wait';   
      if ( status[i] ) {
        thisDescription = 'Completed';
        thisStatus = 'finish';
      } else if ( i===step ) {
        thisStatus = 'process';
      } else {
        thisStatus = 'wait';
      }
      if  ( i === step ) {
        thisStatus = 'process';
        thisDescription = 'In progress';
      }
      let thisItem = {
          title: STEPS_NAMES[i],
          description: thisDescription,
          status: thisStatus,
      };
      items.push(thisItem);
  }

  return (
     <div style={{"marginBottom":"30px"}}>
      <Steps
          current={step}
          onChange={onChange}
          progressDot={customDot}
          items={items}
      />
    </div>
  )
}
export default ProgressBar
