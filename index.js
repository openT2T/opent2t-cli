#!/usr/bin/env node

/**
 * Module dependencies.
 */

var program = require('commander');
var colors = require('colors');
var OnboardingCli = require("./onboardingCli");
var TranslatorCli = require("./translatorCli");
var fs = require('fs');
var helpers = require('./helpers');
var translatorCli = new TranslatorCli();

// set theme 
colors.setTheme({
  silly: 'rainbow',
  header: 'cyan'
});

program
    .version('1.0.0')
    .option('-o --onboarding [Translator Package Name]', 'Do onboarding for specified thing')
    .option('-h --hub [Hub Package Name]', 'Gets devices for the given hub')
    
    .option('-t --translator [Translator Package Name]', 'Do get property for specified thing, requires -p')
    .option('-i --id [Device id]', 'Device id you want to use')
    .option('-g --get [RAML property name]', 'Property name to GET for -t')
    .option('-s --set [RAML property name]', 'Property name to SET for -t')
    .option('-v --value [value]', 'Stringified JSON value to pass in')
    .option('-q, --test', 'testing only, do not use')
    .parse(process.argv);

console.log('Open Translators to Things CLI:');
console.log('');

if (program.test) {
    // designated to be used for testing out cli scenarios
}

else if (program.onboarding) {
    console.log("------ Doing onboarding for %j".header, program.onboarding);
    
    var fileName = "./" + program.onboarding + "_onboardingInfo.json";

    var onboardingCli = new OnboardingCli();
    onboardingCli.doOnboarding(program.onboarding).then(info => {
        var data = JSON.stringify(info);
        helpers.logObject(info);
        console.log("------ Saving onboaringInfo to: " + fileName); 
        fs.writeFile(fileName, data, function (err) {
            if (err) {
                console.log(err);
                return console.log(err);
            }
            console.log("Saved!");
        });
    }).catch(err => {
        helpers.logError(err);
    });
}

// this is for devices which communicate via a hub translator (hub device or central cloud)
else if (program.translator && program.hub) {
    console.log("------ Hub + translator for %j %j".header, program.hub, program.translator);

    var fileName = "./" + program.hub + "_onboardingInfo.json";
    helpers.readFile(fileName, "Please complete onboarding -o").then(data => { 
        var deviceInfo = JSON.parse(data);
        translatorCli.createTranslator(program.hub, deviceInfo).then(hub => {
            var fileName = "./" + program.translator + "_device_" + program.id + ".json";
            helpers.readFile(fileName, "Please complete hub -h before calling -t").then(data => {
                var deviceInfo = JSON.parse(data);
                var dInfo = { 'deviceInfo': deviceInfo, 'hub': hub };
                
                if (program.get) {
                    translatorCli.getProperty(program.translator, dInfo, program.get).then(info => {
                        helpers.logObject(info);
                    }).catch(error => {
                        helpers.logError(error);
                    });
                }
                else if (program.set) {
                    var parsedValue = JSON.parse(program.value);
                    translatorCli.setProperty(program.translator, dInfo, program.set, parsedValue).then(info => {
                        helpers.logObject(info)
                    }).catch(error => {
                        helpers.logError(error);
                    });
                }
            });
        });
    }).catch(error => {
        helpers.logError(error);
    });
}

else if (program.hub) {
    console.log("------ Hub enumerate devices for %j".header, program.hub);

    var fileName = "./" + program.hub + "_onboardingInfo.json";
    helpers.readFile(fileName, "Please complete onboarding -o").then(data => { 
        var deviceInfo = JSON.parse(data);
        translatorCli.getProperty(program.hub, deviceInfo, 'HubResURI').then(info => {
            helpers.logObject(info);
            helpers.writeArrayToFile(info.devices, "_device_", "id");
        }).catch(error => {
            helpers.logError(error);
        });
    }).catch(error => {
        helpers.logError(error);
    });
}

// this is for top level devices which don't require a hub
else if (program.translator) {
    console.log("------ Doing translator for %j".header, program.translator);

    var fileName = "./" + program.translator + "_device_" + program.id + ".json";
    helpers.readFile(fileName, "Please complete onboarding -o").then(data => { 
        var deviceInfo = JSON.parse(data);
        var dInfo = { 'deviceInfo': deviceInfo, 'hub': undefined };

        translatorCli.getProperty(program.translator, deviceInfo, program.get).then(info => {
            helpers.logObject(info);
        }).catch(error => {
            helpers.logError(error);
        });
    }).catch(error => {
        helpers.logError(error);
    });
}
else {
    program.outputHelp(make_red);
}

function make_red(txt) {
    //display the help text in red on the console
    return colors.red(txt);
}