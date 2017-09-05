'use strict';

import * as vscode from 'vscode';

const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;
const readdirp = require('readdirp');
const es = require('event-stream');

const config = require('./items/config');
const maven = require('./items/maven');

let mods = [
  config.make,
  maven.createRootModule,
  maven.createSubmodule,
  maven.install,
  maven.updateClassPath
];

export function activate(context: vscode.ExtensionContext) {
  for (let i = 0; i < mods.length; i++) {
    let mod = mods[i];
    context.subscriptions.push(vscode.commands.registerCommand(mod.register, (e) => {
      if ((e && e.fsPath) || (mod.verify === undefined)) {
        let filePath = (e.fsPath || undefined);
        if (mod.verify !== undefined && !filePath.endsWith(mod.verify)) {
            vscode.window.showErrorMessage(mod.verifyErr);
        } else {
          let handler = mod.handler;
          if (typeof handler === 'function') {
            handler(filePath);
          } else {
            let opts = {};
            if (handler['cwd']) {
              opts['cwd'] = path.dirname(filePath);
            }
            exec(handler['cmd'], opts, (error, stdout, stderr) => {
              if (error) {
                vscode.window.showErrorMessage(handler['failmsg']);
              } else {
                if (stdout.indexOf(handler['successTrigger']) >= 0) {
                  vscode.window.showInformationMessage(handler['successMsg']);
                } else {
                  vscode.window.showErrorMessage(handler['failMsg']);
                }
              }
            });
          }
        }
      }
    }));
  }
}

export function deactivate() {
}