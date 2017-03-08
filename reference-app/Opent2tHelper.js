'use strict';

var q = require('q');
var cliVars = [{ "key": "{state}", "value": "opent2t-cli" }];

class Opent2tHelper {
    constructor() {
        this.OpenT2T = require('opent2t').OpenT2T;
    }

    invokeDeviceMethod(translatorName, deviceInfo, methodName, params) {
        let deferred = q.defer();

        this.createTranslator(translatorName, deviceInfo).then(translator => {
            this.OpenT2T.invokeMethodAsync(translator, "", methodName, params).then(info => {
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
            this.OpenT2T.invokeMethodAsync(translator, "", property, [value]).then(data => {
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
            this.OpenT2T.invokeMethodAsync(translator, "", property, [deviceId, value]).then(data => {
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

        this.OpenT2T.createTranslatorAsync(translatorName, deviceInfo).then(translator => {
            deferred.resolve(translator);
        }).catch(error => {
            deferred.reject(error);
        });

        return deferred.promise;
    }

    getTranslatorInfo(translatorName) {
        var deferred = q.defer();

        var LocalPackageSourceClass = require('opent2t/package/LocalPackageSource').LocalPackageSource;
        var localPackageSource = new LocalPackageSourceClass(translatorName);

        localPackageSource.getAllPackageInfoAsync().then((packages) => {
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

    getUserPermission(onboarding, flow, answers) {
        var deferred = q.defer();
    
        this.getUrl(onboarding, flow, answers).then((url) => {
            var open = require('open');
            var express = require('express');
            var port = 8080;
            var app = express();

            app.get("/success", function (req, res) {
                res.send("success!");
                deferred.resolve(req.url);
            });

            app.listen(port, function () {
                open(url);
            });
        });

        return deferred.promise;
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
}

module.exports = Opent2tHelper;