import React from 'react';
import { FcHighPriority  } from "react-icons/fc";


function Checkbox(props) {

    // add a prop that represents whether the checkbox is checked or not
    const [selected, setSelected] = React.useState(props.selected);

    const handleChange = (event) => {
        // Call the passed callback function with the checked state
        setSelected(event.target.checked);
        props.selectMessage(event.target.checked);
    };

    if(!props.isReportedMessage){
        return (
            <label className="scale-125">
                <input type="checkbox" checked={selected} onChange={handleChange} />
            </label>
        );
    } else {
        // return a checkbox with a red background and an exclamation mark
        return (
            <label className="scale-150 ">
                <FcHighPriority />
            </label>
        );
    }
};

export default Checkbox;
