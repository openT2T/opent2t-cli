'use strict';
var inquirer = require('inquirer');
var q = require('q');
var helpers = require('../helpers');
var BaseController = require("./baseController");
var Opent2tHelper = require("../Opent2tHelper");
var opent2tHelper = new Opent2tHelper();

class DeviceController extends BaseController {
    constructor() {
        super();

        this.addOperation('Back', this.goBack);
        this.addOperation('Display info', DeviceController.showDeviceInfo);
        this.addOperation('List properties', DeviceController.listProperties);
        this.addOperation('Get property', DeviceController.getProperty);
        this.addOperation('Set property', DeviceController.setProperty);
        this.addOperation('Invoke method', DeviceController.invokeMethod);
    }

    getOperations(state) {
        return this.operations;
    }

    logState(state) {
        console.log("\nCurrent Hub: %s".state, state.currentHub.name);
        console.log("Current Device: %s\n".state, state.currentDevice.longName);
    }

    static logProperties(props, message) {
        if (props.length > 0) {
            console.log(message.header);
            for (var i = 0; i < props.length; i++) {
                console.log(props[i].name);
            }
        }
    }

    static showDeviceInfo(state) {
        let deviceInfo = state.currentHub.platforms.find(p => p.opent2t.controlId === state.currentDevice.id);
        helpers.logObject(deviceInfo);
        return q.fcall(() => state);
    }

    static listProperties(state) {
        DeviceController.logProperties(state.currentDevice.writableProperties, "Read/Write Properties");
        DeviceController.logProperties(state.currentDevice.readonlyProperties, "Read Only Properties");
        return q.fcall(() => state);
    }

    static getProperty(state) {
        let deferred = q.defer();

        let questions = [
            {
                type: 'rawlist',
                name: 'propName',
                message: 'Which property would you like?',
                choices: state.currentDevice.properties.map(p => p.name),
                paginated: true,
            }
        ];

        inquirer.prompt(questions).then(function (answers) {
            let prop = state.currentDevice.properties.find(p => p.name === answers.propName);
            let method = 'getDevices' + prop.name.charAt(0).toUpperCase() + prop.name.slice(1);
            opent2tHelper.OpenT2T.invokeMethodAsync(state.currentDevice.translator, "", method, [prop.deviceId]).then(info => {
                helpers.logObject(info);
                deferred.resolve(state);
            }).catch(error => {
                deferred.reject(error);
            });
        });

        return deferred.promise;
    }

    static setProperty(state) {
        let deferred = q.defer();

        let questions = [
            {
                type: 'rawlist',
                name: 'propName',
                message: 'Which property would you like to set?',
                choices: state.currentDevice.writableProperties.map(p => p.name),
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
            try {
                let parsedValue = JSON.parse(answers.value);
                opent2tHelper.OpenT2T.invokeMethodAsync(state.currentDevice.translator, "", method, [prop.deviceId, parsedValue]).then(info => {
                    helpers.logObject(info);
                    deferred.resolve(state);
                }).catch(error => {
                    deferred.reject(error);
                });
            } catch (error) {
                deferred.reject(error);
            }
        });

        return deferred.promise;
    }


    static invokeMethod(state) {
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
            try {
                let parsedParams = JSON.parse(answers.params);
                opent2tHelper.OpenT2T.invokeMethodAsync(state.currentDevice.translator, "", answers.methodName, parsedParams).then(info => {
                    helpers.logObject(info);
                    deferred.resolve(state);
                }).catch(error => {
                    deferred.reject(error);
                });
            } catch (error) {
                deferred.reject(error);
            }
        });

        return deferred.promise;
    }
}

module.exports = DeviceController;