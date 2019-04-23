'use strict';
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
import Url from "url-parse"

let plugins = exampleSetup({schema});
let version = 0;
let fileName = Url(window.location.href, null, true).query.name;
const addr = `${Url(window.location.href, null, true).hostname}:8000`;
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
    webSocket = new WebSocket(`ws://${addr}/ws?name=${name}`);
    webSocket.onmessage = pull;
    webSocket.onclose = () => {
        if (fileName === name) {
            createWebSocket(name)
        }
    };
}

async function newFile() {
    const unlock = await mutex.lock();

    const res = await axios.post(`http://${addr}/new`);
    createWebSocket(res.data.fileName);
    if (view) {
        view.destroy()
    }
    view = await newView();
    updateDisplay(res.data.fileName);
    unlock()

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
        async dispatchTransaction(transaction) {
            let newState = view.state.apply(transaction);
            view.updateState(newState);
            await push()
        }
    });
}

function makeRo(id ) {
    let f =
        document.createElement("input");
    f.setAttribute('id', id);
    f.setAttribute('type', 'text');
    f.setAttribute('type', 'text');
    f.setAttribute('placeholder', 'No file loaded');
    f.setAttribute('readonly', 'true');
    return f
}

function makeLabel(id, text) {
    let f =
        document.createElement("label");
    f.setAttribute('for', id);
    const content = document.createTextNode(text);
    f.appendChild(content);
    return f
}


function render() {
    const newButton = document.createElement("button");
    newButton.textContent = 'New';
    newButton.onclick = newFile;

    const urlLabel = makeLabel('url', 'File Id');
    urlText = makeRo();
    const clientIDLabel = makeLabel('url', 'client Id');
    clientIDText = makeRo();
    const versionLabel = makeLabel('url', 'ProseMirror Version');
    versionText = makeRo();

    document.body.appendChild(newButton);
    document.body.appendChild(document.createElement('br'));
    document.body.appendChild(urlLabel);
    document.body.appendChild(urlText);
    document.body.appendChild(document.createTextNode('\u00A0\u00A0'));
    document.body.appendChild(clientIDLabel);
    document.body.appendChild(clientIDText);
    document.body.appendChild(document.createTextNode('\u00A0\u00A0'));
    document.body.appendChild(versionLabel);
    document.body.appendChild(versionText);
}

function updateDisplay(name) {
    fileName = name;
    clientIDText.setAttribute('value', view.state.config.pluginsByKey['collab$'].spec.config.clientID
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
    const unlock = await mutex.lock();
    console.log({state: view.state});
    let steps;
    while ((steps = sendableSteps(view.state))) {
        console.log({steps});
        console.log("sending...\n");
        try {
            const res = await axios.post(`http://${addr}/update`, {fileName, ...steps});
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
    const unlock = await mutex.lock();
    try {
        const res = await axios.get(`http://${addr}/?name=${fileName}&version=${getVersion(view.state)}`);
        console.log({res});
        if (res.data) {
            if (!view) {
                fileName = Url(window.location.href, null, true).query.name;
                console.log({in: 'pull', fileName});
                view = await newView()
            }
            applySteps(res.data)
        }
        updateDisplay(fileName);
    } catch {
    }
    unlock()
}

async function start() {
    render();
    if (fileName) {
        pull();
        createWebSocket(fileName);
    }
}

start();

