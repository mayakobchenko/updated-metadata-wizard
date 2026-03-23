import { useAuthContext } from './context/NewContextProvider.jsx'

export default function Greetings() {
    const userInfo = useAuthContext()
    return (
    <div>
        <p>{userInfo.user ? `Hello, ${userInfo.user.fullname}!` : 'Hello!'}</p>
    </div>
    )  
}
