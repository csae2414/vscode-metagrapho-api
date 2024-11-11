import * as vscode from 'vscode';
import axios from 'axios';

export async function getBearerToken(context: vscode.ExtensionContext, username: string, password: string) {
    var token = '';
    const config = vscode.workspace.getConfiguration('metagrapho-api');
    const authenticationEndpoint = config.get('authentication.endpoint') as string;
    const passwordKey = 'metagrapho-api.password';
    try {
        // Get bearer token
        const tokenResponse = await axios.post(
            authenticationEndpoint + '/protocol/openid-connect/token',
            new URLSearchParams({
                grant_type: 'password',
                username: username,
                password: password,
                client_id: 'processing-api-client',
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        token = tokenResponse.data.access_token;
    } catch (error: any) {
        vscode.window.showErrorMessage('Failed to get bearer token: ' + error.message);
        // delete the password from the secrets
        await context.secrets.delete(passwordKey);
        vscode.window.showInformationMessage('Password deleted from secrets.');
        return token;
    } finally {
        return token;
    }
}