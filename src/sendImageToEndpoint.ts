import * as vscode from 'vscode';
import * as fs from 'fs';
import axios from 'axios';
import { getBearerToken } from './basic_auth';

export async function sendImageToEndpoint(context: vscode.ExtensionContext) {
    // Prompt the user to select a JPG image file
    const options: vscode.OpenDialogOptions = {
        canSelectMany: false,
        openLabel: 'Select JPG Image',
        filters: {
            'Image Files': ['jpg', 'jpeg'],
        },
    };

    const fileUri = await vscode.window.showOpenDialog(options);

    if (!fileUri || fileUri.length === 0) {
        vscode.window.showErrorMessage('No image file selected.');
        return;
    }

    const selectedFile = fileUri[0];

    // Read the image file and convert to base64
    let imageBase64;
    try {
        const imageBuffer = fs.readFileSync(selectedFile.fsPath);
        imageBase64 = imageBuffer.toString('base64');
    } catch (error) {
        vscode.window.showErrorMessage('Failed to read image file.');
        return;
    }
    const config = vscode.workspace.getConfiguration('metagrapho-api');
    const useAuthentification = config.get('use.authentication') as boolean;
    const url = config.get('url') as string;
    const modelId = config.get('modelId') as string;
    var token = '';

    // if use.authentification is true, then we need to get the username and password from the user
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

        if (!username || !password) {
            vscode.window.showErrorMessage('Username or password not set in configuration.');
            return;
        }

        token = await getBearerToken(context, username, password);
    }

    // Prepare the JSON payload
    const payload = {
        config: {
            textRecognition: {
                htrId: Number(modelId),
            },
        },
        image: {
            base64: imageBase64,
        },
    };

    try {
        // Send the image to the endpoint and get the jobid:
        const response = await axios.post(url + '/processes', payload, {
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        }).catch((error) => {
            vscode.window.showErrorMessage('Failed to send image: ' + error.message);
            throw error;
        });

        // get return code:
        if (response.status !== 200) {
            vscode.window.showErrorMessage('Failed to send image: ' + response.statusText);
            return;
        }
        vscode.window.showInformationMessage('Image sent successfully: jobid: ' + response.data.processId + ' status: ' + response.data.status);
        // store in lastprocessedJobID - field:
        const lastprocessedJobID = response.data.processId;
        const lastprocessedJobIDKey = 'metagrapho-api.lastprocessedjobid';
        try {
            await context.workspaceState.update(lastprocessedJobIDKey, lastprocessedJobID);
            const storedValue = context.workspaceState.get(lastprocessedJobIDKey);
            vscode.window.showInformationMessage('Jobid stored: ' + storedValue);
        } catch (error: any) {
            vscode.window.showErrorMessage('Failed to store jobid: ' + error.message);
            throw error;
        }
    }
    catch (error: any) {
        vscode.window.showErrorMessage('Failed to send image: ' + error.message);
    }
}