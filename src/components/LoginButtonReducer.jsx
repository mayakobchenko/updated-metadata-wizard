import React, { useContext } from 'react';
import { AuthContext, LoginDispatchContext } from './context/AuthContextWrap';

const LoginButtonReducer = () => {
  const state = useContext(AuthContext);
  const dispatch = useContext(LoginDispatchContext);

  const handleLoginButton = () => {
    dispatch({ type: 'LOGIN' })
    console.log('LoginButton:', state.isLoggingButton)
  };

  const handleLogoutButton = () => {
    dispatch({ type: 'LOGOUT' })
    console.log('LogoutButton:', state.isLoggingButton)
  };

  return (
    <div>
      {state.isLoggingButton ? (
        <>
            <p>Login button state: {''+state.isLoggingButton}</p>
            <button onClick={handleLogoutButton}>Logout</button>
        </>
      ) : (
        <>
            <p>Login button state: {''+state.isLoggingButton}</p>
            <button onClick={handleLoginButton}>Login</button>
        </>
      )}
    </div>
  );
};

export default LoginButtonReducer;
