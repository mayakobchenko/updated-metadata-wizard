import { createContext, useReducer, useContext } from 'react'

const initialState = {
    isLoggingButton: false,
    loginAlert: true,    
    token: null, 
    user: null, 
    ticketNumber: null,
    nettskjemaId: null,
    message: "Loading...",
    isAuthenticating: true, 
    nettskjemaInfo: null,
    datasetVersionId: null
}
export const AuthContext = createContext(initialState)
export const AuthDispatch = createContext(null)

export default function AuthProvider({ children }) {
  console.log('AuthProvider is mounted')
  const [state, dispatch] = useReducer(authReducer, initialState)
    
  return (
      <AuthContext value={state}>
        <AuthDispatch value={dispatch}>
           {children}
        </AuthDispatch>
      </AuthContext>
    )
  }

export function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        isLoggingButton: true
      }
    case 'LOGOUT':
      return {
        ...state,
        isLoggingButton: false, 
        user: null,
        token: null,
        message: "Loging out...",
        loginAlert: true,
        isAuthenticating: false
      }
    case 'gotToken':
        return {
            ...state, 
            token: action.text,
            message: "Retrieving user info..."
        }
    case 'code':
        return {
            ...state, 
            message: "Authenticating...",
            loginAlert: false
    }
    case 'user':
    return {
        ...state, 
        user: action.text,
        isAuthenticating: false,
        loginAlert: false
    }     
    case 'ticket':
      return {
          ...state, 
          ticketNumber: action.text
      } 
      case 'nettskjemaInfo':
        return {
            ...state, 
            nettskjemaInfo: action.text
      }  
      case 'datasetVersionId':
        return {
            ...state, 
            datasetVersionId: action.text
        } 
    default:
      return state
  }
}

export function useAuthContext() {
    return useContext(AuthContext)
  }
  export function useAuthDispatch() {
    return useContext(AuthDispatch)
  }