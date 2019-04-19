'use strict';

// import applyDevTools from "prosemirror-dev-tools";

import './style.css';

import {schema} from "prosemirror-schema-basic"
import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {Step} from "prosemirror-transform"
import {collab, getVersion, receiveTransaction, sendableSteps} from "prosemirror-collab"
import {exampleSetup} from 'prosemirror-example-setup';
import axios from 'axios';
import 'prosemirror-example-setup/style/style.css';
import Mutex from "await-mutex";

function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
        vars[key] = value;
    });
    return vars;
}

let plugins = exampleSetup({schema});
let version = 0;
let fileName = getUrlVars()["name"];
let view = null;
let webSocket = null;
const mutex = new Mutex();
let urlText;
let clientIDText;
let versionText;

function createWebSocket(name) {
    console.log(`about to start ws for ${name}`);
    if (webSocket) {
        webSocket.close();
    }
    webSocket = new WebSocket(`ws://localhost:8000/ws?name=${name}`);
    webSocket.onmessage = pull;
    webSocket.onclose = () => {
        if (fileName === name) {
            createWebSocket(name)
        }
    };
}

async function newFile() {
    const res = await axios.post(`http://localhost:8000/new`);
    createWebSocket(res.data.fileName);
    if (view) {
        view.destroy()
    }
    view = await newView()
    updateDisplay(res.data.fileName);
}

async function newView() {
    let state = EditorState.create({
        schema,
        plugins: [...plugins,
            collab({version})
        ]
    });
    console.log({version: getVersion(state), steps: sendableSteps(state)});
    return new EditorView(document.body, {
        state,
        dispatchTransaction(transaction) {
            let newState = view.state.apply(transaction)
            view.updateState(newState)
            push()
        }
    });
}

function makeRo() {
    let f =
        document.createElement("input");
    f.setAttribute('type', 'text');
    f.setAttribute('type', 'text');
    f.setAttribute('placeholder', 'No file loaded');
    f.setAttribute('readonly', 'true');
    return f
}

function render() {
    const newButton = document.createElement("button");
    newButton.textContent = 'New';
    newButton.onclick = newFile;

    const pushButton = document.createElement("button");
    pushButton.textContent = 'Push';
    pushButton.onclick = () => {
        const steps = sendableSteps(view.state);
        if (steps) {
            push(view);
        }
    };

    urlText = makeRo();
    clientIDText = makeRo();
    versionText = makeRo();

    document.body.appendChild(newButton);
    document.body.appendChild(urlText);
    document.body.appendChild(clientIDText);
    document.body.appendChild(versionText);
    document.body.appendChild(pushButton);
}

function updateDisplay(name) {
    fileName = name;
    clientIDText.setAttribute('value', view.state.config.pluginsByKey.collab$.spec.config.clientID
    );
    urlText.setAttribute('value', fileName);
    versionText.setAttribute('value', getVersion(view.state));
    window.history.pushState(null, null, `/?name=${fileName}`);
}

function applySteps(data) {
    const steps = data.steps;
    const clientIDs = steps.map(s => s.clientID);
    const newSteps = steps.map(s => Step.fromJSON(schema, s.step));
    let tr = receiveTransaction(view.state, newSteps, clientIDs);
    const newState = view.state.apply(tr);
    console.log({oldVersion: getVersion(view.state)});
    view.updateState(newState);
    updateDisplay(data.fileName);
    console.log({newVersion: getVersion(view.state)});
}

async function push() {
    const unlock = await mutex.lock()
    console.log({state: view.state})
    let steps;
    while ((steps = sendableSteps(view.state))) {
        console.log({steps});
        console.log("sending...\n");
        try {
            const res = await axios.post(`http://localhost:8000/update`, {fileName, ...steps});
            console.log("...sent\n");
            console.log({res});
            if (res.data) {
                applySteps(res.data)
            }
        } catch {
        }
    }
    unlock()
}

async function pull() {
    const unlock = await mutex.lock()
    if (!view) {
        fileName = getUrlVars()["name"];
        view = await newView()
    }
    try {
        const res = await axios.get(`http://localhost:8000/?name=${fileName}&version=${getVersion(view.state)}`);
        console.log({res});
        if (res.data) {
            applySteps(res.data)
        }
        updateDisplay(fileName);
    } catch {
    }
    unlock()
}

async function init() {
    render();
    if (fileName) {
        await pull();
        createWebSocket(fileName);
    }
}
init()

