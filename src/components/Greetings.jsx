import { useAuth } from "./context/useAuth";
import { useAuthContext } from './context/AuthProviderContext';

export default function Greetings() {
    useAuth();
    const userInfo = useAuthContext();  
    return (
    <div>
        <p>{userInfo.user ? `Welcome, ${userInfo.user.fullname}!` : 'Please log in'}</p>
    </div>
    )  
    
  }
  
  