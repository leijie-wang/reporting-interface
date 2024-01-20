import React, {useState, useEffect, useRef} from 'react';
import Checkbox from './checkbox';
import styles from "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import '../index.css';
import {
    MessageList,
    Message,
    MessageGroup,
    MessageSeparator,
    Avatar
  } from "@chatscope/chat-ui-kit-react";



const getAvatar = (author) => {
    return (author.avatarURL ? author.avatarURL : (author.bot ? "bot_avatar.png" : "user_avatar.png"));
};

function MessageWindow(props) {
    const { messages, reportedData, timeFormat, enableCheckBox, enbaleExpandMore, handleContentSelection, handleMessageSelection, displayMessage, expandMessageWindow} = props;


    /* while the discord treats messages with images as a single message, the message library treats each image as a separate message,
        so we need to expand them into more messages */

    const expanededMessages = messages.reduce((acc, message) => {
        // Add the original message first
        let attachments = message.attachments;
        
        if(message.content.length > 0){
            /* 
                in discord people cannot send empty messages unless there is an image attached
                In such cases, the message content is empty and the image is in the attachment
            */
            message.type = 'text';
            acc.push(message);
        }
    
        // If the message has attachments, expand them into new messages
        if (attachments && attachments.length > 0) {
            // console.log("attachments found", message);
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
        const lastMessageGroup = acc[acc.length - 1];
        // start a new group when the author or new status changes; for the latter, we want to add a separator there
        if(lastMessageGroup && lastMessageGroup[0].author.username === message.author.username && lastMessageGroup[0].new === message.new) {
            lastMessageGroup.push(message);
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
        <div className='flex-grow-1 flex flex-col rounded-2xl p-2 border border-gray-300 bg-gray-100 overflow-y-auto'>

            <MessageList>
                {enbaleExpandMore && 
                    (<MessageSeparator>
                        < button onClick={() => expandMessageWindow("before")} 
                            className='bg-blue-50 py-1 px-2 rounded'
                            >
                            Expand More
                        </button>
                    </MessageSeparator>)
                }
                {
                    groupedMessages.map((messageGroup, index) => {
                        let author = messageGroup[0].author;
                        let firstMessageTime = convertTimestampToDate(messageGroup[0].timestamp);
                        if(groupedMessages.filter(i => i[0].message_id === messageGroup[0].message_id).length > 1){
                            console.log("dupicate key found", messageGroup[0].message_id);
                        }
                        let elementArrays = [];
                        if(enbaleExpandMore && groupedMessages[index-1] && groupedMessages[index-1][0].new !== messageGroup[0].new){
                            elementArrays.push(
                                <MessageSeparator>
                                    <div className='flex justify-center items-center gap-x-2 text-red-500 font-medium'>New {messageGroup[0].new ? "Below" : "Above"}</div>
                                </MessageSeparator>
                            );
                        }
                        elementArrays.push(
                            <MessageGroup 
                                direction={author.id === reportedData.reportingUserId ? 'outgoing' : 'incoming'}
                                sender={author.id} 
                                sentTime={firstMessageTime}
                                key={`messageGroup-${messageGroup[0].message_id}`}
                            > 
                                <MessageGroup.Header>{convertTimestampToDate(messageGroup[0].timestamp)}</MessageGroup.Header>
                                <MessageGroup.Messages>
                                    {
                                        messageGroup.map((message, index) => {
                                            return (
                                                <div className='flex justify-between items-center gap-x-4 my-1'>
                                                    { enableCheckBox &&
                                                        (<Checkbox 
                                                            isReportedMessage={reportedData.reportedMessageId === message.message_id}
                                                            selectMessage={(check) => {
                                                                handleMessageSelection(message.message_id, check);
                                                            }} 
                                                            selected={true} 
                                                        />)
                                                    }
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
                            return elementArrays;
                    })
                }
                {enbaleExpandMore && (
                    <MessageSeparator>
                        < button onClick={() => expandMessageWindow("after")} 
                            className='bg-blue-50 py-1 px-2 rounded'
                            >
                            Expand More
                        </button>
                    </MessageSeparator>
                )}
            </MessageList>
        </div>
    );



};

export default MessageWindow;
