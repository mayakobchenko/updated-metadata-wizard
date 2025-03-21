import { useContext } from 'react';
import { LevelContext2 } from './context/contextExample2.jsx';

export default function Section({ children }) {
  const level = useContext(LevelContext2).level;
  return (
    <section>
      <LevelContext2 value={{level: level + 1}}>
        {children}
      </LevelContext2>
    </section>
  );
}
/*export default function Section({ children }) {
  const arrayContext = useContext(LevelContext2);
  console.log('context level:', useContext(LevelContext2).level);
  console.log('message:', useContext(LevelContext2).message);
  return (
    <section className="section">
      <LevelContext2 value={{level: useContext(LevelContext2).level+1, user: arrayContext.user+'hello', message: arrayContext.message}}>
        {children}
      </LevelContext2>
      <p>Hello {useContext(LevelContext2).user}</p>
    </section>
  );
}*/
//      <p>the context level is {{new_level}}</p>