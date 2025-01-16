function MyButton() {
    return (
      <button>
        I'm a button
      </button>
    );
  }
  
  export default function ButtonExample() {
    return (
      <div>
        <h1>This is my button:</h1>
        <MyButton />
      </div>
    );
  }