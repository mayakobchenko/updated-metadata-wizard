import { useOnlineStatus } from "./useOnlineStatus";

export function StatusBar() {
    const isOnline = useOnlineStatus();
    return <h1>{isOnline ? '✅ Online' : '❌ Disconnected'}</h1>;
  }
  
export function SaveButton() {
    const isOnline = useOnlineStatus();
  
    function handleSaveClick() {
      console.log('✅ Progress saved');
    }
  
    return (
      <button disabled={!isOnline} onClick={handleSaveClick}>
        {isOnline ? 'Save progress' : 'Reconnecting...'}
      </button>
    );
  }