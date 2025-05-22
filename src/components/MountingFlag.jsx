import React, { useEffect, useState } from 'react';

const MountingFlag = () => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        console.log('Component has mounted:', isMounted);

        // Cleanup function runs when the component unmounts
        return () => {
            setIsMounted(false);
            console.log('Component has unmounted:', !isMounted);
        };
    }, []); // The empty dependency array means this effect runs once on mount

    return (
        <div>
            <p>{isMounted ? 'The component is mounted!' : 'The component is not mounted.'}</p>
        </div>
    );
};

export default MountingFlag;
