"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
// src/extension.ts
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const axios_1 = __importDefault(require("axios"));
function activate(context) {
    let disposable = vscode.commands.registerCommand('extension.sendImageToEndpoint', async () => {
        // Get the current open file
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor.');
            return;
        }
        const document = editor.document;
        const fileName = document.fileName;
        if (!fileName.toLowerCase().endsWith('.jpg') && !fileName.toLowerCase().endsWith('.jpeg')) {
            vscode.window.showErrorMessage('The current file is not a JPG image.');
            return;
        }
        // Read the image file and convert to base64
        let imageBase64;
        try {
            const imageBuffer = fs.readFileSync(fileName);
            imageBase64 = imageBuffer.toString('base64');
        }
        catch (error) {
            vscode.window.showErrorMessage('Failed to read image file.');
            return;
        }
        // Get username and password from configuration
        const config = vscode.workspace.getConfiguration('extension');
        const username = config.get('username');
        const password = config.get('password');
        if (!username || !password) {
            vscode.window.showErrorMessage('Username or password not set in configuration.');
            return;
        }
        try {
            // Get bearer token
            const tokenResponse = await axios_1.default.post('https://account.readcoop.eu/auth/realms/readcoop/protocol/openid-connect/token', new URLSearchParams({
                grant_type: 'password',
                username: username,
                password: password,
                client_id: 'processing-api-client',
            }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            const token = tokenResponse.data.access_token;
            // Prepare the JSON payload
            const payload = {
                config: {
                    textRecognition: {
                        htrId: 38230,
                    },
                },
                content: {
                    regions: [
                        {
                            id: 'region_1',
                            coords: {
                                points: '0,0 282,0 280,109 0,108',
                            },
                            lines: [
                                {
                                    id: 'line_1',
                                    coords: {
                                        points: '6,19 276,20 276,70 6,69',
                                    },
                                    baseline: {
                                        points: '6,64 276,65',
                                    },
                                },
                            ],
                        },
                    ],
                },
                image: {
                    base64: imageBase64,
                },
            };
            // Send the image to the endpoint
            await axios_1.default.post('https://transkribus.eu/processing/v1/processes', payload, {
                headers: {
                    accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            vscode.window.showInformationMessage('Image sent successfully!');
        }
        catch (error) {
            vscode.window.showErrorMessage('Failed to send image: ' + error.message);
        }
    });
    context.subscriptions.push(disposable);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map