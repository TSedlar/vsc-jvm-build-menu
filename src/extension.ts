'use strict';

import * as vscode from 'vscode';

const path = require('path');
const exec = require('child_process').exec;

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.commands.registerCommand('extension.installPOM', (e) => {
    if (e && e.fsPath) {
        let filePath = e.fsPath;
        if (!filePath.endsWith('pom.xml')) {
            vscode.window.showErrorMessage('XML file must be named pom.xml');
        } else {
          exec('mvn install', { cwd: path.dirname(filePath) }, (error, stdout, stderr) => {
            if (error) {
              vscode.window.showErrorMessage("Failed to install POM");
            } else {
              if (stdout.indexOf('BUILD SUCCESS') >= 0) {
                vscode.window.showInformationMessage("Installed POM");
              } else {
                vscode.window.showErrorMessage("Failed to install POM");
              }
            }
          });
        }
    }
  }));
}

export function deactivate() {
}