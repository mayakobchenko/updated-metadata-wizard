import { createContext, useContext } from 'react';

export const initialState = {
    isLoggingButton: false,
    user: null,    
    tokenRef: '', 
    message: 'Loading...',
    isAuthenticating: false
}

export const AuthContext = createContext(initialState);
export const LoginDispatchContext = createContext(null);

export function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        isLoggingButton: true};
    case 'LOGOUT':
      return {
        ...state,
        isLoggingButton: false, 
        user: null};
    case 'USERINFO':  
      return {
        ...state, 
        user: action.payload};  
    default:
      return state;
  }
};

export function useAuth() {
  return useContext(AuthContext);
}
export function useAuthDispatch() {
  return useContext(LoginDispatchContext);
}