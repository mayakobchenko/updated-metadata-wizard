//import { useCheckUser } from "./context/useCheckUser";
import { useCheckLogin } from "./context/useCheckLogin";
  
export default function WelcomeText() {
    //const {isUser, isMessage} = useCheckUser();
    const loginAlert = useCheckLogin();
  
    /*return (
        <div>
            <h1>{isUser ? `Welcome, ${isUser}!` : 'Problem to get user'}</h1>
            <h2>{`Message ${isMessage}`}</h2>
        </div>
        )*/
      return (
        <div>
            <h1>{loginAlert ? `Welcome, ${loginAlert}!` : 'Problem to get user'}</h1>
        </div>
      )  
    
      }
