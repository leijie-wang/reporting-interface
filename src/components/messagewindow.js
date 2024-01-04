import React from 'react';
import Checkbox from './checkbox';
import styles from "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import '../index.css';
import {
    MessageList,
    Message,
    MessageGroup,
    MessageInput,
    Avatar
  } from "@chatscope/chat-ui-kit-react";



const getAvatar = (author) => {
    return (author.avatarURL ? author.avatarURL : (author.bot ? "bot_avatar.png" : "user_avatar.png"));
};

function MessageWindow(props) {
    const { messages, reportedData, timeFormat, enableCheckBox, handleContentSelection, handleMessageSelection, displayMessage} = props;
    
    /* while the discord treats messages with images as a single message, the message library treats each image as a separate message,
        so we need to expand them into more messages */

    const expanededMessages = messages.reduce((acc, message) => {
        // Add the original message first
        let attachments = message.attachments;
        message.type = 'text';
        // delete its attributes but still keep access to attachments

        acc.push(message);
    
        // If the message has attachments, expand them into new messages
        if (attachments && attachments.length > 0) {
            attachments.forEach((attachment, index) => {
                const attachmentMessage = {
                    ...message, // Copy the original message
                    type: attachment.content_type,
                    content: attachment.url,
                    filename: attachment.filename,
                    message_id: `${message.message_id}-${index}`,
                    selected: attachment.selected ?? message.selected ?? true,
                };
                delete attachmentMessage.attachments;
                acc.push(attachmentMessage); // Add the new message right after the original
            });
        }
    
        return acc;
    }, []);

    

    const groupedMessages = expanededMessages.reduce((acc, message) => {
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
        <div className='flex-grow-1 flex flex-col rounded-lg p-2 border border-gray-300 overflow-y-auto'>
            <MessageList>
                {
                    groupedMessages.map((messageGroup, index) => {
                        let author = messageGroup[0].author;
                        let firstMessageTime = convertTimestampToDate(messageGroup[0].timestamp);
                        if(groupedMessages.filter(i => i[0].message_id === messageGroup[0].message_id).length > 1){
                            console.log("dupicate key found", messageGroup[0].message_id);
                        }
                        return (
                            <MessageGroup 
                                direction={author.id === reportedData.reportingUserId ? 'outgoing' : 'incoming'}
                                sender={author.id} 
                                sentTime={firstMessageTime}
                                key={`messageGroup-${messageGroup[0].message_id}`}
                            > 
                                <MessageGroup.Messages>
                                    {
                                        messageGroup.map((message, index) => {
                                            return (
                                                <div className='flex justify-between items-center gap-x-4'>
                                                    <Checkbox 
                                                        isReportedMessage={reportedData.reportedMessageId === message.message_id}
                                                        selectMessage={(check) => {
                                                            handleMessageSelection(message.message_id, check);
                                                        }} 
                                                        selected={true} 
                                                    />
                                                    <Message
                                                        key={`message-${message.message_id}`}
                                                        model={{
                                                            type: "custom",
                                                            sentTime: convertTimestampToDate(message.timestamp),
                                                            sender: message.author.id,
                                                            direction: message.author.id === reportedData.reportingUserId ? 'outgoing' : 'incoming',
                                                            position: "first",
                                                        }}
                                                        onMouseUp={() => handleContentSelection(message.message_id)}
                                                        avatarSpacer={index !== 0}
                                                    >
                                                        {index === 0 && (
                                                            <Avatar src={getAvatar(author)} name={message.author.id} className='border border-gray-200'/>
                                                        )}
                                                        { 
                                                            message.type === "text" ? (
                                                                <Message.CustomContent>
                                                                    {displayMessage(message)}
                                                                </Message.CustomContent>
                                                            ) : (
                                                                <Message.ImageContent 
                                                                    src={message.content} 
                                                                    alt={message.filename} 
                                                                    width={200}
                                                                    className={message.selected ? '' : 'blurred-image'}
                                                                />
                                                            )   
                                                        }
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
