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

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        // Set up the webview
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(this.context.extensionPath, 'media'))
            ]
        };

        // Load the initial content
        await this.updateWebview(document, webviewPanel);

        // Listen for changes to the document
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                this.updateWebview(document, webviewPanel);
            }
        });

        // Clean up
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
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
            regions
        };
    }

    private async createBlackBase64Image(width: number, height: number) {
        // Create a canvas element
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
    
        // Get the canvas context
        const ctx = canvas.getContext('2d');
    
        // Fill the canvas with black color
        if (ctx) {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, width, height);
        }
    
        // Convert the canvas to a base64 image
        const base64Image = canvas.toDataURL('image/png'); // Default is PNG format
    
        return base64Image;
    }

    private async getWebviewContent(webview: vscode.Webview, data: any) {
        const nonce = getNonce();

        const regionsData = JSON.stringify(data.regions);
        var imageUri_base64 = '';
        try {
            const imageUri = vscode.Uri.file(data.imagePath);
            const imageData = await vscode.workspace.fs.readFile(imageUri);
            const base64Image = Buffer.from(new Uint8Array(imageData)).toString('base64');
            imageUri_base64 = `data:image/jpeg;base64,${base64Image}`;
        } catch (error) {
            vscode.window.showErrorMessage('Failed to read the image file');
            // print generic image if image file is not found:
            // Example usage
            const base64Image = this.createBlackBase64Image(200, 100);
            imageUri_base64 = `data:image/jpeg;base64,${base64Image}`;
        }

        // HTML content with embedded script and styles
        return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy"
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PAGE-XML Viewer</title>
    <style nonce="${nonce}">
      body, html {
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
      #canvasContainer {
        position: relative;
        width: 100%;
        height: 100vh;
      }
      #imageCanvas {
        position: absolute;
        top: 0;
        left: 0;
      }
      #overlayCanvas {
        position: absolute;
        top: 0;
        left: 0;
      }
    </style>
  </head>
  <body>
    <div id="canvasContainer">
      <canvas id="imageCanvas"></canvas>
      <canvas id="overlayCanvas"></canvas>
    </div>
    <script nonce="${nonce}">
const imageUri = "${imageUri_base64}";
const regions = ${regionsData};

const imageCanvas = document.getElementById('imageCanvas');
const overlayCanvas = document.getElementById('overlayCanvas');
const container = document.getElementById('canvasContainer');

const image = new Image();
image.src = imageUri;

let scale = 1;
let panX = 0;
let panY = 0;
let isPanning = false;
let startX = 0;
let startY = 0;

function draw() {
const imgCtx = imageCanvas.getContext('2d');
const overlayCtx = overlayCanvas.getContext('2d');

imgCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

imgCtx.save();
overlayCtx.save();

imgCtx.translate(panX, panY);
imgCtx.scale(scale, scale);
overlayCtx.translate(panX, panY);
overlayCtx.scale(scale, scale);

imgCtx.drawImage(image, 0, 0);

overlayCtx.strokeStyle = 'red';
overlayCtx.lineWidth = 2 / scale;
const fontSize = 16 / scale;
overlayCtx.font = fontSize + "px Arial";
overlayCtx.fillStyle = 'rgba(255, 0, 0, 0.5)';

regions.forEach(region => {
    textLines = region.textLines;
    textLines.forEach(line => {
        const points = line.coords.split(' ').map(p => p.split(',').map(Number));
        overlayCtx.beginPath();
        points.forEach((point, index) => {
            if (index === 0) {
            overlayCtx.moveTo(point[0], point[1]);
            } else {
            overlayCtx.lineTo(point[0], point[1]);
            }
        });
        overlayCtx.closePath();
        overlayCtx.stroke();

        // Draw the text
        const centroid = points.reduce((acc, curr) => {
            return [acc[0] + curr[0], acc[1] + curr[1]];
        }, [0, 0]).map(v => v / points.length);

        overlayCtx.fillText(line.text, centroid[0], centroid[1]);
    });
});

imgCtx.restore();
overlayCtx.restore();
}

image.onload = function() {
imageCanvas.width = image.width;
imageCanvas.height = image.height;
overlayCanvas.width = image.width;
overlayCanvas.height = image.height;
container.style.width = '100%';
container.style.height = '100vh';

draw();
};

// Mouse wheel for zoom
container.addEventListener('wheel', function(e) {
e.preventDefault();
const zoomFactor = 1.1;
if (e.deltaY < 0) {
  scale *= zoomFactor;
} else {
  scale /= zoomFactor;
}
draw();
});

// Mouse drag for pan
container.addEventListener('mousedown', function(e) {
isPanning = true;
startX = e.clientX - panX;
startY = e.clientY - panY;
});

container.addEventListener('mousemove', function(e) {
if (isPanning) {
  panX = e.clientX - startX;
  panY = e.clientY - startY;
  draw();
}
});

container.addEventListener('mouseup', function() {
isPanning = false;
});

container.addEventListener('mouseleave', function() {
isPanning = false;
});
</script>
  </body>
  </html>
`;
    }


}