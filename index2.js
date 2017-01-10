'use strict';
var inquirer = require('inquirer');
var colors = require('colors');
var glob = require("glob");
var path = require('path');
var q = require('q');
var fs = require('fs');
var OnboardingCli = require("./onboardingCli");
var TranslatorCli = require("./translatorCli");
var helpers = require('./helpers');
var translatorCli = new TranslatorCli();

colors.setTheme({
    silly: 'rainbow',
    header: 'cyan',
    state: 'yellow'
});

var mainChoices = [
    'Exit',
    'Onboard hub'
];

var hubChoices = [
    'Exit',
    'Back',
    'List devices',
    'Select device'
];

var deviceChoices = [
    'Exit',
    'Back',
    'Select device',
    'List properties',
    'Get property',
    'Set property'
];

var knownHubs = [];
var currentHub;
var currentDevice;

var mainQuestion = {
    type: 'rawlist',
    name: 'mainChoice',
    message: 'What would you like to do?',
    choices: mainChoices
};

function getDevices() {
    let deferred = q.defer();

    if (currentHub.devices === undefined) {
        var fileName = helpers.createOnboardingFileName(currentHub.name);
        helpers.readFile(fileName, "Please complete onboarding").then(data => {
            currentHub.deviceInfo = JSON.parse(data);
            translatorCli.getProperty(currentHub.name, currentHub.deviceInfo, 'getPlatforms').then(info => {
                currentHub.platforms = info.platforms;
                currentHub.devices = [];
                for (var i = 0; i < info.platforms.length; i++) {
                    var item = info.platforms[i];
                    var device = { id: item.opent2t.controlId, name: item.n, translator: item.opent2t.translator };
                    device.longName = device.name + ' (' + device.translator + ')';
                    currentHub.devices.push(device);
                }
                deferred.resolve();
            }).catch(error => {
                deferred.reject(err);
            });
        }).catch(error => {
            deferred.reject(err);
        });
    } else {
        deferred.resolve();
    }

    return deferred.promise;
}

function printState() {
    if (currentHub) {
        console.log("\nCurrent Hub: %s".state, currentHub.name);
        if (currentDevice) {
            console.log("Current Device: %s".state, currentDevice.longName);
        }
        console.log();
    }
}

function getKnownHubs() {
    var hubInfoFiles = glob.sync('./*_onboardingInfo.json');
    knownHubs = hubInfoFiles.map(f => path.basename(f).replace('_onboardingInfo.json', ''));

    if (knownHubs.length > 0 && mainChoices.indexOf('Select hub') === -1) {
        mainChoices.push('Select hub');
    }
}

