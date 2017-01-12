'use strict';
var inquirer = require('inquirer');
var q = require('q');
var fs = require('fs');
var OnboardingCli = require("./onboardingCli");
var helpers = require('./helpers');
var OpenT2T = require('opent2t').OpenT2T;
var BaseController = require("./baseController");
var HubController = require("./hubController");

class MainController extends BaseController {
    constructor(hasKnownHubs) {
        super();
        this.addOperation('onboardHub', 'Onboard hub', this.onboardHub);

        if (hasKnownHubs) {
            this.addHubCommands();
        }
    }

    addHubCommands() {
        this.addOperation('refreshAuthToken', 'Refresh oAuth token', this.refreshAuthToken);
        this.addOperation('selectHub', 'Select hub', this.selectHub);
    }

    onboardHub(state) {
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
                            let controller = state.controllerStack[state.controllerStack.length - 1];
                            controller.addHubCommands();
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

    refreshAuthToken(state) {
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

    selectHub(state) {
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
                        let hubController = new HubController();
                        state.controllerStack.unshift(hubController);
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
}

module.exports = MainController;