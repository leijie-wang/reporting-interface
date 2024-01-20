import React, { useState, useEffect } from 'react';
import MessageWindow from './components/messagewindow';
import './index.css';
import { main } from '@popperjs/core';

const convertTimestampToDate = (timeString) => {
    return  new Date(timeString).toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit'});
};


const ModerateReports = (props) => {
    const [reports, setReports] = useState([]);
    const [currentReport, setCurrentReport] = useState(null);
    const [reviewDecision, setReviewDecision] = useState(null);
    const [interactionOption, setInteractionOption] = useState(null);
    const [uncoverRedactedMessage, setUncoverRedactedMessage] = useState([]);

    useEffect(() => {

        const fetchData = async () => {
            try {
                // not sure why fetching data from the ngrok proxy does not work
                const response = await fetch(
                    `http://localhost:3000/react/review-reports`,
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
                // setReports(jsonData);
                let fakeReports = Array(6).fill(jsonData).flatMap(x => x.map(report => ({ ...report })));
                fakeReports.forEach((report, index) => {
                    // generate a random time string between 2023 and 2024 for each like "2023-12-08T03:42:11.679Z"
                    report.reporting_timestamp = new Date(1672521731679 + Math.floor(Math.random() * 31536000000)).toISOString();
                    // generate a random string from the list ["resolved", "pending", "waiting"]
                    report.reviewing_status = ["resolved", "pending", "waiting"][Math.floor(Math.random() * 3)];
                });
                // sort reports by timestamp
                fakeReports.sort((a, b) => new Date(b.reporting_timestamp) - new Date(a.reporting_timestamp));
                setReports(fakeReports);
                console.log(jsonData);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, []);

    const handleReviewDecision = (event) => {
        setReviewDecision(event.target.value);
      };
    
    const handleUncoverRedactedMessage = (event, messageId, redactedPiece) => {
        if (event.target.checked) {
            setUncoverRedactedMessage([...uncoverRedactedMessage, {
                messageId: messageId,
                redactedPiece: redactedPiece
            }]);
        } else {
            setUncoverRedactedMessage(uncoverRedactedMessage.filter((item) => (item.messageId !== messageId && item.redactedPiece !== redactedPiece)));
        }
    };

    const displayRedactedMessage = (message) => {
        // find patterns like <redact>random strings</redact> in the message.content
        let pattern = /<redact>|<\/redact>/;
        const elements = message.content.split(pattern).map((piece, index) => {
            // every odd piece of text is enclosed in redact tags
            if (index % 2 === 1) {
                return (
                    <span className="inline-flex items-center gap-x-1 bg-blue-50 p-1 rounded">
                        <span className="font-bold">{piece}</span>
                        <input type="checkbox" 
                            onClick={(event) => handleUncoverRedactedMessage(event, message.id, piece)}
                            className="inline-checkbox rounded-full text-xs w-4 h-4 flex items-center justify-center border border-gray-300" />
                    </span>
                );
            } else return piece;
        });
        return elements;
    };

    const sentReviewDecision = () => {
        let decision = {
            reviewDecision: reviewDecision,
            interactionOption: interactionOption,
            uncoverRedactedMessage: uncoverRedactedMessage
        };
        currentReport.reviewing_status = (["dismiss", "remove"].includes(reviewDecision) ? "resolved" : "pending");
        currentReport.review_decision = reviewDecision;
        return;

    };
    return (
        <div className='flex flex-col h-full items-stretch my-2 p-2 rounded-xl gap-y-4 overflow-hidden'>
            <div className="header flex-grow-0 self-center">
                <div className="text-3xl text-gray-700 font-bold"></div>
            </div>
            <div className="body h-1 flex-grow flex gap-x-4">
                <div className="review-list w-[27%] flex flex-col items-stretch gap-y-2 py-4 px-2 rounded border border-gray-400">
                    <div className="flex-grow-0 text-lg font-bold text-gray-700">Review List</div>
                    <div className="flex flex-col flex-grow gap-y-2 overflow-y-auto h-1">
                        {
                            reports.map((report, index) => {
                                let mainColor = "";
                                if (report.reviewing_status === "resolved") {
                                    mainColor = "blue";
                                } else if (report.reviewing_status === "pending") {
                                    mainColor = "orange";
                                } else if (report.reviewing_status === "waiting") {
                                    mainColor = "rose";
                                }
                                return (
                                    <div   
                                        className={`flex flex-col border border-gray-10 rounded p-2` + (
                                            mainColor === "blue" ? " bg-blue-100" : mainColor === "orange" ? " bg-orange-100" : " bg-rose-100"
                                        ) + (currentReport === report ? " ring-4 ring-gray-200 " : " bg-opacity-80")}
                                        key={index}
                                        onClick={() => {setCurrentReport(report)}}
                                    >
                                        <div className="flex-grow-0 text-sm text-gray-500">{convertTimestampToDate(report.reporting_timestamp)}</div>
                                        <div className="">{report.report_reason}</div>
                                    </div>
                                );
                            })
                        }
                    </div>
                </div>
                <div className="review-panel w-[70%] flex-grow flex flex-col gap-y-4 items-stretch py-4 px-2 rounded border border-gray-400 divide-dashed divide-y divide-gray-400">
                    {
                        currentReport && (
                            <div className="report-decision h-[25%] flex flex-col gap-y-6 px-4">
                                <div className="flex-grow-0 flex gap-x-4 items-center">
                                    <div className="text-lg font-bold">Moderation Decisions</div>
                                    <div>
                                        <select id="options-select"
                                            className="bg-gray-50 border text-gray-900 text-lg focus:ring-blue-500 focus:border-blue-500 w-full p-2.5"
                                            value={reviewDecision}
                                            onChange={handleReviewDecision}
                                        >
                                            <option value="">What is your moderation decision?</option>
                                            <option value="dismiss">Dimiss</option>
                                            <option value="remove">Remove content</option>
                                            <option value="request">Ask for more information</option>
                                        </select>
                                    </div>
                                    <div>
                                        <button 
                                            className={`bg-blue-500 text-white font-bold py-2 px-4 rounded ${reviewDecision === null ? "hidden" : ""}`}
                                            onClick={() => {sentReviewDecision()}}
                                        >
                                            Submit
                                        </button>
                                    </div>
                                </div>
                                { reviewDecision === "request" && (
                                    <div className="flex-grow h-1 flex flex-col gap-x-4 items-start">
                                        
                                        <div className="text-lg">To ask for more information, you may ask the reporting person to ... </div>
                                        <div className="flex gap-2 p-4 w-[75%]">
                                            <div className="flex items-center">
                                                <input type="radio" id="uncover-option" 
                                                    value="uncover-option" className="w-4 h-4" 
                                                    checked={interactionOption === 'uncover-option'}
                                                    onChange={() => setInteractionOption('uncover-option')}
                                                />
                                                <label htmlFor="uncover-option" className="ml-2">Uncover all selected redacted messages</label>
                                            </div>
                                            <div className="flex items-center">
                                                <input type="radio" id="witness-option" 
                                                    value="witness-option" className="w-4 h-4" 
                                                    checked={interactionOption === 'witness-option'}
                                                    onChange={() =>  setInteractionOption('witness-option')}
                                                />
                                                <label htmlFor="witness-option" className="ml-2">Involve a random witness from the group chat</label>
                                            </div>
                                            <div className="flex items-center">
                                                <input type="radio" id="defend-option" 
                                                    value="defend-option" className="w-4 h-4" 
                                                    checked={interactionOption === 'defend-option'}
                                                    onChange={() => setInteractionOption('defend-option')}
                                                />
                                                <label htmlFor="defend-option" className="ml-2">Involve the reported person to defend themselves</label>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    }
                    {
                        currentReport &&
                            (<div className="report-details h-[75%] flex gap-x-4 justify-between px-4 items-stretch py-2">
                                <div className="report-summary w-[45%] h-full flex flex-col gap-y-2 items-stretch">
                                    <div class="header flex-grow-0 text-lg font-bold text-gray-700">Reporting Summary</div>
                                    <div class="body flex-grow flex flex-col rounded-lg p-2 border border-gray-300 h-full gap-y-2  bg-gray-50">
                                        <div className="text-sm italic text-gray-500 px-4">
                                            Reported on {convertTimestampToDate(currentReport.reporting_timestamp)}
                                        </div>
                                        <div className="flex flex-col gap-y-2 px-4 py-2">
                                            <div className="flex flex-col gap-y-1">
                                                <div className="text-base font-medium">Report for Whom</div>
                                                <div className="text-base text-gray-800 italic">{currentReport.report_for_whom.join(", ")}</div>
                                            </div>
                                            <div className="flex flex-col gap-y-1">
                                                <div className="text-base font-medium">Reporting Reason</div>
                                                <div className="text-base text-gray-800 italic">They are being {currentReport.report_reason.toLowerCase()}</div>
                                            </div>
                                            <div className="flex flex-col gap-y-1">
                                                <div className="text-base font-medium">More Details</div>
                                                <div className="text-sm text-gray-800 italic">{currentReport.report_details}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="report-message w-[55%] h-full flex flex-col gap-y-2 items-stretch">
                                    <div class="header flex-grow-0 text-lg font-bold text-gray-700 ">Redacted Message Window</div>
                                    <div className="flex-grow h-1">
                                        <MessageWindow
                                            messages={currentReport.messages}
                                            reportedData={{
                                                reportingUserId: currentReport.reporting_user_id,
                                                reportedMessageId: currentReport.reported_message_id
                                            }}
                                            timeFormat="datetime"
                                            enableCheckBox={false}
                                            handleContentSelection={() => {}}
                                            displayMessage={displayRedactedMessage}
                                        />
                                    </div>
                                </div>
                            </div>)
                    }
                    
                </div>
            </div>
            <div className="bottom flex-grow-0">
            </div>
        </div>
    );

}
export default ModerateReports;