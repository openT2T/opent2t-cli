'use strict';
var inquirer = require('inquirer');
var q = require('q');
var helpers = require('./helpers');
var OpenT2T = require('opent2t').OpenT2T;
var colors = require('colors');
var BaseController = require("./baseController");

class DeviceController extends BaseController {
    constructor() {
        super();
        this.addOperation('goBack', 'Back', this.goBack);
        this.addOperation('showDeviceInfo', 'Display info', this.showDeviceInfo);
        this.addOperation('listProperties', 'List properties', this.listProperties);
        this.addOperation('getProperty', 'Get property', this.getProperty);
        this.addOperation('setProperty', 'Set property', this.setProperty);
        this.addOperation('invokeMethod', 'Invoke method', this.invokeMethod);
    }

    showDeviceInfo(state) {
        let deferred = q.defer();

        let deviceInfo = state.currentHub.platforms.find(p => p.opent2t.controlId === state.currentDevice.id);
        helpers.logObject(deviceInfo);

        deferred.resolve(state);
        return deferred.promise;
    }

    listProperties(state) {
        let deferred = q.defer();

        if (state.currentDevice.writableProperties.length > 0) {
            console.log(colors.cyan('Read/Write Properties'));
            for (var i = 0; i < state.currentDevice.writableProperties.length; i++) {
                console.log(state.currentDevice.writableProperties[i].name);
            }
        }

        if (state.currentDevice.readonlyProperties.length > 0) {
            console.log(colors.cyan('Read Only Properties'));
            for (var i = 0; i < state.currentDevice.readonlyProperties.length; i++) {
                console.log(state.currentDevice.readonlyProperties[i].name);
            }
        }

        deferred.resolve(state);
        return deferred.promise;
    }

    getProperty(state) {
        let deferred = q.defer();

        let questions = [
            {
                type: 'rawlist',
                name: 'propName',
                message: 'Which property would you like?',
                choices: state.currentDevice.properties.map(p => { return p.name }),
                paginated: true,
            }
        ];

        inquirer.prompt(questions).then(function (answers) {
            let prop = state.currentDevice.properties.find(p => p.name === answers.propName);
            let method = 'getDevices' + prop.name.charAt(0).toUpperCase() + prop.name.slice(1);
            OpenT2T.invokeMethodAsync(state.currentDevice.translator, "", method, [prop.deviceId]).then(info => {
                helpers.logObject(info);
                deferred.resolve(state);
            }).catch(error => {
                deferred.reject(error);
            });
        });

        return deferred.promise;
    }

    setProperty(state) {
        let deferred = q.defer();

        let questions = [
            {
                type: 'rawlist',
                name: 'propName',
                message: 'Which property would you like to set?',
                choices: state.currentDevice.writableProperties.map(p => { return p.name }),
                paginated: true,
            },
            {
                type: 'input',
                name: 'value',
                message: 'Enter stringified JSON value'
            },
        ];

        inquirer.prompt(questions).then(function (answers) {
            let prop = state.currentDevice.writableProperties.find(p => p.name === answers.propName);
            let method = 'postDevices' + prop.name.charAt(0).toUpperCase() + prop.name.slice(1);
            let parsedValue = JSON.parse(answers.value);
            OpenT2T.invokeMethodAsync(state.currentDevice.translator, "", method, [prop.deviceId, parsedValue]).then(info => {
                helpers.logObject(info);
                deferred.resolve(state);
            }).catch(error => {
                deferred.reject(error);
            });
        });

        return deferred.promise;
    }


    invokeMethod(state) {
        let deferred = q.defer();

        let questions = [
            {
                type: 'input',
                name: 'methodName',
                message: 'Enter the method name'
            },
            {
                type: 'input',
                name: 'params',
                message: 'Enter stringified JSON params array'
            },
        ];

        inquirer.prompt(questions).then(function (answers) {
            let parsedParams = JSON.parse(answers.params);
            OpenT2T.invokeMethodAsync(state.currentDevice.translator, "", answers.methodName, parsedParams).then(info => {
                helpers.logObject(info);
                deferred.resolve(state);
            }).catch(error => {
                deferred.reject(error);
            });
        });

        return deferred.promise;
    }

    goBack(state) {
        let deferred = q.defer();

        state.currentDevice = undefined;
        state.controllerStack.shift();

        deferred.resolve(state);
        return deferred.promise;
    }
}

module.exports = DeviceController;