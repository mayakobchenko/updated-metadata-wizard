import '@ant-design/v5-patch-for-react-19'
import { Button } from "antd"
import { LoginOutlined, LogoutOutlined, LoadingOutlined } from '@ant-design/icons'
import ConfigProvider from './ConfigProvider.jsx'
import { useAuthDispatch, useAuthContext } from './context/AuthProviderContext.jsx'
import authFunctions from "./context/authenticate.jsx"

export default function LoginButton () {

  const state = useAuthContext()
  const dispatch = useAuthDispatch()
  const user = state?.user
  const isAuthenticating = state?.isAuthenticating

  function handleLoginButton () {
    dispatch({ type: 'LOGIN' })
    authFunctions.login()}

  const handleLogoutButton = () => {
    dispatch({ type: 'LOGOUT' })
    authFunctions.logout()}

if (isAuthenticating) {
    return (
        <ConfigProvider>
            <Button
                icon={<LoadingOutlined />}>
                Log-in
            </Button>
        </ConfigProvider>)
} else {
    return (
        <ConfigProvider>
            <Button
                icon={user ? <LogoutOutlined /> : <LoginOutlined />}
                onClick={user ? handleLogoutButton : handleLoginButton}>
                {user ? 'Log-out' : 'Log-in'}
            </Button>
        </ConfigProvider>)
}}

