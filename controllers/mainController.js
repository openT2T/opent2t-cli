'use strict';
var inquirer = require('inquirer');
var q = require('q');
var fs = require('fs');
var glob = require("glob");
var path = require('path');
var Opent2tHelper = require("../Opent2tHelper");
var opent2tHelper = new Opent2tHelper();
var helpers = require('../helpers');
var BaseController = require("./baseController");
var HubController = require("./hubController");
var configRoot = process.cwd();

class MainController extends BaseController {
    constructor() {
        super();

        let hubInfoFiles = glob.sync(path.join(configRoot, '*_onboardingInfo.json'));
        MainController.knownHubs = hubInfoFiles.map(f => path.basename(f).replace('_onboardingInfo.json', ''));
        this.addOperation('Onboard hub', MainController.onboardHub);
    }

    getOperations(state) {
        let extraOperations = [];

        if (MainController.knownHubs.length > 0) {
            extraOperations.push(this.createOperation('Refresh oAuth token', MainController.refreshAuthToken));
            extraOperations.push(this.createOperation('Select hub', MainController.selectHub));
        }

        return this.operations.concat(extraOperations);
    }

    static onboardHub(state) {
        let deferred = q.defer();

        let questions = [
            {
                type: 'input',
                name: 'hubPackage',
                message: 'What is the name of the hub package (e.g. opent2t-translator-com-contoso-hub)'
            },
            {
                type: 'input',
                name: 'hubName',
                message: 'What would you like to name the hub (e.g. Contoso Hub)'
            }
        ];

        inquirer.prompt(questions).then(function (answers) {
            if (MainController.knownHubs.indexOf(answers.hubName) === -1) {
                let fileName = path.join(configRoot, helpers.createOnboardingFileName(answers.hubName));
                opent2tHelper.doOnboarding(answers.hubPackage).then(info => {
                    let configData = helpers.createConfigData(answers.hubName, answers.hubPackage, info);
                    let data = JSON.stringify(configData);
                    fs.writeFile(fileName, data, function (err) {
                        if (err) {
                            deferred.reject(err);
                        }
                        else {
                            console.log("Saved!");
                            MainController.knownHubs.push(answers.hubName);
                            deferred.resolve(state);
                        }
                    });
                }).catch(err => {
                    deferred.reject(err);
                });
            }
            else {
                console.log("\nHub %s has already been onboarded.\n".header, answers.hubName);
                deferred.resolve(state);
            }
        });

        return deferred.promise;
    }

    static refreshAuthToken(state) {
        let deferred = q.defer();

        let questions = [
            {
                type: 'rawlist',
                name: 'hubPackage',
                message: 'Select hub to refresh',
                choices: MainController.knownHubs
            }
        ];

        inquirer.prompt(questions).then(function (results) {
            let fileName = path.join(configRoot, helpers.createOnboardingFileName(results.hubPackage));
            helpers.readFile(fileName, "Please complete onboarding").then(data => {
                let configInfo = JSON.parse(data);
                let authInfo = configInfo.authInfo;
                opent2tHelper.loadTranslatorAndGetOnboardingAnswers(configInfo.translatorPackageName).then(answers => {
                    opent2tHelper.opent2t.createTranslatorAsync(configInfo.translatorPackageName, authInfo).then(translator => {
                        opent2tHelper.opent2t.invokeMethodAsync(translator, "", 'refreshAuthToken', [answers]).then(refreshedInfo => {
                            let configData = helpers.createConfigData(configInfo.translator, configInfo.translatorPackageName, refreshedInfo);
                            let refreshedData = JSON.stringify(configData);
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

    static selectHub(state) {
        let deferred = q.defer();

        let questions = [
            {
                type: 'rawlist',
                name: 'hubName',
                message: 'Which hub would you like?',
                choices: MainController.knownHubs
            }
        ];

        inquirer.prompt(questions).then(function (answers) {
            let hub = { name: answers.hubName };
            let fileName = path.join(configRoot, helpers.createOnboardingFileName(hub.name));
            helpers.readFile(fileName, "Please complete onboarding").then(data => {
                let configInfo = JSON.parse(data);
                hub.deviceInfo = configInfo.authInfo;
                opent2tHelper.opent2t.createTranslatorAsync(configInfo.translatorPackageName, hub.deviceInfo).then(translator => {
                    hub.translator = translator;
                    opent2tHelper.opent2t.invokeMethodAsync(translator, "", 'getPlatforms', []).then(info => {
                        hub.platforms = info.platforms;
                        hub.devices = [];
                        for (var i = 0; i < info.platforms.length; i++) {
                            var item = info.platforms[i];
                            var device = { id: item.opent2t.controlId, name: item.n, translatorName: item.opent2t.translator };
                            device.longName = device.name + ' (' + device.translatorName + ')';
                            hub.devices.push(device);
                        }
                        state.currentHub = hub;
                        state.controllerStack.push(state.currentController);
                        state.currentController = new HubController();
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