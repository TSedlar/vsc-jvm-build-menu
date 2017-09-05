'use strict';

import * as vscode from 'vscode';

const fs = require('filendir');

module.exports = {
  make: {
    register: 'extension.configDebugFiles',
    verify: undefined,
    verifyErr: undefined,
    handler: (fp) => {
      let root = vscode.workspace.rootPath;
      let vsc = (root + '/.vscode/');
      fs.writeFileSync(vsc + 'launch.json', JSON.stringify(launchJSON, null, 2));
      fs.writeFileSync(vsc + 'tasks.json', JSON.stringify(tasksJSON, null, 2));
      fs.writeFileSync(vsc + 'settings.json', JSON.stringify(settingsJSON, null, 2));
      vscode.window.showInformationMessage('Wrote debug files successfully!');
    }
  }
};

const launchJSON = {
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Java",
      "type": "java",
      "request": "launch",
      "stopOnEntry": false,
      "preLaunchTask": "build",
      "jdkPath": "${env:JAVA_HOME}/bin",
      "cwd": "${fileDirname}",
      "startupClass": "${fileBasename}",
      "classpath": [],
      "sourcePath": [],
      "options": [],
      "args": []
    }
  ]
};

const tasksJSON = {
  "version": "2.0.0",
  "tasks": [
    {
      "taskName": "build",
      "type": "shell",
      "presentation": {
          "reveal": "silent",
          "panel": "shared"
      },
      "isBackground": false,
      "group": "build",
      "command": "mvn",
      "args": ["install"]
    }
  ]
};

const settingsJSON = {
  "java.externalDependencies": [
  ]
};