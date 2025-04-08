import '@ant-design/v5-patch-for-react-19';
import { Button } from "antd";
import { LoginOutlined, LogoutOutlined, LoadingOutlined } from '@ant-design/icons';
import { useContext, useReducer } from 'react';
import ConfigProvider from '../../ConfigProvider.jsx';
//import { LoginContext, LoginDispatchContext } from "./context/AuthContext.jsx";
import { LoginContext} from "./context/LoginContext.jsx";
import {login, logout} from "../../context/authenticate.jsx"; 
//import { loginReducer} from './context/loginReducer.jsx'

export default function LoginButton() {
    //const [todos, dispatch] = useReducer(loginReducer, initialTodos);

    /*const handleLogin = () => {
      dispatch({ type: "LOGIN" });
    };*/

    const user = useContext(LoginContext).user;
    const isAuthenticating = useContext(LoginContext).isAuthenticating;
    const message = useContext(LoginContext).message;
    //console.log('login button is mounted, user:', user);
    if (isAuthenticating) {
        return (
            <ConfigProvider>
                <Button
                    icon={<LoadingOutlined />}>
                    Log-in
                </Button>
                <div>
                <p>user: {'user'+user} message: {message}, authenticating: {isAuthenticating}</p>
                </div>
            </ConfigProvider>
        );
    } else {
        return (
            <ConfigProvider>
                <Button
                    icon={user ? <LogoutOutlined /> : <LoginOutlined />}
                    onClick={user ? logout : login}>
                    {user ? 'Log-out' : 'Log-in'}
                </Button>
                <p>user: {'user'+user}, message: {message}, authenticating: {''+isAuthenticating}</p>
            </ConfigProvider>
        );
    }
}

//export default LoginButton;