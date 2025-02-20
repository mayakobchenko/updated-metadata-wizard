import { useState } from 'react'
import './App.css'
import PrivacyBanner from './components/PrivacyBanner.jsx'
import Header from './components/Header.jsx'

function App() {
  const [count, setCount] = useState(0);
  function handleClick() {
    setCount(count + 1);
  }

  return (
    <div className="App">
    <Header/>
    <div className="container-gradient"></div>
    <div>
      <PrivacyBanner />
      <MyButton count={count} onClick={handleClick}/>
      <MyButton count={count} onClick={handleClick}/>
    </div>
  </div>
  )
}

function MyButton({ count, onClick }) {
  return (
    <button onClick={onClick}>
      Clicked {count} times
    </button>
  );
}

export default App
