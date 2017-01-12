'use strict';
const exitLabel = 'Exit';

class BaseController {
    constructor() {
        this.operations = [];
        this.addOperation('exit', exitLabel);
    }

    addOperation(name, title, operation) {
        this.operations.push({ title: title, operation: operation });
    }
}

module.exports = BaseController;