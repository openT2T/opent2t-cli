var mainModule = angular.module('mainModule', ['ui.slider']);

mainModule.controller('MainCtrl', ['$scope', '$http', '$q', 'remote', 'config', function ($scope, $http, $q, remote, config) {

    $scope.opent2t = require('opent2t').OpenT2T;
    $scope.config = config;
    $scope.remoteApp = remote.app;
    $scope.onboardingMap = {};
    $scope.configuredHubs = [];
    $scope.selectedHub = undefined;
    $scope.selectedPlatform = undefined;
    $scope.hubData = {};
    $scope.state = { currentOutput: '', showOutput: true };
    $scope.loadingMessage = '';

    // by default ensure loading screen shows on app launch
    $scope.loading = true;
    $scope.onboarding = false;

    $scope.loadData = function () {

        // load onboarding info from supportedHubs
        var promises = [];
        for (var i = 0; i < $scope.config.supportedHubs.length; i++) {
            promises.push($scope.loadOnboardingInfo($scope.config.supportedHubs[i]));
        }
        $q.all(promises);

        // load already configured hubs
        $scope.remoteApp.loadConfigs().then((files) => {
            $scope.configuredHubs = files;
        });

        $scope.loading = false;
    }

    $scope.loadOnboardingInfo = function (translatorName) {
        var LocalPackageSourceClass = require('opent2t/package/LocalPackageSource').LocalPackageSource;
        var localPackageSource = new LocalPackageSourceClass("./node_modules/" + translatorName);

        return localPackageSource.getAllPackageInfoAsync().then((packages) => {

            // default use the first package
            var p = packages[0];
            if (p.translators.length > 0) {

                var tinfo = p.translators[0];
                $scope.onboardingMap[translatorName] = tinfo.onboardingFlow;
                return tinfo.onboardingFlow;
            }
        });
    }

    $scope.selectHub = function (hub) {
        $scope.selectedPlatform = undefined;
        $scope.loadingMessage = 'Loading Hub';
        $scope.selectedHub = hub;

        if ($scope.selectedHub !== undefined && $scope.hubData[$scope.selectedHub.translatorPackageName] === undefined) {
            $scope.loading = true;
            getHubData().then(platforms => {
                $scope.selectPlatform(platforms[0]);
            }).catch(error => {
                logError(error);
                $scope.$apply();
            });
        }
        else {
            $scope.selectPlatform($scope.hubData[$scope.selectedHub.translatorPackageName][0]);
        }
    }

    $scope.refreshHub = function () {
        let currentPlatformId = $scope.selectedPlatform === undefined ? undefined : $scope.selectedPlatform.info.opent2t.controlId;
        $scope.loadingMessage = 'Refreshing Hub Data';
        $scope.loading = true;
        getHubData().then(platforms => {
            if(currentPlatformId) {
                for(let i = 0;i < platforms.length;i++) {
                    if(platforms[i].info.opent2t.controlId === currentPlatformId) {
                        $scope.selectPlatform(platforms[i]);
                        break;
                    }
                }
            }
        }).catch(error => {
            logError(error);
            $scope.$apply();
        });
    }

    $scope.addHub = function () {
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
                    $scope.onboardingUrl = { url: flowItem.flow[0].descriptions.en, index: i };
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
            $scope.loading = true;
            $scope.remoteApp.doOnboarding($scope.hubName, $scope.hubPackageName, $scope.onboardingInfo.onboarding, answers).then(hub => {
                $scope.configuredHubs.push(hub);
                $scope.onboarding = false;
                $scope.selectHub(hub);
            }).catch(error => {
                $scope.loading = false;
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
            $scope.loading = true;
            $scope.remoteApp.getUserPermission($scope.onboardingUrl.url, answers).then(code => {
                answers[$scope.onboardingUrl.index] = code;
                $scope.loading = false;
                deferred.resolve(answers);
            }).catch(error => {
                $scope.loading = false;
                logError(error);
                $scope.$apply();
            });
        }

        return deferred.promise;
    }

    $scope.cancelOnboarding = function () {
        clearLog();
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

    $scope.selectPlatform = function (platform) {
        clearLog();
        $scope.invokeMethodName = undefined;
        $scope.invokeMethodParams = undefined;
        $scope.selectedPlatform = $scope.selectedPlatform !== platform ? platform : undefined;
    }

    $scope.getDeviceInfo = function (device) {
        clearLog();
        $scope.state.showOutput = true;
        logInfo(JSON.stringify(device.info, null, 2));
    }

    $scope.getDeviceProperty = function (device, property) {
        clearLog();
        $scope.state.showOutput = true;
        $scope.remoteApp.getProperty($scope.selectedHub.translatorPackageName, device.info, device.info.entities[0].di, property).then(info => {
            logInfo(JSON.stringify(info, null, 2));
            $scope.$apply();
        }).catch(error => {
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

    $scope.setTemperatureValue = function (device, property, value) {
        setDeviceProperty(device, property, { temperature: value, units: property.units }).then(info => {
            property.temperature = info.temperature;
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

    $scope.setModeValue = function (device, property, value) {
        setDeviceProperty(device, property, { modes: [value] }).then(info => {
            property.modes = info.modes;
            property.currentMode = property.modes[0];
        }).catch(error => {
            logError(error);
        });
    }

    $scope.invokeDeviceMethod = function (device, methodName, params) {
        clearLog();
        $scope.remoteApp.invokeDeviceMethod($scope.selectedHub.translatorPackageName, device.info, methodName, params).then(info => {
            logInfo(JSON.stringify(info, null, 2));
            $scope.remoteApp.getDeviceInfo($scope.selectedHub.translatorPackageName, device.info).then(deviceInfo => {
                device.info = deviceInfo;
                $scope.$apply();
            }).catch(error => {
                deferred.reject(error);
            });
        }).catch(error => {
            logError(error);
            $scope.$apply();
        });
    }

    function setDeviceProperty(device, property, payload) {
        clearLog();

        let deferred = $q.defer();

        $scope.remoteApp.setProperty($scope.selectedHub.translatorPackageName, device.info, device.info.entities[0].di, property.id, payload).then(info => {
            logInfo(JSON.stringify(info, null, 2));
            deferred.resolve(info);
        }).catch(error => {
            $scope.remoteApp.getDeviceInfo($scope.selectedHub.translatorPackageName, device.info).then(deviceInfo => {
                device.info = deviceInfo;
                $scope.$apply();
            }).catch(error => {
                logError(error);
                $scope.$apply();
            });
            deferred.reject(error);
        });

        return deferred.promise;
    }

    function getHubData() {
        let deferred = $q.defer();

        $scope.remoteApp.loadDevices($scope.selectedHub.translatorPackageName).then(info => {
            let platforms = [];
            for (var i = 0; i < info.platforms.length; i++) {
                let platform = info.platforms[i];

                //This is a workaround because angular doesn't handle binding to array elements well.
                for (let j = 0; j < platform.entities[0].resources.length; j++) {
                    let resource = platform.entities[0].resources[j];
                    if (resource.rt[0] === 'oic.r.mode') {
                        resource.currentMode = resource.modes[0];
                    }
                }

                platforms.push({ info: platform, metadata: getDeviceMetadata(platform) });
            }

            $scope.hubData[$scope.selectedHub.translatorPackageName] = platforms;
            $scope.loading = false;
            deferred.resolve(platforms);
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
