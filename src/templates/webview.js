const imageCanvas = document.getElementById('imageCanvas');
const overlayCanvas = document.getElementById('overlayCanvas');
const container = document.getElementById('canvasContainer');

let imageUri = '';
let regions = [];
let image = null; // Global variable to store the loaded image

let scale = 1;
let panX = 0;
let panY = 0;
let isPanning = false;
let startX = 0;
let startY = 0;

function updateImage(uri) {
    imageUri = uri;
    render();
}

function updateRegions(newRegions) {
    regions = newRegions;
    render();
}

window.addEventListener('message', (event) => {
    const { imageUri, regions } = event.data;

    if (imageUri) {
        updateImage(imageUri);
    }

    if (regions) {
        updateRegions(regions);
    }
});

function render() {
    image = new Image();
    image.src = imageUri;

    image.onload = () => {
        imageCanvas.width = image.width;
        imageCanvas.height = image.height;
        overlayCanvas.width = image.width;
        overlayCanvas.height = image.height;
        container.style.width = '100%';
        container.style.height = '100vh';

        draw(); // No need to pass image as it's now a global variable
    };
}

function draw() {
    if (!image || imageUri === '') {
        return;
    }

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

    // Draw regions if available
    if (regions.length > 0) {
        overlayCtx.strokeStyle = 'red';
        overlayCtx.lineWidth = 2 / scale;
        const fontSize = 16 / scale;
        overlayCtx.font = fontSize + "px Arial";
        overlayCtx.fillStyle = 'rgba(255, 0, 0, 0.5)';

        regions.forEach(region => {
            const textLines = region.textLines || [];
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
    }

    imgCtx.restore();
    overlayCtx.restore();
}

// Mouse wheel for zoom
container.addEventListener('wheel', function (e) {
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
container.addEventListener('mousedown', function (e) {
    isPanning = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
});

container.addEventListener('mousemove', function (e) {
    if (isPanning) {
        panX = e.clientX - startX;
        panY = e.clientY - startY;
        draw();
    }
});

container.addEventListener('mouseup', function () {
    isPanning = false;
});

container.addEventListener('mouseleave', function () {
    isPanning = false;
});
