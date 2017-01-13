'use strict';
var q = require('q');

class BaseController {
    constructor() {
        this.operations = [this.createOperation('Exit')];
    }

    addOperation(name, operation) {
        this.operations.push(this.createOperation(name, operation));
    }

    createOperation(name, operation) {
        return { name: name, operation: operation };
    }

    getOperations(state) {
        return this.operations;
    }

    logState(state) {

    }

    goBack(state) {
        state.currentController = state.controllerStack.pop();
        return q.fcall(() => state);
    }
}

module.exports = BaseController;