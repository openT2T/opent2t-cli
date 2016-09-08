/* jshint esversion: 6 */
/* jshint node: true */
'use strict';
var inquirer = require('inquirer');
var q = require('q');
var state = "opent2t-cli";
var cliVars = [{ "key": "*state*", "value": state}];

class OnboardingCli {
    constructor() {
        this.OpenT2T = require('opent2t').OpenT2T;

    }

    // loads the specified translator and performs the onboarding for it
    doOnboarding(translatorName) {
        var LocalPackageSourceClass = require('opent2t/package/LocalPackageSource').LocalPackageSource;
        var localPackageSource = new LocalPackageSourceClass("./node_modules/" + translatorName);

        return localPackageSource.getAllPackageInfoAsync().then((packages) => {

            // default use the first package
            var p = packages[0];
            if (p.translators.length > 0) {

                var tinfo = p.translators[0];
                console.log(JSON.stringify(tinfo, null, 2));

                var inquirerInput = this.convertFlowToInquirer2(tinfo.onboardingFlow);
                console.log(JSON.stringify(tinfo.onboardingFlow, null, 2));
                return this.performFlow(tinfo.onboardingFlow).then(answers => {
                    var Onboarding = require(tinfo.onboarding);
                    var onboarding = new Onboarding();
                    console.log(onboarding);
                    console.log(JSON.stringify(onboarding, null, 2));
                    return onboarding.onboard(answers);
                });

            }
        }).catch((error) => {
            console.log(error);
            throw error;
        });
    }

    performFlow(onboardingFlow, i, onboardingAnswers) {
        if (!!!i) {
            i = 0;
        }

        if (!!!onboardingAnswers) {
            onboardingAnswers = [];
        }

        if (i >= onboardingFlow.length) {
            var deferred = q.defer();
            deferred.resolve(onboardingAnswers);
            return deferred.promise;
        }

        var flowItem = onboardingFlow[i];
        console.log("---------------");
        console.log(flowItem.name);
        console.log("---------------");

        if (flowItem.name === "getDeveloperInput" || flowItem.name === "getUserInput") {
            var inquirerInput = this.convertFlowToInquirer(flowItem);
            console.log(JSON.stringify(inquirerInput, null, 2));
            return inquirer.prompt(inquirerInput).then(answers => {
                onboardingAnswers.push(answers);
                return this.performFlow(onboardingFlow, i + 1, onboardingAnswers);
            });
        }
        else if (flowItem.name === "askUserPermission") {
            // create the url by resolving variables with values retrieved
            // todo where to put these helper methods?
            var replaceVars = this.getReplaceVars(onboardingFlow, onboardingAnswers, i);
            var url = flowItem.flow[0].descriptions.en;
            url = this.replaceVarsInValue(url, replaceVars); 

            // start server and route to url
            return this.doWebFlow(url).then(accessCode => {
                onboardingAnswers.push(accessCode);
                return this.performFlow(onboardingFlow, i + 1, onboardingAnswers);
            });

        }
        else {
            console.log("Unsupported flow element: " + flowItem.name);
            return this.performFlow(onboardingFlow, i + 1, onboardingAnswers);
        }
    }

    replaceVarsInValue(value, replaceVars) {
        var toReturn = value;
        for (var i = 0; i < replaceVars.length; i++) {
            var replaceItem = replaceVars[i];
            console.log("Replace " + replaceItem.key + " with " + replaceItem.value);
            toReturn = toReturn.replace(replaceItem.key, replaceItem.value);
        }

        return toReturn;
    }

    getReplaceVars(onboardingFlow, answers, i) {
        console.log("---------------");
        console.log("answers: " + JSON.stringify(answers, null, 2));
        console.log("---------------");


        var replaceVars = cliVars.slice(0);
        for (var j = 0; j < i; j++) {
            var flowItem = onboardingFlow[j];
            
            for (var k = 0; k < flowItem.flow.length; k++) {
                var element = flowItem.flow[k];

                var replaceItem = { "key": "*" + element.name + "*", "value": answers[j][element.name]};
                replaceVars.push(replaceItem);
            }
        }

        return replaceVars;
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

    doWebFlow(url) {
        var deferred = q.defer();
        var open = require('open');
        var express = require('express');

        var port = 8080;

        var app = express();

        app.get("/success", function(req, res) {
            res.send("success!");

            console.log("State verification: " + (req.query.state === state));

            var code = req.query.code;
            console.log(req.query);
            console.log(code);
            deferred.resolve(code);
        });

        app.listen(port, function() {
            console.log("Server running on port", port);
            console.log("Waiting for success call from web page");

            open(url);
        });

        return deferred.promise;
    }

    // performs inquirer prompts and gets input from user
    // since we have multiple one level sets, we need to dynamically
    // ask the user using inquirer
    getAnswers2(inquirerInput, i, answers) {
        if (i >= inquirerInput.length) {
            var deferred = q.defer();
            deferred.resolve(answers);
            return deferred.promise;
        }

        return inquirer.prompt(inquirerInput[i]).then( (subanswers) => {
            answers.push(subanswers);
            return this.getAnswers(inquirerInput, i + 1, answers).then( (answers) => {
                return answers;
            });
        });
    }

    // converts opent2t onboarding flow into multiple inquirer flows
    // onboardingFlow has two levels, inquirer only handles one level
    // so we convert into multiple one level sets
    convertFlowToInquirer2(onboardingFlow) {
        var inquirerInput = [];
        for (var i = 0; i < onboardingFlow.length; i++) {
            var flowItem = onboardingFlow[i];

            var subArray = [];

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

                subArray.push(iItem);
            }

            inquirerInput.push(subArray);
        }

        return inquirerInput;
    }
}

module.exports = OnboardingCli;