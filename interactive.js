'use strict';
var inquirer = require('inquirer');
var colors = require('colors');
var glob = require("glob");
var path = require('path');
var q = require('q');
var fs = require('fs');
var OnboardingCli = require("./onboardingCli");
var OpsManager = require("./opsManager");
var helpers = require('./helpers');
var opsManager = new OpsManager();
var OpenT2T = require('opent2t').OpenT2T;

const exitLabel = 'Exit';

colors.setTheme({
    silly: 'rainbow',
    header: 'cyan',
    state: 'yellow'
});

let state = initializeState();
ask(state);

function initializeOperationsManager() {
    opsManager.addOperation('onboardHub', 'Onboard hub', onboardHub);
    opsManager.addOperation('refreshAuthToken', 'Refresh oAuth token', refreshAuthToken);
    opsManager.addOperation('selectHub', 'Select hub', selectHub);
    opsManager.addOperation('listDevices', 'List devices', listDevices);
    opsManager.addOperation('selectDevice', 'Select device', selectDevice);
    opsManager.addOperation('showDeviceInfo', 'Display info', showDeviceInfo);
    opsManager.addOperation('listProperties', 'List properties', listProperties);
    opsManager.addOperation('getProperty', 'Get property', getProperty);
    opsManager.addOperation('setProperty', 'Set property', setProperty);
    opsManager.addOperation('invokeMethod', 'Invoke method', invokeMethod);
    opsManager.addOperation('goBack', 'Back', goBack);
}

function initializeState() {
    initializeOperationsManager();
    let hubInfoFiles = glob.sync('./*_onboardingInfo.json');
    let hubs = hubInfoFiles.map(f => path.basename(f).replace('_onboardingInfo.json', ''));

    let choices = [
        exitLabel,
        opsManager.operations.onboardHub.title
    ];

    if (hubs.length > 0) {
        choices.push(opsManager.operations.selectHub.title);
        choices.push(opsManager.operations.refreshAuthToken.title);
    }

    return { knownHubs: hubs, choicesStack: [choices] };
}

