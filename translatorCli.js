/* jshint esversion: 6 */
/* jshint node: true */
'use strict';
var inquirer = require('inquirer');
var helpers = require('./helpers');
var q = require('q');

class TranslatorCli {
    constructor() {
        this.OpenT2T = require('opent2t').OpenT2T;
    }

    // loads the specified translator and performs the onboarding for it
    getProperty(translatorName, deviceInfo, property) {
        helpers.logHeader("Getting " + property + " from " + translatorName);

        return this.createTranslator(translatorName, deviceInfo).then(translator => {
            return this.OpenT2T.getPropertyAsync(translator, "", property);
        });
    }

    setProperty(translatorName, deviceInfo, property, value) {
        helpers.logHeader("Setting " + translatorName + " to:");
        helpers.logObject(value);

        return this.createTranslator(translatorName, deviceInfo).then(translator => {
            return this.OpenT2T.invokeMethodAsync(translator, "", "post" + property, [value]);
        });
    }

    createTranslator(translatorName, deviceInfo) {
        return this.OpenT2T.createTranslatorAsync(translatorName, deviceInfo).then( translator => {
            return translator;
        }); 
    }
}

module.exports = TranslatorCli;