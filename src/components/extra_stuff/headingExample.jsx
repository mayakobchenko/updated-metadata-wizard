import { useContext } from 'react';
import { LevelContext2 } from './context/contextExample2.jsx';

export default function Heading({ children }) {
  const level = useContext(LevelContext2).level;
  switch (level) {
    case 1:
      return (<div>
                <h1>{children}</h1>
                <p>the level is {level}</p>
              </div>);
    case 2:
      return (<div>
                <h2>{children}</h2>
                <p>the level is {level}</p>
              </div>);
    case 3:
      return (<div>
                <h3>{children}</h3>
                <p>the level is {level}</p>
              </div>);
    case 4:
      return (<div>
                <h4>{children}</h4>
                <p>the level is {level}</p>
              </div>);
    case 5:
      return <h5>{children}</h5>;
    case 6:
      return <h6>{children}</h6>;
    default:
      throw Error('Unknown level: ' + level);
  }
}

/*export default function Heading({ children }) {
    const level = useContext(LevelContext2).level;
    console.log('heading component context:', useContext(LevelContext2));
    switch (level) {
      case 1:
        console.log('heading component context:', useContext(LevelContext2));
        return <h1>{children}</h1>;
      case 2:
        return <h2>{children}</h2>;
      case 3:
        return <h3>{children}</h3>;
      case 4:
        return <h4>{children}</h4>;
      case 5:
        return <h5>{children}</h5>;
      case 6:
        return <h6>{children}</h6>;
      default:
        throw Error('Unknown level: ' + level);
    }
  }*/
  