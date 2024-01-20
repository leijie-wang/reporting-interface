import React, { useState, useEffect } from 'react';
import './index.css';
import MessageWindow from './components/messagewindow';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';

const ReviewReports = (props) => {
    const [messageWindows, setMessageWindows] = useState([]);
    const [errorMessage, setErrorMessage] = useState(""); // error message to be displayed on the screen
    const [token, setToken] = useState(null);
    const [reportedData, setReportedData] = useState({
        reportedUserId: null,
        reportingUserId: null,
        reportTimestamp: null,
    });

    const [currentMessageWindow, setCurrentMessageWindow] = useState(0);
    const totalMessageWindows = messageWindows.length;
    
    useEffect(() => {
        /* fetch reporting data and message windows from the backend */

        const queryParams = new URLSearchParams(window.location.search);
        const token = queryParams.get('token');
        setToken(token);

        const fetchData = async () => {
            try {
                // not sure why fetching data from the ngrok proxy does not work
                const response = await fetch(
                    `http://localhost:3000/react/review-report?token=${token}`,
                    {
                        method: 'GET',
                        mode: 'cors',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json, text/plain, */*',
                            'Access-Control-Allow-Origin':'*'
                        },
                    }
                );
                if(!response.ok) {
                    let error = await response.json();
                    console.log('error', error);
                    setErrorMessage(error.error);
                } else {
                    const jsonData = await response.json();
                    console.log('jsonData', jsonData);
                    // console.log('jsonData.message_window.messages', jsonData.message_window.messages);
                    setMessageWindows(jsonData.message_windows);
                    setReportedData({
                        reportedUserId: jsonData.reported_user_id,
                        reportingUserId: jsonData.reporting_user_id,
                        reportTimestamp: jsonData.reporting_timestamp,
                    });
                }

            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, []);

    const displayRedactedMessage = (message) => {
        /* build a JSX element that represents the redacted message with a blue background for each redacted text */

        let redactedMessage = "";
        // replace each pair of <redact></redact> tags with a span with a blue background
        if(message.type === "text"){
            // Split the message at <redact> and </redact>, keeping the content between them
            const parts = message.content.split(/<redact>(.*?)<\/redact>/);

            return (
                <p className="text-base">
                    {parts.map((part, index) => {
                        // Every even index is normal text, odd indexes are redacted text
                        if (index % 2 === 0) {
                            return part;
                        } else {
                            return <span key={index} className="bg-blue-50 p-1 m-1 font-bold rounded">{part}</span>;
                        }
                    })}
                </p>
            );
        }
        
        
        return <p className="text-base">{redactedMessage}</p>;
    };

    if(messageWindows.length > 0) {
        // group messages by author into an array of arrays, where each array contains sequential messages from the same author

        return (
            <div className='flex flex-col items-center overflow-hidden w-[70%] h-full p-4 mx-auto gap-y-4'>
                <div className="font-medium text-2xl">Reported Message Windows</div>
                <MessageWindow
                    messages={messageWindows[currentMessageWindow].messages}
                    reportedData={{
                        reportingUserId: reportedData.reportingUserId,
                        reportedMessageId: reportedData.reportedMessageId
                    }}
                    timeFormat="datetime"
                    enableCheckBox={false}
                    enbaleExpandMore={false}
                    handleContentSelection={() => {}}
                    handleMessageSelection={() => {}}
                    displayMessage={displayRedactedMessage}
                    expandMessageWindow={() => {}}
                />
                <div className="flex justify-center items-center gap-x-2">
                    <button 
                        onClick={() => setCurrentMessageWindow(Math.max(currentMessageWindow - 1, 0))} 
                        disabled={currentMessageWindow === 0} 
                        className="py-1 px-2 rounded-full bg-blue-500 text-white disabled:bg-gray-300"
                    >
                        <FontAwesomeIcon icon={faArrowLeft} />
                    </button>
                    <div className='font-medium text-xl'>
                        Message Window 
                    </div>
                    <button 
                        onClick={() =>  setCurrentMessageWindow(Math.min(currentMessageWindow + 1, totalMessageWindows - 1))} 
                        disabled={currentMessageWindow >= totalMessageWindows - 1} 
                        className="py-1 px-2 rounded-full bg-blue-500 text-white disabled:bg-gray-300"
                    >
                         <FontAwesomeIcon icon={faArrowRight} />
                    </button>
                </div>
                
            </div>
        );
    } else if(errorMessage.length > 0) {
        return (
            <div class="bg-gray-100 flex justify-center items-center h-screen">
                <div class="bg-white p-6 rounded-lg shadow-lg text-center">
                    <h2 class="text-red-500 text-3xl font-bold mb-2">Error Occurred</h2>
                    <p class="text-gray-700 text-xl">{errorMessage}</p>
                </div>
            </div>
        );
    }   
};

export default ReviewReports;