function ask() {
    printState();

    inquirer.prompt([mainQuestion]).then(function (mainAnswers) {
        if (mainAnswers.mainChoice === 'Onboard hub') {

            var questions = [
                {
                    type: 'input',
                    name: 'hubPackage',
                    message: 'What is the name of the hub to onboard (e.g. opent2t-translator-com-contoso-hub)'
                }
            ];

            inquirer.prompt(questions).then(function (answers) {
                var fileName = helpers.createOnboardingFileName(answers.hubPackage);

                var onboardingCli = new OnboardingCli();
                onboardingCli.doOnboarding(answers.hubPackage).then(info => {
                    var data = JSON.stringify(info);
                    fs.writeFile(fileName, data, function (err) {
                        if (err) {
                            console.log(err);
                            return console.log(err);
                        }
                        console.log("Saved!");
                        getKnownHubs();
                        ask();
                    });
                }).catch(err => {
                    helpers.logError(err);
                });
            });

        } else if (mainAnswers.mainChoice === 'Select hub') {

            var questions = [
                {
                    type: 'rawlist',
                    name: 'hubName',
                    message: 'Which hub would you like?',
                    choices: knownHubs
                }
            ];

            inquirer.prompt(questions).then(function (answers) {
                currentHub = { name: answers.hubName };
                mainQuestion.choices = hubChoices;
                ask();
            });

        } else if (mainAnswers.mainChoice === 'List devices') {
            getDevices().then(() => {
                for (var i = 0; i < currentHub.devices.length; i++) {
                    var item = currentHub.devices[i];
                    console.log("%s %s)", item.id, item.longName);
                }
                ask();
            });

        } else if (mainAnswers.mainChoice === 'Select device') {
            getDevices().then(() => {
                var questions = [
                    {
                        type: 'rawlist',
                        name: 'device',
                        message: 'Which device would you like?',
                        choices: currentHub.devices.map(d => { return d.longName }),
                        paginated: true,
                    }
                ];

                inquirer.prompt(questions).then(function (answers) {
                    currentDevice = currentHub.devices.find(d => { return d.longName === answers.device });

                    var deviceInfo = currentHub.platforms.find(p => { return p.opent2t.controlId === currentDevice.id });
                    currentDevice.readonlyProperties = [];
                    currentDevice.properties = [];
                    currentDevice.writableProperties = [];

                    for (var entitiesIndex = 0; entitiesIndex < deviceInfo.entities.length; entitiesIndex++) {
                        for (var i = 0; i < deviceInfo.entities[entitiesIndex].resources.length; i++) {
                            var resource = deviceInfo.entities[entitiesIndex].resources[i];
                            var isWritable = resource.if.indexOf('oic.if.a') !== -1;
                            var props = resource.if.indexOf('oic.if.a') === -1 ? currentDevice.readonlyProperties : currentDevice.writableProperties;
                            var prop = { name: resource.href.substring(1), deviceId: deviceInfo.entities[entitiesIndex].di };
                            props.push(prop);
                            currentDevice.properties.push(prop);
                        }
                    }

                    mainQuestion.choices = deviceChoices;
                    ask();
                });
            });

        } else if (mainAnswers.mainChoice === 'List properties') {
            if (currentDevice.writableProperties.length > 0) {
                console.log(colors.cyan('Read/Write Properties'));
                for (var i = 0; i < currentDevice.writableProperties.length; i++) {
                    console.log(currentDevice.writableProperties[i].name);
                }
            }

            if (currentDevice.readonlyProperties.length > 0) {
                console.log(colors.cyan('Read Only Properties'));
                for (var i = 0; i < currentDevice.readonlyProperties.length; i++) {
                    console.log(currentDevice.readonlyProperties[i].name);
                }
            }
            ask();

        } else if (mainAnswers.mainChoice === 'Get property') {
            var questions = [
                {
                    type: 'rawlist',
                    name: 'propName',
                    message: 'Which property would you like?',
                    choices: currentDevice.properties.map(p => { return p.name }),
                    paginated: true,
                }
            ];

            inquirer.prompt(questions).then(function (answers) {
                var deviceInfo = currentHub.platforms.find(p => { return p.opent2t.controlId === currentDevice.id });
                translatorCli.createTranslator(currentHub.name, currentHub.deviceInfo).then(hub => {
                    var dInfo = { 'deviceInfo': deviceInfo, 'hub': hub };
                    var prop = currentDevice.properties.find(p => { return p.name === answers.propName });
                    var method = 'getDevices' + prop.name.charAt(0).toUpperCase() + prop.name.slice(1);
                    translatorCli.getProperty(currentDevice.translator, dInfo, method, prop.deviceId).then(info => {
                        helpers.logObject(info);
                        ask();
                    }).catch(error => {
                        helpers.logError(error);
                    });
                });
            });

        } else if (mainAnswers.mainChoice === 'Set property') {
            var questions = [
                {
                    type: 'rawlist',
                    name: 'propName',
                    message: 'Which property would you like to set?',
                    choices: currentDevice.writableProperties.map(p => { return p.name }),
                    paginated: true,
                },
                {
                    type: 'input',
                    name: 'value',
                    message: 'Enter stringified JSON value'
                },
            ];

            inquirer.prompt(questions).then(function (answers) {
                var deviceInfo = currentHub.platforms.find(p => { return p.opent2t.controlId === currentDevice.id });
                translatorCli.createTranslator(currentHub.name, currentHub.deviceInfo).then(hub => {
                    var dInfo = { 'deviceInfo': deviceInfo, 'hub': hub };
                    var prop = currentDevice.writableProperties.find(p => { return p.name === answers.propName });
                    var method = 'postDevices' + prop.name.charAt(0).toUpperCase() + prop.name.slice(1);
                    var parsedValue = JSON.parse(answers.value);
                    translatorCli.setProperty(currentDevice.translator, dInfo, method, prop.deviceId, parsedValue).then(info => {
                        helpers.logObject(info);
                        ask();
                    }).catch(error => {
                        helpers.logError(error);
                    });
                });
            });

        } else if (mainAnswers.mainChoice === 'Back') {
            if (currentDevice !== undefined) {
                mainQuestion.choices = hubChoices;
                currentDevice = undefined;
            }
            else {
                mainQuestion.choices = mainChoices;
                currentHub = undefined;
            }
            ask();
        } else {
            console.log('Goodbye');
        }
    });
}

getKnownHubs();
ask();