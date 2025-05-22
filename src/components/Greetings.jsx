//import { useAuth } from "./context/useAuth";
import { useAuthContext } from './context/AuthProviderContext';

export default function Greetings() {
    /*useAuth();*/
    const userInfo = useAuthContext();  
    return (
    <div>
        <p>{userInfo.user ? `Hello, ${userInfo.user.given_name} ${userInfo.user.family_name}!` : 'Hello!'}</p>
    </div>
    )  
    
  }
  
  