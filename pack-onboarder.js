#!/usr/bin/env node

var fs = require("fs");
var path = require("path");
var program = require('commander');

program
    .version("0.1.0")
    .usage("onboarder name>")
    .parse(process.argv);

if (program.args.length != 1) {
    program.outputHelp();
} 
else {
    packOnboarder(program.args[0]);
}

/** 
 * Adds relative paths to the appropriate onboarding package.json
*/
function packOnboarder(name) {
    const onboardPrefix = "org.opent2t.onboarding.";

    var onboarderPackageName = name.startsWith(onboardPrefix) ? name : onboardPrefix + name;
    var packageFile = path.join(onboarderPackageName, "js", "package.json");
    var outfile = "./package.json";

    fs.readFile(packageFile, 'utf8', (err, data) => {
        if (err) {
            return console.log(err);
        }

        var package = JSON.parse(data);

        var nameParts = package.name.split('-');
        var filepath = onboardPrefix + nameParts[nameParts.length - 1];

        package.main = filepath + "/js/thingOnboarding.js";
        package.files = [
            filepath + "/*",
            filepath + "/js/*"
        ];

        var contents = JSON.stringify(package, null, 2);
        fs.writeFile(outfile, contents, 'utf8', (err) => {
            if (err) {
                return console.log(err);
            }

            console.log("Generated ./package.json file for " + package.name + ".\n" +
                "Ready for npm pack or npm publish.");
        });
    });
}