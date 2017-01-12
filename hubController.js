'use strict';
var inquirer = require('inquirer');
var q = require('q');
var OpenT2T = require('opent2t').OpenT2T;
var BaseController = require("./baseController");
var DeviceController = require("./deviceController");

class HubController extends BaseController {
    constructor() {
        super();
        this.addOperation('goBack', 'Back', this.goBack);
        this.addOperation('listDevices', 'List devices', this.listDevices);
        this.addOperation('selectDevice', 'Select device', this.selectDevice);
    }

    listDevices(state) {
        let deferred = q.defer();

        for (let i = 0; i < state.currentHub.devices.length; i++) {
            let item = state.currentHub.devices[i];
            console.log("%s %s", item.id, item.longName);
        }

        deferred.resolve(state);
        return deferred.promise;
    }

    selectDevice(state) {
        let deferred = q.defer();

        let questions = [
            {
                type: 'rawlist',
                name: 'device',
                message: 'Which device would you like?',
                choices: state.currentHub.devices.map(d => { return d.longName }),
                paginated: true,
            }
        ];

        inquirer.prompt(questions).then(function (answers) {
            let device = state.currentHub.devices.find(d => d.longName === answers.device);
            let deviceInfo = state.currentHub.platforms.find(p => p.opent2t.controlId === device.id);
            let dInfo = { 'deviceInfo': deviceInfo, 'hub': state.currentHub.translator };

            OpenT2T.createTranslatorAsync(device.translatorName, dInfo).then(translator => {
                device.translator = translator;
                device.properties = [];
                device.readonlyProperties = [];
                device.writableProperties = [];

                for (let entitiesIndex = 0; entitiesIndex < deviceInfo.entities.length; entitiesIndex++) {
                    for (let resourcesIndex = 0; resourcesIndex < deviceInfo.entities[entitiesIndex].resources.length; resourcesIndex++) {
                        let resource = deviceInfo.entities[entitiesIndex].resources[resourcesIndex];
                        let props = resource.if.indexOf('oic.if.a') === -1 ? device.readonlyProperties : device.writableProperties;
                        let prop = { name: resource.href.substring(1), deviceId: deviceInfo.entities[entitiesIndex].di };
                        props.push(prop);
                        device.properties.push(prop);
                    }
                }

                state.currentDevice = device;

                let deviceController = new DeviceController();
                state.controllerStack.unshift(deviceController);

                deferred.resolve(state);
            }).catch(error => {
                deferred.reject(error);
            });
        });

        return deferred.promise;
    }

    goBack(state) {
        let deferred = q.defer();

        state.currentHub = undefined;
        state.controllerStack.shift();

        deferred.resolve(state);
        return deferred.promise;
    }
}

module.exports = HubController;