import { createContext, useReducer } from 'react';

const initialState = {
    isLoggingButton: false
}
export const AuthContext = createContext(initialState);
export const LoginDispatchContext = createContext(null);

export default function AuthProvider ({ children }) {
    const [state, dispatch] = useReducer(authReducer, initialState);  
    return (
      <AuthContext value={state}>
        <LoginDispatchContext value={dispatch}>
           {children}
        </LoginDispatchContext>
      </AuthContext>
    );
  };

export function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        isLoggingButton: true
      };
    case 'LOGOUT':
      return {
        ...state,
        isLoggingButton: false
      };
    default:
      return state;
  }
};