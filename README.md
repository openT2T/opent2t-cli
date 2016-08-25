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

## Get the Source

Next, clone this repo to your local machine to get started. Navigate to the directory where you want to clone the repo
to locally, then run:

```bash
git clone https://github.com/openT2T/opent2t-cli.git
```

## Create a New Translator, Schema or Onboarding Module

> The generator-opent2t yeoman starter should be used to create new translators, schemas or onboarding modules.

## Run a Translator Locally

You can run a translator locally with the CLI. This includes translators implemented by others, whose git repos you sync locally, or your own translators as you develop them.

```
$ cd contosoBulb/js
$ opent2t-cli run 
***************************************************
Open Translators to Things CLI:
See http://www.opentranslatorstothings.org
***************************************************
Running lamp schema implementation for contosoBulb.
```

The user is prompted for some information, e.g. the credentials to access the device, the device ID, etc. This information is part of the "onboarding" or initial setup/pairing of the device which is done by whatever runtime the translator runs in. The user can also opt to save this information locally in a file called deviceSetup.json. If this file exists already, then the CLI reads setup information from it rather than prompting the user. The deviceSetup.json file is added to the local .gitignore as well, since it contains device setup information which is unique to each specific device/user and should not be checked into source control.

> Note: The prompts for access token etc below are generated via the node onboarding module for the Thing. 

```
The following setup information is required by contosoBulb:
Access Token? XYZABC
Refresh Token? XYZ123
Would you like to save this information locally, so you don't have to enter it again? Y
local file deviceSetup.json created, and added to .gitignore.
All done, now running contosoBulb. Methods avaible are:
1. OnOff(state)
2. Dim(luminosity)
enter ctrl-c to exit.
contosoBulb $>
```

After the user specifies all the setup information required by the translator, it starts running locally. The user is presented with a 
[REPL](https://nodejs.org/api/repl.html) where they can call all the methods declared in the translator schema. This is useful during development, where you want to test out your script, e.g.:

```
contosoBulb $> OnOff(true)
```

If all is well, the REPL above will execute the provided valid node.js statement and call the OnOff method with the argument true.
This will perhaps turn the bulb on, if that's what the schema intends and what the deviceTranslator.js implements.

## Debugging

> We need community participation to complete this section and write debugging tools / emulators especially tailored for common devices.

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

## Create a Pull Request
Made any changes we should consider? Send us a pull request! Check out [this article](https://help.github.com/articles/creating-a-pull-request/)
on how to get started.

## Code of Conduct
This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
