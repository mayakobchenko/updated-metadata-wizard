import { Spin } from 'antd'
import ConfigProvider from './ConfigProvider'
import { useAuthContext } from './context/NewContextProvider.jsx'

const Spinner = () => {
    const state = useAuthContext()
    const message = state?.message
    const showLoginDialog = state?.showLoginDialog
    
    // Don't show spinner if login dialog is visible
    if (showLoginDialog) {
        return null
    }
    
    const overlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999
    }
    
    const contentStyle = {
        textAlign: 'center',
        padding: '2rem',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem'
    }
    
    return (
        <div style={overlayStyle}>
            <div style={contentStyle}>
                <ConfigProvider componentSize={"large"}>
                    <Spin size='large' />
                </ConfigProvider>
                <h3 style={{margin: 0}}>
                    {message ? message : 'Loading...'}
                </h3>
            </div>
        </div>
    )
}

export default Spinner