import React, { useState, useEffect } from 'react';
import styles from "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import './index.css';
import {
    MessageList,
    Message,
    MessageGroup,
    MessageInput,
    Avatar,

  } from "@chatscope/chat-ui-kit-react";
import Popover from '@mui/material/Popover';
import Checkbox from './components/checkbox';

const RedactReports = (props) => {
    const [messages, setMessages] = useState([]);
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

    // close the popover when the user clicks outside of it
    const handleClose = () => {
        setSelectionData({ ...selectionData, isVisible: false });
    };

    const getNearestHTMLNode = (node) => {
        while (node && node.nodeType !== Node.ELEMENT_NODE) {
            node = node.parentNode;
        }
        return node;
    };

    const handleContentSelection = (message_id) => {
        const selection = window.getSelection();
        console.log('selection', selection);
        let selectedText = selection.toString();
        
        let range = selection.getRangeAt(0);
        // console.log(getNearestHTMLNode(range.startContainer));
        // console.log(getNearestHTMLNode(range.endContainer));
        // console.log(getNearestHTMLNode(range.commonAncestorContainer));
        // console.log(range.startOffset, range.endOffset);
        if (selectedText.length > 0) {
            // make sure the selected text is part of a single message as the selection can span multiple messages
            let commonAncestorNode= getNearestHTMLNode(range.commonAncestorContainer);
            if(!commonAncestorNode.classList.contains('text-base')) return;

            // check whether the selected text overlaps with the existing redaction span
            let startNode = getNearestHTMLNode(range.startContainer);
            let endNode = getNearestHTMLNode(range.endContainer);
            if(startNode.classList.contains('redact-span') || endNode.classList.contains('redact-span')) return;

            // calculate the total offset of the selected text within the whole message
            let totalOffset = range.startOffset;
            startNode = range.startContainer;
            while(startNode) {
                if(startNode.previousSibling){
                    startNode = startNode.previousSibling;
                    // check whether it has an attribute length
                    if(startNode.getAttribute){
                        totalOffset += parseInt(startNode.getAttribute('originalLength'));
                    } else {
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

            const getBoundingClientRect = () => {
                return selection.getRangeAt(0).getBoundingClientRect();
            };

            setAnchorEl({getBoundingClientRect, nodeType: 1});
        }
    };


    const redactSelectedText = () => {
        // first get the replacing text from the div with id redact-tooltip
        const tooltip = document.getElementById('redact-tooltip');
        const redactText = tooltip.textContent;

        setSelectionData({ ...selectionData, isVisible: false});
        
        let selectedMessage = messages.find(message => message.id === selectionData.messageId);
        // if it is a long message, it is possible that there are multiple selections in the same message
        if (!selectedMessage.redaction) selectedMessage.redaction = [];
        selectedMessage.redaction.push({
            start: selectionData.start,
            end: selectionData.end,
            originalText: selectionData.text, 
            redactText: redactText
        });
    };

    const cancelRedactText = (messageId, startPos) => {
        const updatedMessages = messages.map(message => {
            if (message.id === messageId) {
                // Create a copy of the message and update its redaction array
                return {
                    ...message,
                    redaction: message.redaction.filter(redact => redact.start !== startPos),
                };
            }
            return message;
        });
    
        // Update the state with the new array
        setMessages(updatedMessages);
        
        
    };

    const getRedactedMessage = (message, wrapRedactText) => {
        if (!message.redaction) return [message.content];
        let redaction = message.redaction;
        redaction.sort((a, b) => a.start - b.start);

        let originalMessage = message.content;
        let elements = [];
        let lastIndex = 0;
        
        redaction.forEach(redact => {
            elements.push(originalMessage.substring(lastIndex, redact.start));
            elements.push(wrapRedactText(redact));
            lastIndex = redact.end;
        });

        // Append the remaining part of the original string
        elements.push(originalMessage.substring(lastIndex));
        return elements;
    };

    const getAvatar = (author) => {
        return (author.avatarURL ? author.avatarURL : (author.bot ? "bot_avatar.png" : "user_avatar.png"));
    };

    const convertTimestampToDate = (timestamp) => {
        return  new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
    };

    const displayRedactedMessage = (message) => {
        // build a JSX element that represents the redacted message
        let redactedMessage = getRedactedMessage(message, (redact) => {
               
               return (<span className="relative inline-block redact-span" originalLength={redact.originalText.length}>
                    <span className="bg-blue-50 p-1 font-bold rounded redact-span">{redact.redactText}</span>
                    <button
                        onClick={() => cancelRedactText(message.id, redact.start)}
                        className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-white rounded-full text-xs w-4 h-4 flex items-center justify-center border border-gray-300"
                    >
                        &times;
                    </button>
                </span>);
            });

        return <p className="text-base">{redactedMessage}</p>;
    };


    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const token = queryParams.get('token');
        setToken(token);

        const fetchData = async () => {
            try {
                // not sure why fetching data from the ngrok proxy does not work
                const response = await fetch(
                    `http://localhost:3000/react/redact-reports?token=${token}`,
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
                const jsonData = await response.json();
                console.log('jsonData', jsonData);
                setMessages(jsonData.messages);
                setReportedData({
                    reportedMessageId: jsonData.message_id,
                    reportedUserId: jsonData.reported_user_id,
                    reportingUserId: jsonData.reporting_user_id,
                    reportTimestamp: jsonData.reporting_timestamp,
                    channelId: jsonData.channel_id,
                    token: token
                });

            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, []);


    const reportOnDiscord = async () => {   
        // send a POST request to the server to report the message on Discord
        let token = reportedData.token;
        let redactedMessages = messages.map(
            message => {
                let messagePieces = getRedactedMessage(message, (redact) => `<redact>${redact.redactText}</redact>`);
                return messagePieces.join('');
            }
        );

        await fetch(
            `http://localhost:3000/react/report-discord?token=${token}`,
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

    // const convertTimestampToDate = (timestamp) => {
    //     return  new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // };

    // const getAvatar = (author) => {
    //     return (author.avatarURL ? author.avatarURL : (author.bot ? "bot_avatar.png" : "user_avatar.png"));
    // };
    
    if(messages.length > 0) {
        // group messages by author into an array of arrays, where each array contains sequential messages from the same author
        const groupedMessages = messages.reduce((acc, message) => {
            const lastMessage = acc[acc.length - 1];
            if(lastMessage && lastMessage[0].author.username === message.author.username) {
                lastMessage.push(message);
            } else {
                acc.push([message]);
            }
            return acc;
        }, []);


        return (
            <div className='flex flex-col overflow-hidden w-7/12 h-full m-4 p-2 rounded-xl gap-y-4'>
                <div className='h-5/6 border rounded-xl p-2 border-gray-300'>
                    <MessageList>
                        {
                            groupedMessages.map((messageGroup, index) => {
                                let author = messageGroup[0].author;
                                let firstMessageTime = convertTimestampToDate(messageGroup[0].timestamp);
                                
                                return (
                                    <MessageGroup 
                                        direction={author.id === reportedData.reportingUserId ? 'outgoing' : 'incoming'}
                                        sender={author.id} 
                                        sentTime={firstMessageTime}
                                        key={`messageGroup-${messageGroup[0].id}`}
                                    > 
                                        <MessageGroup.Messages>
                                            {
                                                messageGroup.map((message, index) => {
                                                        return (
                                                            <div className='flex justify-between items-center gap-x-4'>
                                                                <Checkbox 
                                                                    isReportedMessage={reportedData.reportedMessageId === message.id}
                                                                    selectMessage={(check) => {
                                                                        message.selected = check;
                                                                    }} 
                                                                    
                                                                    selected={true} />
                                                                <Message
                                                                    key={`message-${message.id}`}
                                                                    id={`message-${message.id}`}
                                                                    model={{
                                                                        type: "custom",
                                                                        sentTime: convertTimestampToDate(message.timestamp),
                                                                        sender: message.author.id,
                                                                        direction: message.author.id === reportedData.reportingUserId ? 'outgoing' : 'incoming',
                                                                        position: "first",
                                                                    }}
                                                                    onMouseUp={() => handleContentSelection(message.id)}
                                                                    avatarSpacer={index !== 0}
                                                                >
                                                                    {index === 0 && (
                                                                        <Avatar src={getAvatar(author)} name={message.author.id} className='border border-gray-200'/>
                                                                    )}
                                                                    <Message.CustomContent>
                                                                        {displayRedactedMessage(message)}
                                                                    </Message.CustomContent>
                                                                </Message>
                                                            </div>
                                                        );
                                                    })
                                            }
                                        </MessageGroup.Messages>
                                    </MessageGroup>);
                            })
                        }
                    </MessageList>
                    <Popover
                        open={selectionData.isVisible}
                        anchorEl={anchorEl}
                        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                        onClose={handleClose}
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
                </div>
                <div className='flex-grow-0 self-end'>
                    <button 
                        onClick={reportOnDiscord}
                        className='bg-blue-400 hover:bg-blue-500 text-white py-1 px-2 rounded flex-grow-0'
                    >
                        Report on Discord
                    </button>
                </div>
            </div>
        );
    }
};

export default RedactReports;