import { Button } from "antd";
import { LoginOutlined, LogoutOutlined, LoadingOutlined } from '@ant-design/icons';
import ConfigProvider from '../ConfigProvider.jsx';
import { loginContext } from "./context/loginContext.jsx";
import {login, logout} from "../authentication/authenticate.js"; 

const LoginButton = () => {
    
    const loginInfo = useContext(loginContext);

    if (loginInfo.isAuthenticating) {
        return (
            <ConfigProvider>
                <Button
                    icon={<LoadingOutlined />}>
                    Log-in
                </Button>
            </ConfigProvider>
        );
    } else {
        return (
            <ConfigProvider>
                <Button
                    icon={loginInfo.user ? <LogoutOutlined /> : <LoginOutlined />}
                    onClick={loginInfo.user ? logout : login}>
                    {loginInfo.user ? 'Log-out' : 'Log-in'}
                </Button>
            </ConfigProvider>
        );
    }
}

export default LoginButton;
