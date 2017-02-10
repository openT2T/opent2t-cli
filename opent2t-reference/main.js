var electron = require('electron');
var app = electron.app;
var BrowserWindow = electron.BrowserWindow;
var q = require('q');
var fs = require('fs');
require('electron-reload')(__dirname);
var Opent2tHelper = require("./Opent2tHelper");
var opent2tHelper = new Opent2tHelper();
var helpers = require('./helpers');


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is GCed.
var mainWindow = null;

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform != 'darwin') {
        app.quit();
    }
});

app.on('ready', function () {
    // Create the browser window.
    mainWindow = new BrowserWindow({ width: 1198, height: 750, frame: true, show: false, autoHideMenuBar: true });
    //mainWindow.$ = mainWindow.jQuery = require('./lib/jquery-2.1.4.min.js');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // and load the index.html of the app.
    mainWindow.loadURL('file://' + __dirname + '/index.html');

    // Open the devtools.
    //mainWindow.openDevTools();

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
});

app.readFile = function (fileName) {
    let deferred = q.defer();

    fs.readFile(fileName, function (err, data) {
        if (err) {
            deferred.reject(err);
        }
        else {
            deferred.resolve(data);
        }
    });

    return deferred.promise;
}

app.loadConfigs = function () {
    let deferred = q.defer();
    let filePath = "./configs";

    fs.readdir(filePath, (err, files) => {
        if (err) {
            deferred.reject(err);
        }

        let promises = [];
        files.forEach((item, index) => {
            promises.push(app.readFile(filePath + "/" + item));
        });

        q.all(promises).then(results => {
            let configs = [];
            for (var i = 0; i < results.length; i++) {
                configs.push(JSON.parse(results[i]));
            }
            deferred.resolve(configs);
        });
    });

    return deferred.promise;
}

app.loadDevices = function (hubName) {
    let deferred = q.defer();

    let fileName = "./configs/" + hubName + ".json";
    helpers.readFile(fileName, "Please complete onboarding -o").then(data => {
        let deviceInfo = JSON.parse(data).authInfo;
        opent2tHelper.getProperty(hubName, deviceInfo, 'get', [true]).then(info => {
            deferred.resolve(info);
        }).catch(error => {
            deferred.reject(error);
        });
    }).catch(error => {
        deferred.reject(error);
    });

    return deferred.promise;
}

app.invokeDeviceMethod = function (hubName, thingInfo, methodName, params) {
    let deferred = q.defer();

    try {
        let parsedParams = JSON.parse(params);
        createHub(hubName).then(hub => {
            let dInfo = { 'deviceInfo': thingInfo, 'hub': hub };
            opent2tHelper.invokeDeviceMethod(thingInfo.opent2t.translator, dInfo, methodName, parsedParams).then(info => {
                deferred.resolve(info);
            }).catch(error => {
                deferred.reject(error);
            });
        }).catch(error => {
            deferred.reject(error);
        });
    } catch (error) {
        deferred.reject(error);
    }

    return deferred.promise;
}

app.getDeviceInfo = function (hubName, thingInfo) {
    let deferred = q.defer();

    try {
        createHub(hubName).then(hub => {
            let dInfo = { 'deviceInfo': thingInfo, 'hub': hub };
            opent2tHelper.getProperty(thingInfo.opent2t.translator, dInfo, 'get', [true]).then(info => {
                deferred.resolve(info);
            }).catch(error => {
                deferred.reject(error);
            });
        }).catch(error => {
            deferred.reject(error);
        });
    } catch (error) {
        deferred.reject(error);
    }

    return deferred.promise;
}

app.setProperty = function (hubName, thingInfo, deviceId, property, propValue) {
    let deferred = q.defer();

    getSetProperty(hubName, thingInfo, deviceId, property, propValue).then(data => {
        deferred.resolve(data);
    }).catch(error => {
        deferred.reject(error);
    });

    return deferred.promise;
}

app.getProperty = function (hubName, thingInfo, deviceId, property) {
    let deferred = q.defer();

    getSetProperty(hubName, thingInfo, deviceId, property).then(data => {
        deferred.resolve(data);
    }).catch(error => {
        deferred.reject(error);
    });

    return deferred.promise;
}

app.initiateOnboarding = function (translatorName) {
    var deferred = q.defer();

    opent2tHelper.getTranslatorInfo(translatorName).then(info => {
        deferred.resolve(info);
    }).catch(error => {
        deferred.reject(error);
    });

    return deferred.promise;
}

app.getUserPermission = function (permissionUrl, answers) {
    var deferred = q.defer();

    opent2tHelper.getUserPermission(permissionUrl, answers).then(code => {
        deferred.resolve(code);
    }).catch(error => {
        deferred.reject(error);
    });

    return deferred.promise;
}

app.doOnboarding = function (name, translatorName, onboardingInfo, answers) {
    var deferred = q.defer();
    let Onboarding = require(onboardingInfo);
    let onboarding = new Onboarding();

    onboarding.onboard(answers).then(info => {
        let hubInfo = { translator: name, translatorPackageName: translatorName, authInfo: info };
        let data = JSON.stringify(hubInfo);
        fs.writeFile(`./configs/${translatorName}.json`, data, function (error) {
            if (error) {
                deferred.reject(error);
            }
            else {
                deferred.resolve(hubInfo);
            }
        });
    }).catch(error => {
        deferred.reject(error);
    });

    return deferred.promise;
}

function createHub(hubName) {
    let deferred = q.defer();

    let fileName = "./configs/" + hubName + ".json";
    helpers.readFile(fileName, "Please complete onboarding -o").then(data => {
        let deviceInfo = JSON.parse(data).authInfo;
        opent2tHelper.createTranslator(hubName, deviceInfo).then(translator => {
            deferred.resolve(translator);
        }).catch(error => {
            deferred.reject(error);
        });
    }).catch(error => {
        deferred.reject(error);
    });

    return deferred.promise;
}

function getSetProperty(hubName, thingInfo, deviceId, property, propValue) {
    let deferred = q.defer();
    let methodNameBase = `Devices${property.charAt(0).toUpperCase() + property.slice(1)}`;

    createHub(hubName).then(hub => {
        let dInfo = { 'deviceInfo': thingInfo, 'hub': hub };
        if (propValue === undefined) {
            opent2tHelper.getProperty(thingInfo.opent2t.translator, dInfo, `get${methodNameBase}`, deviceId).then(data => {
                deferred.resolve(data);
            }).catch(error => {
                deferred.reject(error);
            });
        }
        else {
            opent2tHelper.setProperty(thingInfo.opent2t.translator, dInfo, `post${methodNameBase}`, deviceId, propValue).then(data => {
                deferred.resolve(data);
            }).catch(error => {
                deferred.reject(error);
            });
        }
    }).catch(error => {
        deferred.reject(error);
    });

    return deferred.promise;
}