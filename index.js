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

program
    .version('1.0.0')
    .option('-o --onboarding [Translator Package Name]', 'Do onboarding for specified thing')
    .option('-h --hub [Hub Package Name]', 'Gets devices for the given hub')
    
    .option('-t --translator [Translator Package Name]', 'Do get property for specified thing, requires -p')
    .option('-i --id [Device id]', 'Device id you want to use')
    .option('-p --property [RAML property name]', 'Property name to get for -t')
    .option('-r, --run', 'Run translator')
    .option('-v, --validate', 'Validate translator')
    .parse(process.argv);

console.log('Open Translators to Things CLI:');
console.log('');

if (program.run) {
    console.log(make_red('Validating lamp schema implementation: NOT IMPLEMENTED YET'));
} 
else if (program.validate) {
    console.log(make_red('Validating lamp schema implementation: NOT IMPLEMENTED YET'));
}
else if (program.onboarding) {
    console.log("------ Doing onboarding for %j", program.onboarding);
    
    var fileName = "./" + program.onboarding + "_onboardingInfo.json";

    var onboardingCli = new OnboardingCli();
    onboardingCli.doOnboarding(program.onboarding).then(info => {
        var data = JSON.stringify(info);
        console.log(info);
        console.log(data);
        console.log("Saving onboaringInfo to: " + fileName); 
        fs.writeFile(fileName, data, function (err) {
            if (err) {
                console.log(err);
                return console.log(err);
            }
            console.log("Saved!");
        });
    }).catch(err => {
        console.log("Error Received");
        console.log(err);
    });
}
// this is for devices which communicate via a hub translator (hub device or central cloud)
else if (program.translator && program.hub) {
    console.log("------ Doing translator for %j", program.translator);

    var fileName = "./" + program.hub + "_onboardingInfo.json";
    fs.readFile(fileName, 'utf8', function (err,data) {
        if (err) {
            if (err.errno === -4058) {
                return console.log("Please complete onboarding -o before calling -h");
            }

            return console.log(err);
        }

        var deviceInfo = JSON.parse(data);
        var translatorCli = new TranslatorCli();
        var hub = translatorCli.createTranslator(program.hub, deviceInfo);

        var fileName = "./" + program.translator + "_device_" + program.id + ".json";
        fs.readFile(fileName, 'utf8', function (err,data) {
            if (err) {
                if (err.errno === -4058) {
                    return console.log("Please complete hub -h before calling -t");
                }

                return console.log(err);
            }

            var deviceInfo = JSON.parse(data);
            var translatorCli = new TranslatorCli();
            var dInfo = { 'deviceInfo': deviceInfo, 'hub': hub };
            
            translatorCli.doTranslator(program.translator, dInfo, program.property).then(info => {
                console.log(info);
            }).catch(err => {
                console.log("Error Received");
                console.log(err);
            });
        });
    });

}

else if (program.hub) {
    console.log("------ Doing hub for %j", program.hub);

    var fileName = "./" + program.hub + "_onboardingInfo.json";
    fs.readFile(fileName, 'utf8', function (err,data) {
        if (err) {
            if (err.errno === -4058) {
                return console.log("Please complete onboarding -o before calling -h");
            }

            return console.log(err);
        }

        var deviceInfo = JSON.parse(data);
        var translatorCli = new TranslatorCli();
        translatorCli.doTranslator(program.hub, deviceInfo, 'HubResURI').then(info => {
            console.log(JSON.stringify(info, null, 2));
            helpers.writeArrayToFile(info.devices, "_device_", "id");
        }).catch(err => {
            console.log("Error Received");
            console.log(err);
        });
    });


}
// this is uses for top level devices which don't require a hub
else if (program.translator) {
    console.log("------ Doing translator for %j", program.translator);

    var fileName = "./" + program.translator + "_device_" + program.id + ".json";
    fs.readFile(fileName, 'utf8', function (err,data) {
        if (err) {
            if (err.errno === -4058) {
                return console.log("Please complete onboarding -o before calling -t");
            }

            return console.log(err);
        }

        var deviceInfo = JSON.parse(data);
        var translatorCli = new TranslatorCli();
        var dInfo = { 'deviceInfo': deviceInfo, 'hub': undefined };

        translatorCli.doTranslator(program.translator, deviceInfo, program.property).then(info => {
            console.log(info);
        }).catch(err => {
            console.log("Error Received");
            console.log(err);
        });
    });
}
else {
    program.outputHelp(make_red);
}

function make_red(txt) {
    //display the help text in red on the console
    return colors.red(txt);
}