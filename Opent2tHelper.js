'use strict';

var q = require('q');
var inquirer = require('inquirer');
var cliVars = [{ "key": "{state}", "value": "opent2t-cli" }];
var helpers = require('./helpers');
var path = require('path');

class Opent2tHelper {
    constructor() {
        this.modulesPath = path.join(process.cwd(), '/node_modules/');
        let OpenT2T = require(path.join(this.modulesPath, 'opent2t'));
        this.logger = new OpenT2T.Logger("info");
        this.opent2t = new OpenT2T.OpenT2T(this.logger);
    }

    createOnboarder(module) {
        let Onboarding = require(path.join(this.modulesPath, module));
        return new Onboarding(this.logger);
    }

    invokeDeviceMethod(translatorName, deviceInfo, methodName, params) {
        let deferred = q.defer();

        this.createTranslator(translatorName, deviceInfo).then(translator => {
            this.opent2t.invokeMethodAsync(translator, "", methodName, params).then(info => {
                deferred.resolve(info);
            }).catch(error => {
                deferred.reject(error);
            });
        }).catch(error => {
            deferred.reject(error);
        });

        return deferred.promise;
    }

    getProperty(translatorName, deviceInfo, property, value) {
        let deferred = q.defer();

        this.createTranslator(translatorName, deviceInfo).then(translator => {
            this.opent2t.invokeMethodAsync(translator, "", property, [value]).then(data => {
                deferred.resolve(data);
            }).catch(error => {
                deferred.reject(error);
            });
        }).catch(error => {
            deferred.reject(error);
        });

        return deferred.promise;
    }

    setProperty(translatorName, deviceInfo, property, deviceId, value) {
        let deferred = q.defer();

        this.createTranslator(translatorName, deviceInfo).then(translator => {
            this.opent2t.invokeMethodAsync(translator, "", property, [deviceId, value]).then(data => {
                deferred.resolve(data);
            }).catch(error => {
                deferred.reject(error);
            });
        }).catch(error => {
            deferred.reject(error);
        });

        return deferred.promise;
    }

    createTranslator(translatorName, deviceInfo) {
        let deferred = q.defer();

        this.opent2t.createTranslatorAsync(translatorName, deviceInfo).then(translator => {
            deferred.resolve(translator);
        }).catch(error => {
            deferred.reject(error);
        });

        return deferred.promise;
    }

    getAllPackageInfo(translatorName) {
        let LocalPackageSourceClass = require(path.join(this.modulesPath, 'opent2t/package/LocalPackageSource')).LocalPackageSource;
        let translatorPath = translatorName ? path.join(this.modulesPath, translatorName) : undefined;
        let localPackageSource = new LocalPackageSourceClass(translatorPath);
        return localPackageSource.getAllPackageInfoAsync();
    }

    getTranslatorInfo(translatorName) {
        var deferred = q.defer();

        this.getAllPackageInfo(translatorName).then((packages) => {
            // default use the first package
            var p = packages[0];
            if (p.translators.length > 0) {
                var tinfo = p.translators[0];
                deferred.resolve(tinfo);
            }
            else {
                deferred.reject('No translators found');
            }
        }).catch(err => {
            deferred.reject(err);
        });

        return deferred.promise;
    }

    getUrl(onboarding, flow, answers) {
        if (flow.name === 'url') {
            var replaceVars = this.getReplaceVars(answers);
            return Promise.resolve(this.replaceVarsInValue(flow.description, replaceVars));
        } else if (flow.name === 'method') {
            return onboarding[flow.description](answers);
        }
    }

    // this resolves variables in the onboarding flow with dynamic values retreived from the user
    // takes in a key/value pair array and replces any key found in the string with the value in the array
    // input
    // my cool string with {key1} things to replace inside {key2} it
    // {key1} : value1
    // {key2} : value2
    // output
    // my cool string with value1 things to replace inside value2 it
    replaceVarsInValue(value, replaceVars) {
        var toReturn = value;
        for (var i = 0; i < replaceVars.length; i++) {
            var replaceItem = replaceVars[i];
            toReturn = toReturn.replace(replaceItem.key, replaceItem.value);
        }

        return toReturn;
    }

    // given the users answers, creates a {key}/value array
    getReplaceVars(answers) {
        var replaceVars = cliVars.slice(0);

        for (let i = 0; i < answers.length; i++) {
            let answer = answers[i];
            for (var property in answer) {
                if (answer.hasOwnProperty(property)) {
                    replaceVars.push({ "key": "{" + property + "}", "value": answer[property] });
                }
            }
        }

        return replaceVars;
    }

