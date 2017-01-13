'use strict';
var inquirer = require('inquirer');
var colors = require('colors');
var glob = require("glob");
var path = require('path');
var q = require('q');
var helpers = require('./helpers');
var MainController = require("./controllers/mainController");

colors.setTheme({
    silly: 'rainbow',
    header: 'cyan',
    state: 'yellow'
});

let state = initializeState();
prompt(state);

function initializeState() {
    let hubInfoFiles = glob.sync('./*_onboardingInfo.json');
    let hubs = hubInfoFiles.map(f => path.basename(f).replace('_onboardingInfo.json', ''));
    return { currentController: new MainController(), knownHubs: hubs, controllerStack: [] };
}

function prompt(state) {
    state.currentController.logState(state);
    let operations = state.currentController.getOperations(state);

    let question = {
        type: 'rawlist',
        name: 'choice',
        message: 'What would you like to do?',
        choices: operations.map(o => o.name)
    };

    inquirer.prompt([question]).then(function (answers) {
        if (answers.choice !== 'Exit') {
            let choice = operations.find(o => o.name === answers.choice);
            if (choice !== undefined) {
                choice.operation(state).then(prompt)
                    .catch(err => {
                        helpers.logError(err);
                        prompt(state);
                    });
            }
            else {
                helpers.logError('Unknown operation');
                prompt(state);
            }
        }
    });
}