import '@ant-design/v5-patch-for-react-19';
import { Button } from "antd";
import { LoginOutlined, LogoutOutlined, LoadingOutlined } from '@ant-design/icons';
import ConfigProvider from './ConfigProvider.jsx';
//import { useContext } from 'react'
import { useAuth, useAuthDispatch } from './context/AuthContextWrap.jsx'
import {login, logout} from "./context/authenticate.jsx"

export default function LoginButtonFinal () {
  //const state = useContext(AuthContext)
  //const dispatch = useContext(LoginDispatchContext)
  const state = useAuth()
  const dispatch = useAuthDispatch()

  function handleLoginButton () {
    dispatch({ type: 'LOGIN' })
    login()
    console.log('LoginButton:', ''+state.user)
  };

  const handleLogoutButton = () => {
    dispatch({ type: 'LOGOUT' })
    logout()
    //console.log('LogoutButton:', state.isLoggingButton)
  };

  return (
    <div>
      {state.user ? (
        <>
            <p>Login button state: {''+state.isLoggingButton}</p>
            <p>user: {''+state.user} message: {state.message}, authenticating: {state.isAuthenticating}</p>
            <button onClick={handleLogoutButton()}>Logout</button>
        </>
      ) : (
        <>
            <p>Login button state: {''+state.isLoggingButton}</p>
            <p>user: {''+state.user} message: {state.message}, authenticating: {state.isAuthenticating}</p>
            <button onClick={handleLoginButton}>Login</button>
        </>
      )}
    </div>
  );
};

//export default LoginButtonFinal
