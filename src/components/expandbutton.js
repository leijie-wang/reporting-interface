import React, { useState } from 'react';

const ExpandButton = ({ onExpand }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async () => {
        setIsLoading(true);
        await onExpand();
        setIsLoading(false);
    };

    return (
        <button 
            onClick={handleClick}
            className='bg-blue-50 py-1 px-2 rounded'
            disabled={isLoading}
        >
            {isLoading ? 'Loading...' : 'Expand More'}
        </button>
    );
};

export default ExpandButton;