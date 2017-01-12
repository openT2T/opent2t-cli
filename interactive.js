'use strict';
var inquirer = require('inquirer');
var colors = require('colors');
var glob = require("glob");
var path = require('path');
var q = require('q');
var helpers = require('./helpers');
var MainController = require("./mainController");

const exitLabel = 'Exit';

colors.setTheme({
    silly: 'rainbow',
    header: 'cyan',
    state: 'yellow'
});

let state = initializeState();
ask(state);

function initializeState() {
    let hubInfoFiles = glob.sync('./*_onboardingInfo.json');
    let hubs = hubInfoFiles.map(f => path.basename(f).replace('_onboardingInfo.json', ''));
    let mainController = new MainController(hubs.length > 0);
    return { knownHubs: hubs, controllerStack: [mainController] };
}

function ask(state) {
    if (state.currentHub) {
        console.log("\nCurrent Hub: %s".state, state.currentHub.name);
        if (state.currentDevice) {
            console.log("Current Device: %s".state, state.currentDevice.longName);
        }
        console.log();
    }

    var manager = state.controllerStack[0];

    let question = {
        type: 'rawlist',
        name: 'choice',
        message: 'What would you like to do?',
        choices: manager.operations.map(o => o.title)
    };

    inquirer.prompt([question]).then(function (answers) {
        if (answers.choice !== exitLabel) {
            let choice = manager.operations.find(o => o.title === answers.choice);
            if (choice !== undefined) {
                choice.operation(state).then(ask)
                    .catch(err => {
                        helpers.logError(err);
                        ask(state);
                    });
            }
            else {
                helpers.logError('Unknown operation');
                ask(state);
            }
        }
    });
}