export function getAvatar(author) {
    return (author.avatarURL ? author.avatarURL : (author.bot ? "bot_avatar.png" : "user_avatar.png"));
};

export function convertTimestampToDate(timestamp) {
    return  new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};


// used to find the nearest text node to the selected text
export function getNearestHTMLNode(node) {
    while (node && node.nodeType !== Node.ELEMENT_NODE) {
        node = node.parentNode;
    }
    return node;
};

export function isSelectionValid(selection){
    let selectedText = selection.toString();

    // if no text is selected, then the selection is not valid
    if(selectedText.length === 0) return false;

    /* console.log(getNearestHTMLNode(range.startContainer));
    console.log(getNearestHTMLNode(range.endContainer));
    console.log(getNearestHTMLNode(range.commonAncestorContainer));
    console.log(range.startOffset, range.endOffset); */
    let range = selection.getRangeAt(0);


    /* 
        make sure the selected text is part of a single message as the selection can span multiple messages;
        in the used message library, each message is wrapped in a div with class 'text-base'
    */
    let commonAncestorNode= getNearestHTMLNode(range.commonAncestorContainer);
    if(!commonAncestorNode.classList.contains('text-base')) return false;

    /* 
        check whether the selected text overlaps with the existing redaction span
        we iterated through all children nodes of the current 
    */
    let currentNode = range.startContainer;
    let endNode = range.endContainer;
    while(currentNode && currentNode !== endNode){
        // this works if the start container is a text node within the redaction span
        if(currentNode.nodeType === Node.TEXT_NODE && currentNode.parentNode.classList.contains('redact-span')) return false;
        // this works if the current node is a sibling of the start container and it is a redaction span
        if(currentNode.nodeType === Node.ELEMENT_NODE && currentNode.classList.contains('redact-span')) return false;
        
        currentNode = currentNode.nextSibling;
    }
    // check the last node
    if(endNode.nodeType === Node.ELEMENT_NODE && endNode.classList.contains('redact-span')) return false;
    return true;
}

export function getRedactedMessage(message, wrapRedactText){
    /*
        @param message: the message object
        @param wrapRedactText: a function that takes a redaction object as input and returns a JSX element that wraps the redacted text
        @return: an array of JSX elements that represents the message with redaction spans
    */

    if (!message.redaction) return [message.content];
   
    let redaction = message.redaction;
    // sort the redaction spans by their start offset
    redaction.sort((a, b) => a.start - b.start);

    let originalMessage = message.content;
    let elements = [];
    let lastIndex = 0;
    
    redaction.forEach(redact => {
        // first append the part of the original string before the redaction span
        elements.push(originalMessage.substring(lastIndex, redact.start)); 
        // then append the redaction span
        elements.push(wrapRedactText(redact)); 
        lastIndex = redact.end;
    });

    // Append the remaining part of the original string
    elements.push(originalMessage.substring(lastIndex));
    return elements;
};