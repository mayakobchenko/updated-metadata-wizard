import { DownloadOutlined, UploadOutlined, DeleteOutlined, MenuOutlined } from '@ant-design/icons'
import { Dropdown, Space } from 'antd'
import ConfigProvider from './ConfigProvider'

const items = [
  {
    label: 'Upload form data',
    key: '1',
    icon: <UploadOutlined />,
  },
  {
    label: 'Download form data as...',
    key: '2',
    icon: <DownloadOutlined />,
  },
  {
    label: 'Reset form',
    key: '3',
    icon: <DeleteOutlined />,
  },
]

const DropdownMenu = ({ handleMenuSelection }) => {
  const handleMenuClick = (info) => {
    const { key } = info
    const selectedItem = items.find(item => item.key === key)
    if (selectedItem) {
        //console.log('Menu item clicked:', selectedItem.label);
        handleMenuSelection(selectedItem.label)
    } else {
        console.warn('Dropdown menu is not working:', key)
    }
};

  const menuProps = {
      items,
      onClick: handleMenuClick,
  }

  return (
    <ConfigProvider>
      <Space wrap>
          <Dropdown.Button
              menu={menuProps}
              onClick={() => handleMenuSelection('Download form data')}
              icon={<MenuOutlined />}
              title={'Download form data'}
          >
              Download form data
          </Dropdown.Button>
      </Space>
    </ConfigProvider>  
  )
}

export default DropdownMenu
