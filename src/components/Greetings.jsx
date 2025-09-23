import { useAuthContext } from './context/AuthProviderContext'

export default function Greetings() {
    const userInfo = useAuthContext()
    return (
    <div>
        <p>{userInfo.user ? `Hello, ${userInfo.user.fullname}!` : 'Hello!'}</p>
    </div>
    )  
    
  }
  
  /*    <div>
        <p>{userInfo.user ? `Hello, ${userInfo.user.given_name} ${userInfo.user.family_name}!` : 'Hello!'}</p>
    </div>*/ 