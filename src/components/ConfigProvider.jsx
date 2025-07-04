import {ConfigProvider} from 'antd';

const EbrainsConfigProvider = ({children, ...props}) => {
    return ( 
        <ConfigProvider
            theme={{token: {colorPrimary: '#45b07c',
                            colorPrimaryHover: '#68bd91',
                            colorPrimaryActive: '#2f8a61e0',
            }}} {...props}>
                {children}
        </ConfigProvider>
    )
}

export default EbrainsConfigProvider
