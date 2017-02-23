#!/usr/bin/env node

var fs = require("fs");
var path = require("path");
var program = require('commander');
var dom = require('xmldom').DOMParser;
var xpath = require('xpath');

var LocalPackageSource = require("opent2t/package/LocalPackageSource").LocalPackageSource;

program
    .version("0.1.0")
    .usage("<translator>")
    .option("-o, --onboarder <value>",  "Package on onboarder module")
    .parse(process.argv);

if (program.onboarder) {
        packOnboarder(program.onboarder);
}
else if (program.args.length < 1) {
    program.outputHelp();
} 
else {
    packTranslator(program.args[0]);
}

function getSchemasFromManifest(manifestPath) {
    var doc = new dom().parseFromString(fs.readFileSync(manifestPath).toString());
    var schemaNodes = xpath.select("//manifest/schemas/schema[not(@main) or @main='false']/@id", doc, false);

    return schemaNodes.map(s => {
        return s.value + "/*";
    });
}

function packTranslator(name) {
    var translatorPackageName = "opent2t-translator-" + name.replace(/\./g, "-");

    var packageSource = new LocalPackageSource(".");
    packageSource.getPackageInfoAsync(translatorPackageName).then(function (packageInfo) {
        if (!packageInfo) {
            console.error("Package not found. " +
                    "Make sure the current directory is the root of the translators repo.");
            return;
        }

        var packageTranslatorInfo = packageInfo.translators[0];
        var packageJsonPath = packageTranslatorInfo.moduleName.replace("/thingTranslator", "/package.json");
        var manifestPath = packageTranslatorInfo.moduleName.replace("/thingTranslator", "/manifest.xml");
        var packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
        LocalPackageSource.mergePackageInfo(packageJson, packageInfo);

        packageJson.main = packageTranslatorInfo.moduleName;

        var schemaName = packageTranslatorInfo.moduleName.split("/")[0];
        var translatorName = packageTranslatorInfo.moduleName.split("/")[1];
        packageJson.files = [
            schemaName + "/*.raml",
            schemaName + "/*.xml",
            schemaName + "/*.json",
            schemaName + "/*.js",
            schemaName + "/" + translatorName
        ];

        packageJson.files = packageJson.files.concat(getSchemasFromManifest(manifestPath));

        fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2), "utf8");
        console.log("Generated ./package.json file for " + packageJson.name + ".\n" +
                "Ready for npm pack or npm publish.");

    }).catch (function (error) {
        console.error("Failed to load package info: " + error);
    });
}

function packOnboarder(name) {
    var onboarderPackageName = "org.opent2t.onboarding." + name;
    var packageFile = path.join(onboarderPackageName, "js", "package.json");
    var outfile = "./package.json";

    fs.readFile(packageFile, 'utf8', (err, data) => {
        if (err) {
            return console.log(err);
        }

        var package = JSON.parse(data);

        var nameParts = package.name.split('-');
        var filepath = "org.opent2t.onboarding." + nameParts[nameParts.length - 1];

        package.main = filepath + "/js/thingOnboarding.js";
        package.files = [
            filepath + "/*",
            filepath + "/js/*"
        ];

        var contents = JSON.stringify(package, null, 2);
        fs.writeFile(outfile, contents, 'utf8', (err) => {
            if (err) {
                return console.lof(err);
            }
            console.log(contents);
        });
    });
}
