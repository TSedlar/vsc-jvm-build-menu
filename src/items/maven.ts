'use strict';

import * as vscode from 'vscode';

const fs = require('filendir');
const readFileSync = require('fs').readFileSync;
const path = require('path');
const exec = require('child_process').exec;
const readdirp = require('readdirp');
const converter = require('xml-js');

module.exports = {
  createRootModule: {
    register: 'extension.createRootModuleMVN',
    verify: undefined,
    verifyErr: undefined,
    handler: (fp) => {
      let root = vscode.workspace.rootPath;
      createPOM(root, true);
    }
  },
  createSubmodule: {
    register: 'extension.createSubmoduleMVN',
    verify: undefined,
    verifyErr: undefined,
    handler: (fp) => {
      let root = vscode.workspace.rootPath;
      createPOM(root, false);
    }
  },
  install: { 
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
  },
  updateClassPath: {
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
              var json = JSON.parse(readFileSync(jsonFile, 'utf8'));
  
              if (json.configurations) {
                json.configurations[0]['classpath'] = classpaths;
                json.configurations[0]['sourcePath'] = sourcepaths;
                fs.writeFileSync(jsonFile, JSON.stringify(json, null, 2));
                vscode.window.showInformationMessage('Updated classpath');
              } else {
                vscode.window.showErrorMessage('Error updating launch.json... Using V1 config type?');
              }
            })
            .catch(err => vscode.window.showErrorMessage('Error retrieving dependency classpath')))
        .catch(err => vscode.window.showErrorMessage('Error retrieving POM files'));
    }
  }
};

let createPOM = (rootDir, isRoot) => {
  vscode.window.showInputBox({ prompt: 'Group ID:'})
    .then(groupId => {
      vscode.window.showInputBox({ prompt: 'Artifact ID:' })
        .then(projId => {
          if (groupId === undefined || projId === undefined) {
            vscode.window.showErrorMessage("groupId and artifactId must be valid");
          } else {
            let parent = null;

            if (!isRoot) {
              parent = converter.xml2js(
                readFileSync(`${rootDir}/pom.xml`, 'utf8'), { compact: true }
              );
            }

            let xml = converter.xml2js(POM_BASE, { compact: true });

            xml.project['groupId'] = { _text: groupId };
            xml.project['artifactId'] = { _text: projId };
            xml.project['version'] = { _text: '1.0-SNAPSHOT' };
            xml.project['packaging'] = { _text: (isRoot ? 'pom' : 'jar') };

            if (parent !== null) {
              xml.project.parent = {
                groupId: parent.project['groupId'],
                artifactId: parent.project['artifactId'],
                version: parent.project['version']
              };

              if (!parent.project.hasOwnProperty('modules')) {
                parent.project['modules'] = { module: [] };
              }

              parent.project['modules']['module'].push({ _text: projId });

              fs.writeFileSync(`${rootDir}/pom.xml`, converter.js2xml(
                parent, { compact: true, spaces: 2 }
              ))
            }

            let parentDir = (isRoot ? rootDir : `${rootDir}/${projId}`);

            fs.writeFileSync(`${parentDir}/pom.xml`, converter.js2xml(
              xml, { compact: true, spaces: 2 }
            ));

            if (!isRoot) {
              fs.mkdirp(rootDir + `/${projId}/src/main/java/`);
              fs.mkdirp(rootDir + `/${projId}/src/test/java/`);
            }

            vscode.window.showInformationMessage('Created module successfully');
          }
        });
    });
}

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
    exec('mvn dependency:build-classpath', { cwd: rootDir }, (error, stdout, stderr) => {
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

const POM_BASE = `<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <properties>
    <maven.compiler.source>1.8</maven.compiler.source>
    <maven.compiler.target>1.8</maven.compiler.target>
  </properties>
</project>`