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

Install the CLI module

```bash
$ npm install opent2t-cli
```

Or, to install globally

```bash
$ npm install -g opent2t-cli
```

## Run a Translator Locally

You can run a translator locally with the CLI. 

1. Identify a translator you want to run, ie wink thermostat, and install it
```bash
npm install opent2t-translator-com-wink-thermostat
```
2. First step is to do the onboarding. Wink communicates via the hub so you need to set that up first
```bash
node_modules/.bin/opent2t-cli -o opent2t-translator-com-wink-hub -h WinkHub
```

Or, if installed globally

```bash
opent2t-cli -o opent2t-translator-com-wink-hub -h WinkHub
```

You'll be prompted for some info:
```bash
? Type in your Wink username
? Type in your Wink password
? Ask for Client ID
? Ask for Client Secret
```

You should see the output of the CLI and it ends with the following:
```bash
Saving onboaringInfo to: ./WinkHub_onboardingInfo.json
Saved!
```
After this, your access token info has been saved so you should not have to do this step again.

3. Enumerate devices on the hub and find the device id you want to use (in this case the thermostat)
```bash
node_modules/.bin/opent2t-cli -h WinkHub
```

Or, if installed globally

```bash
opent2t-cli -h WinkHub
```

This will print out the devices that the hub sees and also creates json files so the cli can use this info later.

```bash
------ Saving device "152846" to: "opent2t-translator-com-wink-thermostat_device_152846.json"
------ Saving device "1985159" to: "opent2t-translator-com-wink-lightbulb_device_1985159.json"
```

4. Get the thermostat info
```bash
node_modules/.bin/opent2t-cli -h WinkHub -t opent2t-translator-com-wink-thermostat -i 152846 -g ThermostatResURI
```

Or, if installed globally

```bash
opent2t-cli -h WinkHub -t opent2t-translator-com-wink-thermostat -i 152846 -g ThermostatResURI
```

Let's break this call down:
* -h is the hub you're communicating through
* -t is the device type you want to talk to
* -i is the id of the specific device you want to talk to
* -g is the get RAML method call the cli makes

## Run the CLI in interactive mode

```bash
node_modules/.bin/opent2t-cli -m
```

Or, if installed globally

```bash
opent2t-cli -m
```

You can run the CLI in interactive mode for a more guided experience.  In interactive mode you will be given menu prompts to perform common tasks such as:
* Onboarding a hub
* Selecting hubs and devices
* Viewing device information
* Modifying device state.

## Run the graphical reference application

Launch the reference application

```bash
node_modules/.bin/opent2t-ui
```

Or, if installed globally

```bash
opent2t-ui
```

### From here you can:
1. Onboard an installed hub.
2. Select a hub that has been onboarded.
3. Interact with the hub devices.
4. Get information about the state of the hub and devices.


## Code of Conduct
This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
