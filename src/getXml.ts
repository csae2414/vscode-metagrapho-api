import * as vscode from 'vscode';
import axios from 'axios';
import { getBearerToken } from './basic_auth';

export async function getXML(context: vscode.ExtensionContext) {
    console.log('Command "metagrapho-api.getXML" is now active!');
    try {
        // Retrieve the stored processId
        const lastprocessedJobIDKey = 'metagrapho-api.lastprocessedjobid';
        const processId = context.workspaceState.get<string>(lastprocessedJobIDKey);

        if (!processId) {
            vscode.window.showErrorMessage('No job ID found. Please run the image processing command first.');
            return;
        }

        const config = vscode.workspace.getConfiguration('metagrapho-api');
        const useAuthentification = config.get('use.authentication') as boolean;
        const url = config.get('url') as string;
        var accessToken = '';

        if (useAuthentification) {
            // Get username and password from configuration

            const username = config.get('username') as string;
            //const password = config.get('password') as string;

            const passwordKey = 'metagrapho-api.password';
            let password = await context.secrets.get(passwordKey);
            if (!password) {
                password = await vscode.window.showInputBox({
                    prompt: 'Enter your password',
                    password: true,
                });
                if (password) {
                    await context.secrets.store(passwordKey, password);
                } else {
                    vscode.window.showErrorMessage('Password is required.');
                    return;
                }
            }

            // Get a valid access token (implement authentication logic here)
            var accessToken = await getBearerToken(context, username, password);

            if (!accessToken) {
                vscode.window.showErrorMessage('Failed to obtain access token.');
                return;
            }
        }

        // Make the GET request to retrieve the XML file
        var request_url = url + `/processes/${processId}/page`;
        const response = await axios.get(request_url, {
            headers: {
                accept: 'application/xml',
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (response.status === 200) {
            const xmlContent = response.data;

            // Display the XML content in a new editor
            const doc = await vscode.workspace.openTextDocument({
                content: xmlContent,
                language: 'xml',
            });
            await vscode.window.showTextDocument(doc);

            vscode.window.showInformationMessage('XML file retrieved and displayed successfully!');
        } else {
            vscode.window.showErrorMessage(`Failed to retrieve XML file. Status code: ${response.status}`);
        }
    } catch (error: any) {
        vscode.window.showErrorMessage('An error occurred while retrieving the XML file: ' + error.message);
        console.error(error);
    }
}