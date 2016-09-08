/* jshint esversion: 6 */
/* jshint node: true */
'use strict';
var inquirer = require('inquirer');
var q = require('q');

class TranslatorCli {
    constructor() {
        this.OpenT2T = require('opent2t').OpenT2T;

    }

    // loads the specified translator and performs the onboarding for it
    doTranslator(translatorName, deviceInfo, property) {
        var translator = this.createTranslator(translatorName, deviceInfo);

        return this.OpenT2T.getPropertyAsync(translator, "", property);
    }

    createTranslator(translatorName, deviceInfo) {
        var Translator = require(translatorName);
        var translator = new Translator(deviceInfo);

        return translator; 
    }

}

module.exports = TranslatorCli;