export default function loginReducer(state, action) {
    //the same can be done with if
    switch (action.type) {
      case 'LOGIN': {
        return {
            ...state,
            isAuthenticated: true,
          }
      }
      case 'LOGOUT': {
        return {
            ...state,
            isAuthenticated: false,
          }
      }
      default: {
        return state
      }
    }
  }

