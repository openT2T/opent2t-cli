# Introduction

Command Line Interface (CLI) for Open Translators to Things. Allows developers to interact with translators during development, testing and debugging. See http://www.opentranslatorstothings.org. This README will help get you started developing in this repo.

> The CLI is a work in progress, and we appreciate any help we can get from the community to finish it per the goals listed below.

## Goals
1. Work well with the Yeoman starter for translators, http://www.github.com/openT2T/generator-opent2t
2. A way to run a translator locally for development, testing, debugging... or just to play around.
3. Simple validation test to make sure a translator is well formed before submission to the GitHub repository, e.g. all methods in the schema have been implemented correctly, all required files are present and have the right names/contents, etc. 
4. Extensible in the future to do many more advanced actions with community participation, e.g. deploy to device emulators, live-reload style development, etc. 

## Install Tools

Get your dev environment set up (PC or Mac):
* [Install Git](http://git-scm.com/downloads)
* [Install Node](https://nodejs.org/en/download/)
* Choose your favorite IDE, e.g. [Visual Studio Code](https://code.visualstudio.com/).

We recommend that you install the CLI globally.

```bash
$ npm install –g opent2t-cli
```

## Run a Translator Locally

You can run a translator locally with the CLI. 

1. identify a translator you want to run, wink thermostat, and install it
```bash
npm install opent2t-translator-com-wink-thermostat
```
2. start the cli, first step is to do the onboarding. Wink communicates via the hub so you need to set that up first
```bash
node index.js -o opent2t-translator-com-wink-hub
```

You'll be prompted for some info:
```bash
? Type in your Wink username
? Type in your Wink password
?  Ask for Client ID
?  Ask for Client Secret
```

You should see the output of the CLI and it ends with the following:
```bash
Saving onboaringInfo to: ./opent2t-translator-com-wink-hub_onboardingInfo.json
Saved!
```
After this, you're access token info has been saved so you should not have to do this step again.

3. Enumerate devices on the hub, find the thermostat id
```bash
node index.js -h opent2t-translator-com-wink-hub
```
This will print out the devices that the hub sees and also creates json files so the cli can use this info later.

4. Get the thermostat info
```bash
node index.js -h opent2t-translator-com-wink-hub -t opent2t-translator-com-wink-thermostat -i 152846 -p ThermostatResURI
```
Let's break this call down:
* -h is the hub you're communicating through
* -t is the device type you want to talk to
* -i is the id of the specific device you want to talk to
* -p is the RAML schema/method you want to call 

## Validate a Translator

We provide an easy way to run a quick validation of a translator. This does not perform an end to end test of your implementation, but will at least check to make sure all required files exist,
and all methods referenced in the schema are implemented with the correct signature, etc.

```
$ cd contosoBulb
$ opent2t-cli validate
***************************************************
Open Translators to Things CLI:
See http://www.opentranslatorstothings.org
***************************************************
Validating lamp schema implementation for contosoBulb
All good! No validation errors found.
```

## Code of Conduct
This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
