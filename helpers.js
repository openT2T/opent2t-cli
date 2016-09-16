'use strict';

var fs = require('fs');
var q = require('q');
var colors = require('colors');

// writes the given array to a set of files
// one file per array object
// file name is based on fileNameBase + array[i][propertyToAppend]
function writeArrayToFile(arrayObject, fileNameBase, propertyToAppend, i) {
    if (!i) {
        i = 0;
    }

    if (i >= arrayObject.length) {
        return;
    }
    
    let item = arrayObject[i];
    
    let fileName = item.openT2T.translator + fileNameBase + item[propertyToAppend] + ".json";

    console.log("------ Saving device %j to: %j", item[propertyToAppend], fileName); 
    let contents = JSON.stringify(item);
    fs.writeFile(fileName, contents, function (err, data) {
        if (err) {
            return console.log(err);
        }

        return writeArrayToFile(arrayObject, fileNameBase, propertyToAppend, i+1);
    });
}

// reads the file and returns its contents
// if the file is not found, rejects with the provided error message
// if any other error, rejects with the error
function readFile(fileName, errorMessage) {
    let deferred = q.defer();

    fs.readFile(fileName, 'utf8', function (err,data) {
        if (err) {
            if (err.errno === -4058) {
                deferred.reject(errorMessage);
            }

            deferred.reject(err);
        }

        deferred.resolve(data);
    });

    return deferred.promise;
}

// logs the given error in red
function logError(error) {
    // do anything special
    console.log(colors.red("***************** Error Received *****************"));
    console.log(colors.red(error));
}


function createHubDeviceFileName(hubName, deviceId) {
    return createSaveFileName(hubName, "_device_" + deviceId);
}

function createOnboardingFileName(baseName) {
    return createSaveFileName(baseName, "_onboardingInfo");
}

function createSaveFileName(baseName, trailing) {
    return "./" + baseName + trailing + ".json";
}

function logObject(objectToLog) {
    console.log(colors.green(JSON.stringify(objectToLog, null, 2)));
}

function logHeader(stringToLog) {
    console.log(colors.cyan(stringToLog));
}

function logDebug(stringToLog) {
    console.log(colors.grey(stringToLog));
}

module.exports.writeArrayToFile = writeArrayToFile;
module.exports.readFile = readFile;
module.exports.logObject = logObject;
module.exports.logError = logError;
module.exports.logHeader = logHeader;
module.exports.logDebug = logDebug;
module.exports.createOnboardingFileName = createOnboardingFileName;
module.exports.createHubDeviceFileName = createHubDeviceFileName;
