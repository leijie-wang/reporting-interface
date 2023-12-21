import React from 'react';
import Checkbox from './checkbox';
import styles from "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import '../index.css';
import {
    MessageList,
    Message,
    MessageGroup,
    MessageInput,
    Avatar,

  } from "@chatscope/chat-ui-kit-react";



const getAvatar = (author) => {
    return (author.avatarURL ? author.avatarURL : (author.bot ? "bot_avatar.png" : "user_avatar.png"));
};

function MessageWindow(props) {
    const { messages, reportedData, timeFormat, enableCheckBox, handleContentSelection, displayMessage} = props;

    const groupedMessages = messages.reduce((acc, message) => {
        const lastMessage = acc[acc.length - 1];
        if(lastMessage && lastMessage[0].author.username === message.author.username) {
            lastMessage.push(message);
        } else {
            acc.push([message]);
        }
        return acc;
    }, []);

    const convertTimestampToDate = (timestamp) => {
        if(timeFormat === 'datetime'){
            return  new Date(timestamp).toLocaleTimeString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        } else if(timeFormat === 'date'){
            return  new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    };

    return (
        <div className='flex flex-col rounded-lg p-2 border border-gray-300 h-full'>
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
                                                                return;
                                                            }} 
                                                            selected={true} 
                                                        />
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
                                                                {displayMessage(message)}
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
        </div>
    );



};

export default MessageWindow;
