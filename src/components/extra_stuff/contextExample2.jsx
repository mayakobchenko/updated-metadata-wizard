import { createContext } from 'react';

const defaultContext = {
    level: 0,
    user: null,
    message: 'Loading...',
}

export const LevelContext2 = createContext(defaultContext);