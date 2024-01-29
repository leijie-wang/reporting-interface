import React, { useState, useEffect } from 'react';
import './index.css';
import Popover from '@mui/material/Popover';
import MessageWindow from './components/messagewindow';
import {
    isSelectionValid, 
    getRedactedMessage
} from './utils';

const REACT_APP_BACKEND = "https://test.privacyreporting.com/api";
const RedactReports = (props) => {
    const [messages, setMessages] = useState([]);
    const [errorMessage, setErrorMessage] = useState(""); // error message to be displayed on the screen
    const [token, setToken] = useState(null);
    const [reportedData, setReportedData] = useState({
        reportedMessageId: null,
        reportedUserId: null,
        reportingUserId: null,
        reportTimestamp: null,
        channelId: null,
        token: null
    });

    // related to the redact-tooltip div https://mui.com/material-ui/react-popover/
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [selectionData, setSelectionData] = useState({ 
        text: '', 
        redactText: '',
        isVisible: false, 
        messageId: null
    });

    const updateOneMessage = (messageId, newMessage) => {
        /* 
            update the message with id messageId with the new message object newMessage
        */
        const updatedMessages = messages.map(message => {
            if (message.message_id === messageId) {
                // Create a copy of the message and update its selected field
                return newMessage;
            }
            return message;
        });

        setMessages(updatedMessages);
    };

    // close the popover when the user clicks outside of it
    const handlePopoverClose = () => {
        setSelectionData({ ...selectionData, isVisible: false });
    };

    const handleContentSelection = (message_id) => {
        /* pop up the redact overflow tooltip when the user selects a piece of messages */
        const selection = window.getSelection();
        let selectedText = selection.toString();
        
        
        // checks whether the selection is valid
        if(!isSelectionValid(selection)) return;
        let range = selection.getRangeAt(0);

        // calculate the total offset of the selected text within the whole original message
        let totalOffset = range.startOffset;
        let startNode = range.startContainer;
        while(startNode) {
            if(startNode.previousSibling){
                startNode = startNode.previousSibling;
                if(startNode.nodeType === Node.ELEMENT_NODE && startNode.getAttribute('originallength')){
                    // check whether it has an attribute length, which is the length of the original text before redaction
                    totalOffset += parseInt(startNode.getAttribute('originallength'));
                } else {
                    // it is a text node and we need to add its length to the total offset
                    totalOffset += (startNode.textContent || "").length;
                }
            } else break;
        }

        setSelectionData({
            text: selectedText,
            redactText: selectedText,
            start: totalOffset,
            end: totalOffset + selectedText.length,
            isVisible: true,
            messageId: message_id,
        });

        // required by the popover component
        const getBoundingClientRect = () => {
            return selection.getRangeAt(0).getBoundingClientRect();
        };
        setAnchorEl({getBoundingClientRect, nodeType: 1});
    };

    const redactSelectedText = () => {
        /* 
            when the user confirms the redaction, replace the selected text with the redact text 
        */

        // first get the replacing text from the div with id redact-tooltip
        const tooltip = document.getElementById('redact-tooltip');
        const redactText = tooltip.textContent;

        setSelectionData({ ...selectionData, isVisible: false});
        
        let selectedMessage = messages.find(message => message.message_id === selectionData.messageId);
        // if it is a long message, it is possible that there are multiple selections in the same message
        if (!selectedMessage.redaction) selectedMessage.redaction = [];
        selectedMessage.redaction.push({
            start: selectionData.start, // the start offset of the selected text within the whole original message
            end: selectionData.end, // the end offset of the selected text within the whole original message, both starts and ends are unique for each message
            originalText: selectionData.text, 
            redactText: redactText
        });

        updateOneMessage(selectionData.messageId, selectedMessage);
    };

    const cancelRedactText = (messageId, startPos) => {
        /* 
            when the user removes a redaction span 
            @param messageId: the id of the message that contains the redaction span
            @param startPos: the start offset of the redaction span within the whole original message
        */
        let selectedMessage = messages.find(message => message.message_id === messageId);
        selectedMessage.redaction = selectedMessage.redaction.filter(redact => redact.start !== startPos);
        updateOneMessage(messageId, selectedMessage);
    };

    const displayRedactedMessage = (message) => {
        /* build a JSX element that represents the redacted message with a small tick at the top right for canceling redaction */
        let redactedMessage = getRedactedMessage(message, (redact) => {
               
               return (<span className="relative inline-block redact-span" originallength={redact.originalText.length}>
                    <span className="bg-blue-50 p-1 font-bold rounded redact-span">{redact.redactText}</span>
                    <button
                        onClick={() => cancelRedactText(message.message_id, redact.start)}
                        className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-white rounded-full text-xs w-4 h-4 flex items-center justify-center border border-gray-300"
                    >
                        &times;
                    </button>
                </span>);
            });

        return <p className="text-base">{redactedMessage}</p>;
    };

    const handleMessageSelection = (messageId, check) => {
        /* 
            when the user selects or deselects a message in the message list, 
            We treat this as a special case of redaction, where the whole message is selected and replaced by a string of white spaces to indicate its length.
            @param message_id: the id of the message that is targeted
            @param check: whether the message is selected or deselected
        */
        // distinguish between two kinds of message ids =<message_id> and =<message_id>-<index>
        if(!messageId.includes('-')){
            // if the message is a text message
            let selectedMessage = messages.find(message => message.message_id === messageId);
            if(!selectedMessage) return;

            selectedMessage.selected = check;
            if(!check) {
                if(!selectedMessage.redaction) selectedMessage.redaction = [];
                selectedMessage.redaction.push({
                    start: 0,
                    end: selectedMessage.content.length,
                    originalText: selectedMessage.content,
                    redactText: ' '.repeat(selectedMessage.content.length)
                });
            } else {
                selectedMessage.redaction = selectedMessage.redaction.filter(redact => (redact.start !== 0 || redact.end !== selectedMessage.content.length));
            }
            updateOneMessage(messageId, selectedMessage);
        } else {
            // if the message is an attachment message
            let [textMessageId, attachIndex] = messageId.split('-');
            let selectedMessage = messages.find(message => message.message_id === textMessageId);
            if(!selectedMessage) return;

            
            selectedMessage.attachments[attachIndex].selected = check;
            console.log("updated attachment", selectedMessage.attachments[attachIndex]);
            updateOneMessage(textMessageId, selectedMessage);
        }
    };

    useEffect(() => {
        /* fetch reporting data and message windows from the backend */

        const queryParams = new URLSearchParams(window.location.search);
        const token = queryParams.get('token');
        setToken(token);

        const fetchData = async () => {
            try {
                // not sure why fetching data from the ngrok proxy does not work
                const response = await fetch(
                    `${REACT_APP_BACKEND}/react/redact-reports?token=${token}`,
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
                    console.log('jsonData.message_window.messages', jsonData.message_window.messages);
                    setMessages(jsonData.message_window.messages);
                    setReportedData({
                        reportedUserId: jsonData.reported_user_id,
                        reportingUserId: jsonData.reporting_user_id,
                        reportTimestamp: jsonData.reporting_timestamp,
                        reportedMessageId: jsonData.message_window.message_id,
                        channelId: jsonData.message_window.channel_id,
                        token: token
                    });
                }

            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, []);

    const expandMessageWindow = async (direction) => {
        /* 
            expand the message window to before or after the current message window
            @param direction: 'before' or 'after'
        */
        let message_id = direction === 'before' ? messages[0].message_id : messages[messages.length - 1].message_id;
        try {
                // not sure why fetching data from the ngrok proxy does not work
            const response = await fetch(
                `${REACT_APP_BACKEND}/react/expand-window?token=${token}&direction=${direction}&message_id=${message_id}`,
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
                // add a new field to each message object that indicates whether it is a new message or not
                let expandedMessages = jsonData.expanded_messages.map(message => {
                    message.new = true;
                    return message;
                });

                messages.forEach(message => message.new = false);
                if(direction === 'before') {
                    setMessages(jsonData.expanded_messages.concat(messages));
                } else {
                    setMessages(messages.concat(jsonData.expanded_messages));
                }
            }

        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const reportOnDiscord = async () => {   
        // send a POST request to the server to report the message on Discord
        let token = reportedData.token;
        let redactedMessages = messages.map(
            message => {
                let messagePieces = getRedactedMessage(message, (redact) => `<redact>${redact.redactText}</redact>`);
                return {
                    message_id: message.message_id,
                    content: messagePieces.join(''),
                    attachments: message.attachments,
                }
            }
        );

        await fetch(
            `${REACT_APP_BACKEND}/react/report-discord?token=${token}`,
            {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/plain, */*',
                    'Access-Control-Allow-Origin':'*'
                },
                body: JSON.stringify({
                    redactedMessages: redactedMessages,
                }),
            }
        );
        
    };
    
    if(messages.length > 0) {
        // group messages by author into an array of arrays, where each array contains sequential messages from the same author
        return (
            <div className='flex flex-col overflow-hidden w-full md:w-6/12 h-full p-2 mx-4 rounded-xl gap-y-4'>

                
                <MessageWindow
                    messages={messages}
                    reportedData={{
                        reportingUserId: reportedData.reportingUserId,
                        reportedMessageId: reportedData.reportedMessageId
                    }}
                    timeFormat="datetime"
                    enableCheckBox={true}
                    enbaleExpandMore={true}
                    handleContentSelection={handleContentSelection}
                    handleMessageSelection={handleMessageSelection}
                    displayMessage={displayRedactedMessage}
                    expandMessageWindow={expandMessageWindow}
                />
                
                
                <Popover
                    open={selectionData.isVisible}
                    anchorEl={anchorEl}
                    anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                    onClose={handlePopoverClose}
                >
                    <div className='flex p-2 rounded-xl items-center gap-x-2 h-fit'>
                        <div className='flex-grow-0 text-base'>
                            Redact with
                        </div>
                        <div contentEditable 
                            className=' text-gray-600 text-lg focus:outline-none bg-blue-50 rounded min-w-[120px] max-w-[360px] flex-grow px-2 py-1'
                            id='redact-tooltip'
                            suppressContentEditableWarning={true}
                        >
                            {selectionData.text}
                        </div>
                        <button 
                            className='bg-blue-400 hover:bg-blue-500 text-white py-1 px-2 rounded flex-grow-0'
                            onClick={redactSelectedText}
                        > 
                            Confirm
                        </button>
                    </div>
                </Popover>
                <div className='flex-grow-0 self-end mx-4'>
                    <button 
                        onClick={reportOnDiscord}
                        className='bg-blue-400 hover:bg-blue-500 text-white py-1 px-2 rounded flex-grow-0'
                    >
                        Report on Discord
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

export default RedactReports;