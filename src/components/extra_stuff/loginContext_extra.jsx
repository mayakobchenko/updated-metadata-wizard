import { createContext } from 'react';

const defaultContext = {
    user: null,
    tokenRef: '', 
    message: 'Loading...',
    isAuthenticating: true
}
export const loginContext = createContext(defaultContext);
//export const loginContext = createContext(1);