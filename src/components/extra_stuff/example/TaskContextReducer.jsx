import { createContext, useReducer } from 'react';

export const TasksContext = createContext(null);
export const TasksDispatchContext = createContext(null);

export function TasksProvider({ children }) {
    const [tasks, dispatch] = useReducer(taskReducer, initialTasks); 
    return (
      <TasksContext value={tasks}>
        <TasksDispatchContext value={dispatch}>
          {children}
        </TasksDispatchContext>
      </TasksContext>
    );
  }

export function taskReducer(tasks, action) {
//the same can be done with if
switch (action.type) {
    case 'added': {
    return [
        ...tasks,
        {
        id: action.id,
        text: action.text,
        done: false,
        },
    ];
    }
    case 'changed': {
    return tasks.map((t) => {
        if (t.id === action.task.id) {
        return action.task;
        } else {
        return t;
        }
    });
    }
    case 'deleted': {
    return tasks.filter((t) => t.id !== action.id);
    }
    default: {
    throw Error('Unknown action: ' + action.type);
    }
}
}  

const initialTasks = [
    { id: 0, text: 'Philosopher’s Path', done: true },
    { id: 1, text: 'Visit the temple', done: false },
    { id: 2, text: 'Drink matcha', done: false }
  ];