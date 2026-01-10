import { useAuthContext } from './context/NewContextProvider.jsx'

export default function Greetings() {
    const userInfo = useAuthContext()
    //console.log('greetings', userInfo)
    return (
    <div>
        <p>{userInfo.user ? `Hello, ${userInfo.user.fullname}!` : 'Hello!'}</p>
    </div>
    )  
}
  
/*    <div>
    <p>{userInfo.user ? `Hello, ${userInfo.user.given_name} ${userInfo.user.family_name}!` : 'Hello!'}</p>
</div>*/ 