'use strict';
var inquirer = require('inquirer');
var q = require('q');
var Opent2tHelper = require("../Opent2tHelper");
var opent2tHelper = new Opent2tHelper();
var BaseController = require("./baseController");
var DeviceController = require("./deviceController");

class HubController extends BaseController {
    constructor() {
        super();

        this.addOperation('Back', this.goBack);
        this.addOperation('List devices', HubController.listDevices);
        this.addOperation('Select device', HubController.selectDevice);
    }

    getOperations(state) {
        return this.operations;
    }

    logState(state) {
        console.log("\nCurrent Hub: %s\n".state, state.currentHub.name);
    }

    static listDevices(state) {
        for (let i = 0; i < state.currentHub.devices.length; i++) {
            let item = state.currentHub.devices[i];
            console.log("%s %s", item.id, item.longName);
        }

        return q.fcall(() => state);
    }

    static selectDevice(state) {
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

            opent2tHelper.opent2t.createTranslatorAsync(device.translatorName, dInfo).then(translator => {
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
                state.controllerStack.push(state.currentController);
                state.currentController = new DeviceController();
                deferred.resolve(state);
            }).catch(error => {
                deferred.reject(error);
            });
        });

        return deferred.promise;
    }
}

module.exports = HubController;