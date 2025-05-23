import { Alert, Flex, Spin } from 'antd'
import ConfigProvider from './ConfigProvider'
import { useAuthContext } from './context/AuthProviderContext.jsx'

const Spinner = () => {
    
    const state = useAuthContext()
    const message = state?.message;

    const containerStyle = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        height: '40vh',
        marginBottom: '20vh'  
    }
    const spinStyle = {
      marginBottom: '2rem', 
      textAlign: 'center'    
  };
    return (
      <div style={containerStyle}>
        <ConfigProvider componentSize={"large"}>
          <Spin size='large' style={spinStyle}>
            <h3 style={{marginTop:'10rem'}}>{message ? message : 'Please wait...'}</h3>
          </Spin>
        </ConfigProvider>
     </div>
    )
  }

  export default Spinner;