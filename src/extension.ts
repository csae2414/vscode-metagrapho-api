// src/extension.ts
import * as vscode from 'vscode';
import { sendImageToEndpoint } from './sendImageToEndpoint';
import { getXML } from './getXml';

export function activate(context: vscode.ExtensionContext) {

  let disposableSendImageToEndpoint = vscode.commands.registerCommand('metagrapho-api.sendImageToEndpoint', async () => {
    console.log('Extension "metagrapho-api send-image" is now active!');
    sendImageToEndpoint(context);
  });
  context.subscriptions.push(disposableSendImageToEndpoint);

  let disposableGetXML = vscode.commands.registerCommand('metagrapho-api.getXML', async () => {
    console.log('Extension "metagrapho-api get-xml" is now active!');
    getXML(context);
  });
  context.subscriptions.push(disposableGetXML);
}

export function deactivate() { }
