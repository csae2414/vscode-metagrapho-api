// src/pageXmlEditorProvider.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as xml2js from 'xml2js';
import { getNonce } from './getNonce';

export class PageXmlEditorProvider implements vscode.CustomTextEditorProvider {

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new PageXmlEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(
            PageXmlEditorProvider.viewType,
            provider
        );
        return providerRegistration;
    }

    private static readonly viewType = 'metagrapho.pageXmlViewer';

    constructor(private readonly context: vscode.ExtensionContext) { }

    private async createBlackBase64Image(width: number, height: number): Promise<string> {
        // Create a canvas element
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <rect width="100%" height="100%" fill="black" />
    </svg>`;
        const base64SVG = Buffer.from(svg).toString('base64');
        return `data:image/svg+xml;base64,${base64SVG}`;
    }

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        // Set up the webview
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, 'src/templates'))],
        };

        // Generate HTML content
        const htmlContent = await this.getWebviewContent(webviewPanel.webview, {});
        webviewPanel.webview.html = htmlContent;

        // Parse XML and prepare data
        const xmlContent = document.getText();
        const parsedData = await this.parsePageXml(xmlContent, document);
        const width = parsedData.width || 100;
        const height = parsedData.height || 100;

        // Prepare Base64 image URI
        let imageUri_base64 = '';
        try {
            const imageUri = vscode.Uri.file(parsedData.imagePath);
            const imageData = await vscode.workspace.fs.readFile(imageUri);
            const base64Image = Buffer.from(new Uint8Array(imageData)).toString('base64');
            imageUri_base64 = `data:image/jpeg;base64,${base64Image}`;
        } catch (error) {
            vscode.window.showErrorMessage('Failed to read the image file');
            // Fallback to a generic black image if file not found
            imageUri_base64 = await this.createBlackBase64Image(width, height);
        }

        // Send dynamic data to the webview
        webviewPanel.webview.postMessage({
            imageUri: imageUri_base64,
            regions: parsedData.regions || [],
        });
    }

    private async updateWebview(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel) {
        // Parse the XML and generate the HTML content
        const xmlContent = document.getText();
        const parsedData = await this.parsePageXml(xmlContent, document);
        const webviewHtml = await this.getWebviewContent(webviewPanel.webview, parsedData);

        webviewPanel.webview.html = webviewHtml;
    }

    private async parsePageXml(xmlContent: string, document: vscode.TextDocument): Promise<any> {
        const parser = new xml2js.Parser();
        var result;
        try {
            result = await parser.parseStringPromise(xmlContent);
        } catch (error) {
            vscode.window.showErrorMessage('Failed to parse the XML content');
            return;
        }

        // Extract the image filename and path
        const page = result.PcGts.Page[0];
        const imageFilename = page.$.imageFilename;
        const width = page.$.imageWidth;
        const height = page.$.imageHeight;
        var imagePath = path.resolve(path.dirname(document.uri.fsPath), '..', imageFilename);
        if (!fs.existsSync(imagePath)) {
            vscode.window.showErrorMessage(`Image file in page.xml not found: ${imageFilename}. Falling back to parent directory`);
            // if image is not found, take the XML file path as the image path, use parent dir and look for image files with same name [jpg, JPEG, png, PNG, tif, TIF]:
            const imageExt = ['jpg', 'jpeg', 'png', 'tif'];
            const parentDir = path.resolve(path.dirname(document.uri.fsPath), '..');
            const xml_base_name = path.basename(document.uri.fsPath, path.extname(document.uri.fsPath));
            const files = fs.readdirSync(parentDir);
            imagePath = files.find(file => imageExt.includes(file.split('.').pop() || '') && file.includes(xml_base_name)) || '';
            if (imagePath === '') {
                vscode.window.showErrorMessage(`Image file not found in the parent directory: ${parentDir}`);
            } else {
                imagePath = path.resolve(parentDir, imagePath);
            }
        }

        // Extract text regions
        const textRegions = page.TextRegion || [];
        const regions = textRegions.map((region: any) => {
            const coordsPoints = region.Coords[0].$.points;
            const textLines = region.TextLine || [];
            const textEquiv = region.TextEquiv ? region.TextEquiv[0].Unicode[0] : '';
            return {
                coords: coordsPoints,
                textLines: textLines.map((line: any) => {
                    const lineCoords = line.Coords[0].$.points;
                    const baseline = line.Baseline ? line.Baseline[0].$.points : '';
                    const lineText = line.TextEquiv ? line.TextEquiv[0].Unicode[0] : '';
                    return {
                        coords: lineCoords,
                        baseline: baseline,
                        text: lineText
                    };
                }),
                text: textEquiv
            };
        });

        return {
            imagePath,
            regions,
            width,
            height
        };
    }

    private async getWebviewContent(webview: vscode.Webview, data: any): Promise<string> {
        const nonce = getNonce();

        // Generate script URI for the webview
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, 'src/templates', 'webview.js'))
        );

        // Load the HTML template
        const templatePath = path.join(this.context.extensionPath, 'src/templates', 'webview.html');
        let htmlContent = fs.readFileSync(templatePath, 'utf-8');

        // Replace placeholders in the HTML template
        htmlContent = htmlContent
            .replace(/{{nonce}}/g, nonce) // Insert the nonce
            .replace('{{scriptUri}}', scriptUri.toString()); // Insert the script URI
        return htmlContent;
    }
}