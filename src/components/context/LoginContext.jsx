import { createContext } from 'react';

const defaultContext = {
    user: null,
    tokenRef: '', 
    message: 'Loading...',
    isAuthenticating: false
}
export const LoginContext = createContext(defaultContext);