# Introduction

Graphical reference application for Open Translators to Things. Allows developers to interact with translators during development, testing and debugging.

## Goals
1. A graphical way to run a translator locally for development, testing, debugging... or just to play around.

## Install Tools

Get your dev environment set up (PC or Mac):
* [Install Git](http://git-scm.com/downloads)
* [Install Node](https://nodejs.org/en/download/)

Install electron globally

```bash
$ npm install –g electron
```

Install dependencies

```bash
$ npm install
```

## Run a Translator Locally

You can run a translator locally with the reference application. 

1. Identify a translator you want to run, ie wink thermostat, and install it
```bash
npm install opent2t-translator-com-wink-thermostat
```
2. Launch the reference application
```bash
electron .
```

From here you can:
1. Onboard an installed hub.
2. Select a hub that has been onboarded.
3. Interact with the hub devices.
4. Get information about the state of the hub and devices.

## Code of Conduct
This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
