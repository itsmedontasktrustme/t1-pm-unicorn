import {useState} from "react";

function TodoList({ counter, callback }) {
    // const {counter, children} = props;
     const [n, setN] = useState(0);
     const [switcher, setSwitcher] = useState(false);
    return (
        // <button>I'm a button</button>
        <div>
        This is my text
        This is the counter passed: {n}

        <button disabled={switcher} onClick={() => setN(n+1)}> click to increment counter</button>
            <br/>
        <button onClick={() => setSwitcher(!switcher)}>CLICK TO disable INCREMENTER</button>
        <button onClick={callback}>CLICK TO TRIGGER CALLBACK</button>
        </div>

    );
}
export default TodoList;