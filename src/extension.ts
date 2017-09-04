'use strict';

import * as vscode from 'vscode';

const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;
const readdirp = require('readdirp');
const es = require('event-stream');

let mvnInstall = { 
  register: 'extension.installPOM',
  verify: 'pom.xml',
  verifyErr: 'XML file must be named pom.xml',
  handler: {
    cmd: 'mvn install',
    cwd: true,
    successTrigger: 'BUILD SUCCESS',
    successMsg: 'Installed POM Successfully',
    failMsg: 'Failed to install POM'
  }
};

let mvnClassPath = {
  register: 'extension.updateClassPathMVN',
  verify: `.vscode${path.sep}launch.json`,
  verifyErr: 'File must be .vscode/launch.json',
  handler: (fp) => {
    findTargetClassesMVN(vscode.workspace.rootPath)
      .then(targets => findClassPathMVN(vscode.workspace.rootPath)
          .then(classpath => {
            let targetArray = [].concat(targets);
            let classpaths = [classpath].concat(targetArray);
            let sourcepaths = [];

            for (let i = 0; i < targetArray.length; i++) {
              sourcepaths.push(targetArray[i].replace('target/classes', 'src/main/java'))
              sourcepaths.push(targetArray[i].replace('target/classes', 'src/test/java'))
            }

            let jsonFile = (vscode.workspace.rootPath + '/.vscode/launch.json');
            var json = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

            if (json.configurations) {
              json.configurations[0]['classpath'] = classpaths;
              json.configurations[0]['sourcePath'] = sourcepaths;
              fs.writeFileSync(jsonFile, JSON.stringify(json, null, 2));
            } else {
              vscode.window.showErrorMessage('Error updating launch.json... Using V1 config type?');
            }
          })
          .catch(err => vscode.window.showErrorMessage('Error retrieving dependency classpath')))
      .catch(err => vscode.window.showErrorMessage('Error retrieving POM files'));
  }
};

let mods = [mvnInstall, mvnClassPath];

let findTargetClassesMVN = (rootDir) => {
  return new Promise((resolve, reject) => {
    readdirp({ root: rootDir, fileFilter: (f) => f.name === 'pom.xml' }, (err, processed) => {
      if (err) {
        reject(err);
      } else {
        let paths = [];
        for (let i = 0; i < processed.files.length; i++) {
          paths.push(processed.files[i].fullParentDir + '/target/classes/');
        }
        resolve(paths);
      }
    });
  });
}

let findClassPathMVN = (rootDir) => {
  return new Promise((resolve, reject) => {
    exec('mvn dependency:build-classpath', { cwd: vscode.workspace.rootPath }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        let lines = stdout.split('\n');
        let resolved = false;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].indexOf('Dependencies classpath:') >= 0 && lines[i + 1].trim().length > 0) {
            resolve(lines[i + 1]);
            resolved = true;
          }
        }
        if (!resolved) {
          reject('no classpath found');
        }
      }
    });
  })
}

export function activate(context: vscode.ExtensionContext) {
  for (let i = 0; i < mods.length; i++) {
    let mod = mods[i];
    context.subscriptions.push(vscode.commands.registerCommand(mod.register, (e) => {
      if (e && e.fsPath) {
        let filePath = e.fsPath;
        if (!filePath.endsWith(mod.verify)) {
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