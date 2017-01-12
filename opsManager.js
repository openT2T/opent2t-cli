'use strict';
//var inquirer = require('inquirer');
//var helpers = require('./helpers');
//var q = require('q');

class OpsManager {
    constructor() {
        this.operations = {};
    }

    addOperation(name, title, operation) {
        this.operations[name] = { title: title, operation: operation };
    }

    getOperationByTitle(title) {
        for (var property in this.operations) {
            if (this.operations.hasOwnProperty(property) && this.operations[property].title === title) {
                return this.operations[property];
            }
        }

        return undefined;
    }
}

module.exports = OpsManager;