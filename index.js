#!/usr/bin/env node

/**
 * Module dependencies.
 */

var program = require('commander');
var colors = require('colors');

program
    .version('1.0.0')
    .option('-r, --run', 'Run translator')
    .option('-v, --validate', 'Validate translator')
    .parse(process.argv);

console.log('***************************************************');
console.log('Open Translators to Things CLI:');
console.log('See http://www.opentranslatorstothings.org');
console.log('***************************************************');

if (program.run) {
    console.log(make_red('Validating lamp schema implementation: NOT IMPLEMENTED YET'));
} else if (program.validate) {
    console.log(make_red('Validating lamp schema implementation: NOT IMPLEMENTED YET'));
} else {
    program.outputHelp(make_red);
}

function make_red(txt) {
    //display the help text in red on the console
    return colors.red(txt);
}