    doOnboarding(translatorName) {
        return this.getAllPackageInfo(translatorName).then((packages) => {

            // default use the first package
            var p = packages[0];
            if (p.translators.length > 0) {

                var tinfo = p.translators[0];
                console.log("----------------------------- Package Info");
                helpers.logObject(tinfo);
                console.log("-----------------------------");

                var Onboarding = require(path.join(this.modulesPath, tinfo.onboarding));
                var onboarding = new Onboarding(this.logger);
                return this.performFlow(onboarding, tinfo.onboardingFlow).then(answers => {
                    return onboarding.onboard(answers);
                });
            }
        });
    }

    // loads the first package found under opent2t/package for a given translator
    // TODO: refactor doOnboarding to call into this instead to avoid code-duplication
    loadTranslatorAndGetOnboardingAnswers(translatorName) {
        return this.getAllPackageInfo(translatorName).then((packages) => {

            // default use the first package
            var p = packages[0];
            if (p.translators.length > 0) {

                var tinfo = p.translators[0];
                console.log("----------------------------- Package Info");
                helpers.logObject(tinfo);
                console.log("-----------------------------");

                var onboardingAnswers = [];

                // TODO: initialize an onboarding here
                var Onboarding = require(path.join(this.modulesPath, tinfo.onboarding));
                var onboarding = new Onboarding();
                return this.performFlow(onboarding, tinfo.onboardingFlow, 1, onboardingAnswers);
            }
        });
    }

    // does the onboarding flow and asks the user any input
    performFlow(onboarding, onboardingFlow, i, onboardingAnswers) {
        if (!!!i) {
            i = 0;
        }

        if (!!!onboardingAnswers) {
            onboardingAnswers = [];
        }

        // recursive ending condition
        if (i >= onboardingFlow.length) {
            var deferred = q.defer();
            deferred.resolve(onboardingAnswers);
            return deferred.promise;
        }

        var flowItem = onboardingFlow[i];
        console.log("--------------- %j".header, flowItem.name);

        if (flowItem.name === "getDeveloperInput" || flowItem.name === "getUserInput") {
            var inquirerInput = this.convertFlowToInquirer(flowItem);
            return inquirer.prompt(inquirerInput).then(answers => {
                onboardingAnswers.push(answers);
                return this.performFlow(onboarding, onboardingFlow, i + 1, onboardingAnswers);
            });
        }
        else if (flowItem.name === "askUserPermission") {
            // create the url by resolving variables with values retrieved
            // todo where to put these helper methods?

            // Always use flow[0] for backwards compatibility
            var flow = {
                description: flowItem.flow[0].descriptions.en,
                name: flowItem.flow[0].name,
            }

            return this.getUrl(onboarding, flow, onboardingAnswers).then((url) => {
                // start server and route to url
                return this.doWebFlow(url).then(returnUrl => {
                    onboardingAnswers.push(returnUrl);
                    return this.performFlow(onboarding, onboardingFlow, i + 1, onboardingAnswers);
                });
            });
        }
        else {
            console.log("Unsupported flow element: " + flowItem.name);
            return this.performFlow(onboarding, onboardingFlow, i + 1, onboardingAnswers);
        }
    }

    // converts opent2t onboarding flow into multiple inquirer flows
    // onboardingFlow has two levels, inquirer only handles one level
    // so we convert into multiple one level sets
    convertFlowToInquirer(flowItem) {
        var inquirerInput = [];

        for (var j = 0; j < flowItem.flow.length; j++) {
            var element = flowItem.flow[j];
            var iItem = {};

            if (!!element.type) {
                iItem.type = element.type;
            }
            else {
                iItem.type = "input";
            }

            iItem.name = element.name;
            iItem.message = element.descriptions.en;

            inquirerInput.push(iItem);
        }

        return inquirerInput;
    }

    getUserPermission(onboarding, flow, answers) {
        return this.getUrl(onboarding, flow, answers).then((url) => {
            return this.doWebFlow(url);
        });
    }

    // starts a web server at the configured port and waits for /success call
    doWebFlow(url) {
        let deferred = q.defer();

        let open = require('open');
        let express = require('express');
        let port = 8080;

        if(!this.expresApp) {
            this.expresApp = express();

            this.expresApp.listen(port, function () {
                console.log("Server running on port", port);
                console.log("Waiting for success call from web page");
            });
        
        }
        else {
            this.expresApp._router.stack.pop();
        }

        this.expresApp.get("/success", function (req, res) {
            res.send("success!");
            deferred.resolve(req.url);
        });

        open(url);

        return deferred.promise;
    }
}

module.exports = Opent2tHelper;