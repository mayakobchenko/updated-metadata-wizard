import { Button } from "antd";
import { LoginOutlined, LogoutOutlined, LoadingOutlined } from '@ant-design/icons';

import ConfigProvider from './ConfigProvider';
import { useUserContext } from "./context/userContext.jsx";

import {login, logout} from "./authentication/authenticate"; 

const LoginButton = () => {

    const { user, isAuthenticating } = useUserContext();

    if (isAuthenticating) {
        return (
            <ConfigProvider>
                <Button
                    className="custom-button"
                    icon={<LoadingOutlined />}
                >
                    Log-in
                </Button>
            </ConfigProvider>
        );
    } else {
        return (
            <ConfigProvider>
                <Button
                    className="custom-button"
                    icon={user ? <LogoutOutlined /> : <LoginOutlined />}
                    onClick={user ? logout : login}
                >
                    {user ? 'Log-out' : 'Log-in'}
                </Button>
            </ConfigProvider>
        );
    }
}

export default LoginButton;

//onClick={user ? logout : login}