function ask(state) {
    if (state.currentHub) {
        console.log("\nCurrent Hub: %s".state, state.currentHub.name);
        if (state.currentDevice) {
            console.log("Current Device: %s".state, state.currentDevice.longName);
        }
        console.log();
    }

    let question = {
        type: 'rawlist',
        name: 'choice',
        message: 'What would you like to do?',
        choices: state.choicesStack[0]
    };

    inquirer.prompt([question]).then(function (answers) {
        if (answers.choice !== exitLabel) {
            let choice = opsManager.getOperationByTitle(answers.choice);
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

function onboardHub(state) {
    let deferred = q.defer();

    let questions = [
        {
            type: 'input',
            name: 'hubPackage',
            message: 'What is the name of the hub to onboard (e.g. opent2t-translator-com-contoso-hub)'
        }
    ];

    inquirer.prompt(questions).then(function (answers) {
        let fileName = helpers.createOnboardingFileName(answers.hubPackage);

        let onboardingCli = new OnboardingCli();
        onboardingCli.doOnboarding(answers.hubPackage).then(info => {
            let data = JSON.stringify(info);
            fs.writeFile(fileName, data, function (err) {
                if (err) {
                    deferred.reject(err);
                }
                else {
                    console.log("Saved!");
                    if (state.knownHubs.length === 0) {
                        state.choicesStack[state.choicesStack.length - 1].push('Select hub');
                    }
                    state.knownHubs.push(answers.hubPackage);
                    deferred.resolve(state);
                }
            });
        }).catch(err => {
            deferred.reject(err);
        });
    });

    return deferred.promise;
}

function refreshAuthToken(state) {
    let deferred = q.defer();

    let questions = [
        {
            type: 'rawlist',
            name: 'hubPackage',
            message: 'Select hub to refresh',
            choices: state.knownHubs
        }
    ];

    inquirer.prompt(questions).then(function (results) {
        let onboardingCli = new OnboardingCli();
        onboardingCli.loadTranslatorAndGetOnboardingAnswers(results.hubPackage).then(answers => {
            let fileName = helpers.createOnboardingFileName(results.hubPackage);
            helpers.readFile(fileName, "Please complete onboarding").then(data => {
                let authInfo = JSON.parse(data);
                OpenT2T.createTranslatorAsync(results.hubPackage, authInfo).then(translator => {
                    OpenT2T.invokeMethodAsync(translator, "", 'refreshAuthToken', [answers]).then(refreshedInfo => {
                        let refreshedData = JSON.stringify(refreshedInfo);
                        fs.writeFile(fileName, refreshedData, function (err) {
                            if (err) {
                                deferred.reject(err);
                            }
                            console.log("Saved!");
                            deferred.resolve(state);
                        });

                    }).catch(error => {
                        deferred.reject(error);
                    });
                }).catch(error => {
                    deferred.reject(error);
                });
            });
        });
    });

    return deferred.promise;
}

function selectHub(state) {
    let deferred = q.defer();

    let questions = [
        {
            type: 'rawlist',
            name: 'hubName',
            message: 'Which hub would you like?',
            choices: state.knownHubs
        }
    ];

    inquirer.prompt(questions).then(function (answers) {
        let hub = { name: answers.hubName };
        let fileName = helpers.createOnboardingFileName(hub.name);
        helpers.readFile(fileName, "Please complete onboarding").then(data => {
            hub.deviceInfo = JSON.parse(data);
            OpenT2T.createTranslatorAsync(hub.name, hub.deviceInfo).then(translator => {
                hub.translator = translator;
                OpenT2T.invokeMethodAsync(translator, "", 'getPlatforms', []).then(info => {
                    hub.platforms = info.platforms;
                    hub.devices = [];
                    for (var i = 0; i < info.platforms.length; i++) {
                        var item = info.platforms[i];
                        var device = { id: item.opent2t.controlId, name: item.n, translatorName: item.opent2t.translator };
                        device.longName = device.name + ' (' + device.translatorName + ')';
                        hub.devices.push(device);
                    }
                    state.currentHub = hub;
                    state.choicesStack.unshift([
                        exitLabel,
                        opsManager.operations.goBack.title,
                        opsManager.operations.listDevices.title,
                        opsManager.operations.selectDevice.title
                    ]);

                    deferred.resolve(state);
                });
            }).catch(error => {
                deferred.reject(error);
            });
        }).catch(error => {
            deferred.reject(error);
        });
    });

    return deferred.promise;
}

function listDevices(state) {
    let deferred = q.defer();

    for (let i = 0; i < state.currentHub.devices.length; i++) {
        let item = state.currentHub.devices[i];
        console.log("%s %s", item.id, item.longName);
    }

    deferred.resolve(state);
    return deferred.promise;
}

function selectDevice(state) {
    let deferred = q.defer();

    let questions = [
        {
            type: 'rawlist',
            name: 'device',
            message: 'Which device would you like?',
            choices: state.currentHub.devices.map(d => { return d.longName }),
            paginated: true,
        }
    ];

    inquirer.prompt(questions).then(function (answers) {
        let device = state.currentHub.devices.find(d => { return d.longName === answers.device });
        let deviceInfo = state.currentHub.platforms.find(p => { return p.opent2t.controlId === device.id });
        let dInfo = { 'deviceInfo': deviceInfo, 'hub': state.currentHub.translator };

        OpenT2T.createTranslatorAsync(device.translatorName, dInfo).then(translator => {
            device.translator = translator;
            device.properties = [];
            device.readonlyProperties = [];
            device.writableProperties = [];

            for (let entitiesIndex = 0; entitiesIndex < deviceInfo.entities.length; entitiesIndex++) {
                for (let i = 0; i < deviceInfo.entities[entitiesIndex].resources.length; i++) {
                    let resource = deviceInfo.entities[entitiesIndex].resources[i];
                    let props = resource.if.indexOf('oic.if.a') === -1 ? device.readonlyProperties : device.writableProperties;
                    let prop = { name: resource.href.substring(1), deviceId: deviceInfo.entities[entitiesIndex].di };
                    props.push(prop);
                    device.properties.push(prop);
                }
            }

            state.currentDevice = device;

            state.choicesStack.unshift([
                exitLabel,
                opsManager.operations.goBack.title,
                opsManager.operations.showDeviceInfo.title,
                opsManager.operations.listProperties.title,
                opsManager.operations.getProperty.title,
                opsManager.operations.setProperty.title,
                opsManager.operations.invokeMethod.title
            ]);

            deferred.resolve(state);
        }).catch(error => {
            deferred.reject(error);
        });
    });

    return deferred.promise;
}

function showDeviceInfo(state) {
    let deferred = q.defer();

    let deviceInfo = state.currentHub.platforms.find(p => { return p.opent2t.controlId === state.currentDevice.id });
    helpers.logObject(deviceInfo);

    deferred.resolve(state);
    return deferred.promise;
}

function listProperties(state) {
    let deferred = q.defer();

    if (state.currentDevice.writableProperties.length > 0) {
        console.log(colors.cyan('Read/Write Properties'));
        for (var i = 0; i < state.currentDevice.writableProperties.length; i++) {
            console.log(state.currentDevice.writableProperties[i].name);
        }
    }

    if (state.currentDevice.readonlyProperties.length > 0) {
        console.log(colors.cyan('Read Only Properties'));
        for (var i = 0; i < state.currentDevice.readonlyProperties.length; i++) {
            console.log(state.currentDevice.readonlyProperties[i].name);
        }
    }

    deferred.resolve(state);
    return deferred.promise;
}

function getProperty(state) {
    let deferred = q.defer();

    let questions = [
        {
            type: 'rawlist',
            name: 'propName',
            message: 'Which property would you like?',
            choices: state.currentDevice.properties.map(p => { return p.name }),
            paginated: true,
        }
    ];

    inquirer.prompt(questions).then(function (answers) {
        let prop = state.currentDevice.properties.find(p => { return p.name === answers.propName });
        let method = 'getDevices' + prop.name.charAt(0).toUpperCase() + prop.name.slice(1);
        OpenT2T.invokeMethodAsync(state.currentDevice.translator, "", method, [prop.deviceId]).then(info => {
            helpers.logObject(info);
            deferred.resolve(state);
        }).catch(error => {
            deferred.reject(error);
        });
    });

    return deferred.promise;
}

function setProperty(state) {
    let deferred = q.defer();

    let questions = [
        {
            type: 'rawlist',
            name: 'propName',
            message: 'Which property would you like to set?',
            choices: state.currentDevice.writableProperties.map(p => { return p.name }),
            paginated: true,
        },
        {
            type: 'input',
            name: 'value',
            message: 'Enter stringified JSON value'
        },
    ];

    inquirer.prompt(questions).then(function (answers) {
        let prop = state.currentDevice.writableProperties.find(p => { return p.name === answers.propName });
        let method = 'postDevices' + prop.name.charAt(0).toUpperCase() + prop.name.slice(1);
        let parsedValue = JSON.parse(answers.value);
        OpenT2T.invokeMethodAsync(state.currentDevice.translator, "", method, [prop.deviceId, parsedValue]).then(info => {
            helpers.logObject(info);
            deferred.resolve(state);
        }).catch(error => {
            deferred.reject(error);
        });
    });

    return deferred.promise;
}


function invokeMethod(state) {
    let deferred = q.defer();

    let questions = [
        {
            type: 'input',
            name: 'methodName',
            message: 'Enter the method name'
        },
        {
            type: 'input',
            name: 'params',
            message: 'Enter stringified JSON params array'
        },
    ];

    inquirer.prompt(questions).then(function (answers) {
        let parsedParams = JSON.parse(answers.params);
        OpenT2T.invokeMethodAsync(state.currentDevice.translator, "", answers.methodName, parsedParams).then(info => {
            helpers.logObject(info);
            deferred.resolve(state);
        }).catch(error => {
            deferred.reject(error);
        });
    });

    return deferred.promise;
}

function goBack(state) {
    let deferred = q.defer();

    if (state.currentDevice !== undefined) {
        state.currentDevice = undefined;
    }
    else {
        state.currentHub = undefined;
    }
    state.choicesStack.shift();

    deferred.resolve(state);
    return deferred.promise;
}