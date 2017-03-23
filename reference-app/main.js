var electron = require('electron');
var app = electron.app;
var BrowserWindow = electron.BrowserWindow;
var q = require('q');
var fs = require('fs');
var glob = require('glob');
var path = require('path');
var rootPath = process.cwd();
var Opent2tHelper = require("../Opent2tHelper");
var opent2tHelper = new Opent2tHelper();
var helpers = require('../helpers');
var arguments = process.argv.slice(2);
var debug = arguments.indexOf('--d') !== -1 || arguments.indexOf('--debug') !== -1;

// Uncomment the following line during development to get automatic updating.
// require('electron-reload')(__dirname);

var modulesRoot = path.join(rootPath, '/node_modules/');


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

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // and load the app.html of the app.
    mainWindow.loadURL('file://' + __dirname + '/app.html');

    if(debug) {
        mainWindow.openDevTools();
    }

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
});

app.getPackageInfo = function() {
    return opent2tHelper.getAllPackageInfo();
}

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
    let configs = [];
    let hubInfoFiles = glob.sync(path.join(rootPath, '*_onboardingInfo.json'));

    app.getKnownHubs();

    let promises = [];
    hubInfoFiles.forEach((item) => {
        promises.push(app.readFile(item));
    });

    q.all(promises).then(results => {
        for (var i = 0; i < results.length; i++) {
            configs.push(JSON.parse(results[i]));
        }
        deferred.resolve(configs);
    });

    return deferred.promise;
}

app.getKnownHubs = function () {
    let hubTranslators = glob.sync(modulesRoot + '/opent2t-translator-com-*-hub');
    let knownHubs = hubTranslators.map(f => path.basename(f));
    return knownHubs;
}

app.loadDevices = function (hubName) {
    let deferred = q.defer();
    let fileName = path.join(rootPath, helpers.createOnboardingFileName(hubName));

    helpers.readFile(fileName, "Please complete onboarding -o").then(data => {
        let configInfo = JSON.parse(data);
        let deviceInfo = configInfo.authInfo;
        opent2tHelper.getProperty(configInfo.translatorPackageName, deviceInfo, 'get', [true]).then(info => {
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

app.getUserPermission = function (onboardingInfo, flow, answers) {
    var deferred = q.defer();
    try {
        let Onboarding = require(path.join(modulesRoot, onboardingInfo));
        let onboarding = new Onboarding();

        opent2tHelper.getUserPermission(onboarding, flow, answers).then(code => {
            deferred.resolve(code);
        }).catch(error => {
            deferred.reject(error);
        });
    } catch (error) {
        deferred.reject(error);
    }

    return deferred.promise;
}

app.doOnboarding = function (name, translatorName, onboardingInfo, answers) {
    var deferred = q.defer();
    try {
        let Onboarding = require(path.join(modulesRoot, onboardingInfo));
        let onboarding = new Onboarding();

        onboarding.onboard(answers).then(info => {
            name = helpers.sanitizeFileName(name);
            let hubInfo = { translator: name, translatorPackageName: translatorName, authInfo: info };
            let data = JSON.stringify(hubInfo);
            let fileName = helpers.createOnboardingFileName(name);
            fs.writeFile(path.join(rootPath, fileName), data, function (error) {
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
    } catch (error) {
        deferred.reject(error);
    }

    return deferred.promise;
}

app.removeHub = function (name) {
    var deferred = q.defer();

    let fileName = helpers.createOnboardingFileName(name);
    
    fs.unlink(path.join(rootPath, fileName), (err) => {
        if (err) {
            deferred.reject(err);
        }
        else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function createHub(hubName) {
    let deferred = q.defer();
    let fileName = path.join(rootPath, helpers.createOnboardingFileName(hubName));

    helpers.readFile(fileName, "Please complete onboarding -o").then(data => {
        let configInfo = JSON.parse(data);
        let deviceInfo = configInfo.authInfo;
        opent2tHelper.createTranslator(configInfo.translatorPackageName, deviceInfo).then(translator => {
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