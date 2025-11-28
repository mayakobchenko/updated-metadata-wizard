import { useState } from "react"
import { Button, Popover } from "antd"

export default function PopoverSave({ downloadJson, uploadpythonKG }) {
  const [visible, setVisible] = useState(false)

  const handleVisibleChange = (newVisible) => {
    setVisible(newVisible)}

  const handleAction = (action) => {
    setVisible(false)
    if (action === "download") console.log('downloaded') //downloadJson()
    else if (action === "upload") console.log('uploaded') //uploadpythonKG()
    else if (action === "share") console.log("Shared with collaborators")
  }

  const content = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Button onClick={() => handleAction("download")} type="text">
        Download metadata JSON file 
      </Button>
      <Button onClick={() => handleAction("upload")} type="text">
        Upload metadata to the Knowledge Graph
      </Button>
      <Button onClick={() => handleAction("share")} type="text">
        Share metadata with collaborators
      </Button>
    </div>
  )

  return (
    <Popover
      content={content}
      trigger="click"
      open={visible}
      onOpenChange={handleVisibleChange}
    >
      <Button className="next-back-button">Click to proceed</Button>
    </Popover>
  )
}