var mainModule = angular.module('mainModule', ['ui.slider', 'angularResizable']);

mainModule.controller('MainCtrl', ['$scope', '$http', '$q', 'remote', 'config', function ($scope, $http, $q, remote, config) {

    $scope.config = config;
    $scope.remoteApp = remote.app;
    $scope.onboardingMap = {};
    $scope.configuredHubs = [];
    $scope.selectedHub = undefined;
    $scope.selectedPlatform = undefined;
    $scope.hubData = {};
    $scope.state = { currentOutput: '', showOutput: true, ready: false, busy: false };
    $scope.loadingMessage = '';
    $scope.displayValues = {};

    // by default ensure loading screen shows on app launch
    $scope.loading = true;
    $scope.loadonboarding = false;
    $scope.onboarding = false;

    $scope.loadData = function () {
        $q.all([$scope.loadOnboardingInfo()]);

        $scope.remoteApp.loadConfigs().then((files) => {
            $scope.configuredHubs = files;
            $scope.loading = false;
            $scope.state.ready = true;
        });
    }

    $scope.loadOnboardingInfo = function () {
        return $scope.remoteApp.getPackageInfo().then((packages) => {

            // default use the first package
            var p = packages[0];
            if (p.translators.length > 0) {

                var tinfo = p.translators[0];
                return tinfo.onboardingFlow;
            }
        });
    }

    $scope.selectHub = function (hub) {
        $scope.selectedPlatform = undefined;
        $scope.loadingMessage = 'Loading Hub';

        if (hub !== undefined) {
            $scope.loading = true;
            getHubData(hub).then(platforms => {
                $scope.selectedHub = hub;
                $scope.selectPlatform(platforms.platforms[0]);
                // Log any failed translators
                logInfo(JSON.stringify(platforms.errors, null, 2));
            }).catch(error => {
                $scope.loading = false;
                logError(error);
            });
        }
    }

    $scope.deleteHub = function (hub) {
        $scope.remoteApp.removeHub(hub.translator).then(() => {
            if (hub === $scope.selectedHub) {
                $scope.selectedHub = undefined;
                $scope.selectedPlatform = undefined;
            }
            let hubIndex = $scope.configuredHubs.indexOf(hub);
            $scope.configuredHubs.splice(hubIndex, 1);
            $scope.$apply();
        });
    }

    $scope.refreshHub = function () {
        let currentPlatformId = $scope.selectedPlatform === undefined ? undefined : $scope.selectedPlatform.info.opent2t.controlId;
        $scope.loadingMessage = 'Refreshing Hub Data';
        $scope.loading = true;
        getHubData($scope.selectedHub).then(platforms => {
            if (currentPlatformId) {
                for (let i = 0; i < platforms.platforms.length; i++) {
                    if (platforms.platforms[i].info.opent2t.controlId === currentPlatformId) {
                        $scope.selectPlatform(platforms.platforms[i]);
                        break;
                    }
                }
            }
            // Log any failed translators
            logInfo(JSON.stringify(platforms.errors, null, 2));
        }).catch(error => {
            $scope.loading = false;
            logError(error);
        });
    }

    $scope.addHub = function () {
        $scope.knownHubs = $scope.remoteApp.getKnownHubs();
        $scope.hubName = undefined;
        $scope.hubPackage = undefined;
        $scope.onboardingPhase = 1;
        $scope.onboarding = true;
    }

    $scope.startOnboarding = function (hubPackage) {
        $scope.hubPackageName = hubPackage;
        $scope.onboardingUrl = undefined;
        $scope.remoteApp.initiateOnboarding(hubPackage).then(info => {
            $scope.onboardingInfo = info;
            $scope.onboardingPhase = 2;
            $scope.onboardingQuestions = [];
            for (let i = 0; i < info.onboardingFlow.length; i++) {
                let flowItem = info.onboardingFlow[i];
                if (flowItem.name === 'getDeveloperInput' || flowItem.name === 'getUserInput') {
                    for (let j = 0; j < flowItem.flow.length; j++) {
                        let question = flowItem.flow[j];
                        $scope.onboardingQuestions.push({ question: question.descriptions.en, type: question.type, name: question.name, setIndex: i, answer: '' });
                    }
                }
                else if (flowItem.name === 'askUserPermission') {
                    $scope.onboardingUrl = {
                        description: flowItem.flow[0].descriptions.en,
                        name: flowItem.flow[0].name,
                        index: i
                    }
                }
            }
            $scope.$apply();
        }).catch(error => {
            logError(error);
            $scope.$apply();
        });
    }

    $scope.completeOnboarding = function () {
        let answers = [];

        for (let i = 0; i < $scope.onboardingInfo.onboardingFlow.length; i++) {
            answers.push({});
        }

        for (let i = 0; i < $scope.onboardingQuestions.length; i++) {
            let question = $scope.onboardingQuestions[i];
            answers[question.setIndex][question.name] = question.answer;
        }

        $scope.getUserPermission(answers).then(answers => {
            $scope.loadingMessage = 'Completing Onboarding';
            $scope.loadonboarding = true;
            $scope.remoteApp.doOnboarding($scope.hubName, $scope.hubPackageName, $scope.onboardingInfo.onboarding, answers).then(hub => {
                $scope.configuredHubs.push(hub);
                $scope.onboarding = false;
                $scope.loadonboarding = false;
                $scope.selectHub(hub);
            }).catch(error => {
                $scope.loadonboarding = false;
                logError(error);
                $scope.$apply();
            });
        }).catch(error => {
            logError(error);
            $scope.$apply();
        });
    }

    $scope.getUserPermission = function (answers) {
        var deferred = $q.defer();

        if ($scope.onboardingUrl === undefined) {
            deferred.resolve(answers);
        }
        else {
            $scope.loadingMessage = 'Getting User Permission';
            $scope.loadonboarding = true;
            $scope.remoteApp.getUserPermission($scope.onboardingInfo.onboarding, $scope.onboardingUrl, answers).then(code => {
                answers[$scope.onboardingUrl.index] = code;
                $scope.loadonboarding = false;
                deferred.resolve(answers);
            }).catch(error => {
                $scope.loadonboarding = false;
                logError(error);
                $scope.$apply();
            });
        }

        return deferred.promise;
    }

    $scope.cancelOnboarding = function () {
        clearLog();
        $scope.loadonboarding = false;
        $scope.onboarding = false;
    }

    $scope.verifyOnboarding = function (onboardingQuestions) {
        for (let i = 0; i < onboardingQuestions.length; i++) {
            if (onboardingQuestions[i].answer === undefined || onboardingQuestions[i].answer === '') {
                return false;
            }
        }

        return true;
    }

    $scope.getResourceStyle = function(resource) {
        let style = {};

        if (resource.rt[0] === 'oic.r.colour.rgb') {
            let rgb = resource.rgbValue;
            if (rgb && rgb[0] !== null && rgb[1] !== null && rgb[2] !== null) {
                style['background-color'] = `rgb(${Math.round(rgb[0])},${Math.round(rgb[1])},${Math.round(rgb[2])})`;
            }
        }

        return style;
    }

    $scope.selectPlatform = function (platform) {
        clearLog();
        $scope.invokeMethodName = undefined;
        $scope.invokeMethodParams = undefined;
        $scope.selectedPlatform = $scope.selectedPlatform !== platform ? platform : undefined;
    }

    $scope.getDeviceInfo = function (device) {
        clearLog();
        $scope.state.showOutput = true;
        logInfo(angular.toJson(device.info, 2));
    }

    $scope.getDeviceProperty = function (device, property) {
        $scope.state.busy = true;
        clearLog();
        $scope.state.showOutput = true;
        $scope.remoteApp.getProperty($scope.selectedHub.translator, device.info, device.info.entities[0].di, property).then(info => {
            logInfo(JSON.stringify(info, null, 2));
            $scope.state.busy = false;
            $scope.$apply();
        }).catch(error => {
            $scope.state.busy = false;
            logError(error);
            $scope.$apply();
        });
    }

    $scope.setBinarySwitchValue = function (device, property, value) {
        setDeviceProperty(device, property, { value: value }).then(info => {
            property.value = info.value;
        }).catch(error => {
            logError(error);
        });
    }

    $scope.setDimmingValue = function (device, property, value) {
        setDeviceProperty(device, property, { dimmingSetting: value }).then(info => {
            property.dimmingSetting = info.dimmingSetting;
        }).catch(error => {
            logError(error);
        });
    }

    $scope.dimmingSetPercentage = function (device, property, value) {
        setDeviceProperty(device, property, { dimmingSetPercentage: value }).then(info => {
            property.dimmingSetPercentage = info.dimmingSetPercentage;
        }).catch(error => {
            logError(error);
        });
    }

    $scope.dimmingIncrementPercentage = function (device, property, value) {
        setDeviceProperty(device, property, { dimmingIncrementPercentage: value }).then(info => {
            property.dimmingIncrementPercentage = info.dimmingIncrementPercentage;
            property.dimmingSetPercentage = info.dimmingSetPercentage;
        }).catch(error => {
            logError(error);
        });
    }

    $scope.dimmingDecrementPercentage = function (device, property, value) {
        setDeviceProperty(device, property, { dimmingDecrementPercentage: value }).then(info => {
            property.dimmingDecrementPercentage = info.dimmingDecrementPercentage;
            property.dimmingSetPercentage = info.dimmingSetPercentage;
        }).catch(error => {
            logError(error);
        });
    }
    $scope.setTemperatureValue = function (device, property, value) {
        setDeviceProperty(device, property, { temperature: value, units: property.units }).then(info => {
            property.temperature = info.temperature;
            if (!!info.units) {
                property.units = info.units;
            }
            console.log(info);
        }).catch(error => {
            logError(error);
        });
    }

    $scope.setColourChroma = function (device, property, value) {
        setDeviceProperty(device, property, { ct: value }).then(info => {
            property.ct = info.ct;
        }).catch(error => {
            logError(error);
        });
    }

    $scope.setColourRgb = function (device, property) {
        let controlId = device.info.opent2t.controlId;
        let propVals = $scope.displayValues[`${controlId}_${property.id}`];
        setDeviceProperty(device, property, { rgbValue: [propVals.currentRed, propVals.currentGreen, propVals.currentBlue] }).then(info => {
            property.rgbValue = info.rgbValue;
            addDisplayValue(controlId, property.id, 'currentRed', property.rgbValue[0]);
            addDisplayValue(controlId, property.id, 'currentGreen', property.rgbValue[1]);
            addDisplayValue(controlId, property.id, 'currentBlue', property.rgbValue[2]);
        }).catch(error => {
            logError(error);
        });
    }

    $scope.setHumidityValue = function (device, property, value) {
        setDeviceProperty(device, property, { humidity: value }).then(info => {
            property.humidity = info.humidity;
        }).catch(error => {
            logError(error);
        });
    }

    $scope.setModeValue = function (device, property) {
        let controlId = device.info.opent2t.controlId;
        let propVals = $scope.displayValues[`${controlId}_${property.id}`];
        setDeviceProperty(device, property, { modes: [propVals.currentMode] }).then(info => {
            property.modes = info.modes;
            addDisplayValue(controlId, property.id, 'currentMode', property.modes[0]);
        }).catch(error => {
            logError(error);
        });
    }

    $scope.invokeDeviceMethod = function (device, methodName, params) {
        clearLog();
        $scope.state.busy = true;
        $scope.remoteApp.invokeDeviceMethod($scope.selectedHub.translator, device.info, methodName, params).then(info => {
            logInfo(JSON.stringify(info, null, 2));
            $scope.remoteApp.getDeviceInfo($scope.selectedHub.translator, device.info).then(deviceInfo => {
                device.info = deviceInfo;
                $scope.state.busy = false;
                $scope.$apply();
            }).catch(error => {
                $scope.state.busy = false;
                deferred.reject(error);
            });
        }).catch(error => {
            $scope.state.busy = false;
            logError(error);
            $scope.$apply();
        });
    }

    function setDeviceProperty(device, property, payload) {
        clearLog();

        let deferred = $q.defer();
        $scope.state.busy = true;

        $scope.remoteApp.setProperty($scope.selectedHub.translator, device.info, device.info.entities[0].di, property.id, payload).then(info => {
            logInfo(JSON.stringify(info, null, 2));
            deferred.resolve(info);
            $scope.state.busy = false;
        }).catch(error => {
            $scope.remoteApp.getDeviceInfo($scope.selectedHub.translator, device.info).then(deviceInfo => {
                device.info = deviceInfo;
                $scope.state.busy = false;
                $scope.$apply();
            }).catch(error => {
                $scope.state.busy = false;
                logError(error);
                $scope.$apply();
            });
            deferred.reject(error);
        });

        return deferred.promise;
    }

    $scope.setScene = function (device, property) {
        setDeviceProperty(device, property, false).then(info => {
            property.value = false;
        }).catch(error => {
            logError(error);
        });
    }

    function addDisplayValue(controlId, resourceId, propertyName, value) {
        let itemKey = `${controlId}_${resourceId}`;
        let displayItem = $scope.displayValues[itemKey];

        if (!displayItem) {
            displayItem = {};
            $scope.displayValues[itemKey] = displayItem;
        }

        displayItem[propertyName] = value;
    }

    function getHubData(hub) {
        let deferred = $q.defer();

        $scope.remoteApp.loadDevices(hub.translator).then(info => {
            let platforms = [];
            for (var i = 0; i < info.platforms.length; i++) {
                let platform = info.platforms[i];
                let controlId = platform.opent2t.controlId;

                //This is a workaround because angular doesn't handle binding to array elements well.
                for (let j = 0; j < platform.entities[0].resources.length; j++) {
                    let resource = platform.entities[0].resources[j];
                    if (resource.rt[0] === 'oic.r.mode' && resource.modes !== undefined) {
                        addDisplayValue(controlId, resource.id, 'currentMode', resource.modes[0]);
                    }
                    else if (resource.rt[0] === 'oic.r.colour.rgb') {
                        addDisplayValue(controlId, resource.id, 'currentRed', resource.rgbValue[0]);
                        addDisplayValue(controlId, resource.id, 'currentGreen', resource.rgbValue[1]);
                        addDisplayValue(controlId, resource.id, 'currentBlue', resource.rgbValue[2]);
                    }
                }

                platforms.push({ info: platform, metadata: getDeviceMetadata(platform) });
            }

            $scope.hubData[hub.translatorPackageName] = platforms;
            $scope.loading = false;
            deferred.resolve({
                platforms: platforms,
                errors: info.errors
            });
        }).catch(error => {
            deferred.reject(error);
        });

        return deferred.promise;
    }

    function getDeviceMetadata(device) {
        let iconClass = 'fa-question-circle-o';
        let sizeClass = 'ct-small-thing';

        switch (device.opent2t.schema) {
            case 'org.opent2t.sample.binaryswitch.superpopular':
                iconClass = 'fa-plug';
                break;
            case 'org.opent2t.sample.lamp.superpopular':
                iconClass = 'fa-lightbulb-o';
                break;
            case 'org.opent2t.sample.thermostat.superpopular':
                iconClass = 'fa-thermometer-half';
                break;
        }

        let resourceCount = device.entities[0].resources.length;
        if (resourceCount > 4) {
            sizeClass = 'ct-large-thing';
        }
        else if (resourceCount > 2) {
            sizeClass = 'ct-medium-thing';
        }

        return { iconClass: iconClass, sizeClass: sizeClass };
    }

    function logInfo(message) {
        $scope.state.outputType = 'info';
        $scope.state.currentOutput = message;
    }

    function logError(message) {
        $scope.state.outputType = 'error';
        $scope.state.currentOutput = message;
    }

    function clearLog() {
        $scope.state.outputType = 'info';
        $scope.state.currentOutput = '';
    }

    $scope.loadData();
}]);
