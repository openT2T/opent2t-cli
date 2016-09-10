/* jshint esversion: 6 */
/* jshint node: true */
'use strict';
var inquirer = require('inquirer');
var helpers = require('./helpers');
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
                console.log("----------------------------- Package Info");
                helpers.logObject(tinfo);
                console.log("-----------------------------");

                return this.performFlow(tinfo.onboardingFlow).then(answers => {
                    var Onboarding = require(tinfo.onboarding);
                    var onboarding = new Onboarding();
                    return onboarding.onboard(answers);
                });

            }
        });
    }

    // does the onboarding flow and asks the user any input
    performFlow(onboardingFlow, i, onboardingAnswers) {
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

    // this resolves variables in the onboarding flow with dynamic values retreived from the user
    // takes in a key/value pair array and replces any key found in the string with the value in the array
    // input
    // my cool string with *key1* things to replace inside *key2* it
    // *key1* : value1
    // *key2* : value2
    // output
    // my cool string with value1 things to replace inside value2 it
    replaceVarsInValue(value, replaceVars) {
        var toReturn = value;
        for (var i = 0; i < replaceVars.length; i++) {
            var replaceItem = replaceVars[i];
            console.log("Replace " + replaceItem.key + " with " + replaceItem.value);
            toReturn = toReturn.replace(replaceItem.key, replaceItem.value);
        }

        return toReturn;
    }

    // given the users answers, creates a *key*/value array
    getReplaceVars(onboardingFlow, answers, i) {
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

    // starts a web server at the configured port and waits for /success call
    doWebFlow(url) {
        var deferred = q.defer();
        var open = require('open');
        var express = require('express');
        var port = 8080;
        var app = express();

        app.get("/success", function(req, res) {
            res.send("success!");

            console.log("State verification: " + (req.query.state === state));

            // load the auth code and return it
            // todo is this different for different providers?
            var code = req.query.code;
            helpers.logObject(req.query);
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
}

module.exports = OnboardingCli;