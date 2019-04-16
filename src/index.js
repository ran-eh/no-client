'use strict';

// import applyDevTools from "prosemirror-dev-tools";

import './style.css';

import { schema } from "prosemirror-schema-basic"
import { EditorState } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { Step } from "prosemirror-transform"
import { collab, receiveTransaction, sendableSteps, getVersion } from "prosemirror-collab"
import { exampleSetup } from 'prosemirror-example-setup';
import axios from 'axios';
import 'prosemirror-example-setup/style/style.css';

let plugins = exampleSetup({ schema });
let version = 0;
let fileName = "";
let view = null;

function updateFileName(name) {
    fileName = name
    input.setAttribute('value', fileName)
    window.history.pushState(null, null, `/?name=${fileName}`);
}

const newButton = document.createElement("button")
newButton.textContent = 'New'
newButton.onclick = async () => {
    const res = await axios.post(`http://localhost:8000/new`);
    updateFileName(res.data.fileName)
    if (view) {
        view.destroy()
    }
    view = await newView()
}

let input = document.createElement("INPUT");
input.setAttribute('type', 'text')
input.setAttribute('type', 'text')
input.setAttribute('placeholder', 'No file loaded')
input.setAttribute('readonly', 'true')

document.body.appendChild(newButton)
document.body.appendChild(input)

async function newView() {
    let state = EditorState.create({
        schema,
        plugins: [...plugins,
        collab({ version })
        ]
    });
    console.log({ version: getVersion(state), steps: sendableSteps(state) })
    return new EditorView(document.body, {
        state
    });
}

async function push() {
    let steps
    while (steps = sendableSteps(view.state)) {
        console.log({ steps });
        console.log("sending...\n");
        const res = await axios.post(`http://localhost:8000/update`, { fileName, ...steps });
        console.log("...sent\n")
        console.log({ res });
        if (res.data) {
            applySteps(res.data)
        }
    }
}

function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
        vars[key] = value;
    });
    return vars;
}

console.log({ fileName: getUrlVars()["name"] })

function applySteps(data) {
    const steps = data.steps;
    const clientIDs = steps.map(s => s.clientID)
    const newSteps = steps.map(s => Step.fromJSON(schema, s.step))
    let tr = receiveTransaction(view.state, newSteps, clientIDs);
    const newState = view.state.apply(tr);
    updateFileName(data.fileName)
    console.log({ oldVersion: getVersion(view.state) });
    view.updateState(newState);
    console.log({ newVersion: getVersion(view.state) });
}

const pushButton = document.createElement("button")
pushButton.textContent = 'Push'
document.body.appendChild(pushButton);
pushButton.onclick = () => {
    const steps = sendableSteps(view.state)
    if (steps) {
        push(view);
    }
}

async function pull() {
    if (!view) {
        fileName = getUrlVars()["name"]
        updateFileName(fileName)
        view = await newView()
    }
    const res = await axios.get(`http://localhost:8000/?name=${fileName}&version=${getVersion(view.state)}`);
    console.log({ res })
    if (res.data) {
        applySteps(res.data)
    }
}

const pullButton = document.createElement("button")
pullButton.textContent = 'Pull'
document.body.appendChild(pullButton)
pullButton.onclick = pull

