import "./style.css";

const APP_NAME = "Santa's Spooky Sketchpad for Halloween 2024!!!";
const app = document.querySelector<HTMLDivElement>("#app")!;
const buttonContainer = document.querySelector<HTMLDivElement>("#button-container")!;

document.title = APP_NAME;

const header = document.createElement("h1");
header.innerHTML = APP_NAME;
app.append(header);

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");
app.append(canvas);

function initializeSlider(sliderId: string, valueUpdater: (value: number) => void, defaultValue: number) {
    const slider = document.getElementById(sliderId) as HTMLInputElement;
    if (slider) {
        slider.value = defaultValue.toString();
        slider.addEventListener('input', (event) => {
            valueUpdater(parseInt((event.target as HTMLInputElement).value, 10));
        });
    }
}

let currentHue = 0;
let currentSat = 100;
let currentLight = 50;

initializeSlider('hueSlider', (value) => currentHue = value, 0);
initializeSlider('satSlider', (value) => currentSat = value, 100);
initializeSlider('lightSlider', (value) => currentLight = value, 50);


let isDrawing = false;
let currentLineWidth = 1;
let displayList: DisplayCommand[] = [];
let redoStack: DisplayCommand[] = [];
let currentStroke: DisplayCommand | null = null;
let toolPreview: ToolPreview | null = null;
let firstPenCheck = false;

const stickerData = [
    { symbol: "👻" },
    { symbol: "🎃" },
    { symbol: "💀" },
    { symbol: "🧟" },
    { symbol: "🧛" },
];

let currentTool : "marker" | "sticker" = "marker";
let currentSymbol = "🎃";

interface DisplayCommand {
    draw(ctx: CanvasRenderingContext2D): void;
    drag(x: number, y: number): void;
}

interface ToolPreview {
    draw(ctx: CanvasRenderingContext2D): void;
}

(() => {
    const app = document.querySelector('#app');
  
    if (app) {
        const instructions = document.createElement('div');
        instructions.id = 'instructions';
        instructions.innerHTML = `
            <h2>How to Use</h2>
            <p>1. Click buttons below to select a tool or perform actions.</p>
            <p>2. Use the canvas to draw or interact with elements.</p>
            <p>3. Hover over icons for additional tips.</p>
        `;
  
        instructions.style.marginBottom = '1.5rem';
        instructions.style.padding = '1rem';
        instructions.style.border = '1px solid #646cff';
        instructions.style.borderRadius = '8px';
        instructions.style.backgroundColor = '#1a1a1a';
        instructions.style.color = '#fff';
        instructions.style.fontSize = '1.1rem';
        instructions.style.textAlign = 'left';
        instructions.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
  
        const isLightMode = globalThis.matchMedia('(prefers-color-scheme: light)').matches;
        if (isLightMode) {
            instructions.style.backgroundColor = '#f9f9f9';
            instructions.style.color = '#213547';
        }
  
        app.prepend(instructions);
    }
})();


function createStroke(initialX: number, initialY: number, lineWidth: number, hue: number, sat: number, light: number): DisplayCommand {
    const points = [{ x: initialX, y: initialY }];
    const color = `hsl(${hue}, ${sat}%, ${light}%)`;
    return {
        draw(ctx: CanvasRenderingContext2D): void {
            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = color;
            if (points.length > 0) {
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (const point of points) ctx.lineTo(point.x, point.y);
                ctx.stroke();
            }
        },
        drag(x: number, y: number) {
            points.push({ x, y });
        }
    };
}

function createSticker(symbol: string, initialX: number = 0, initialY: number = 0): DisplayCommand {
    let pos = { x: initialX, y: initialY };
    return {
        draw(ctx: CanvasRenderingContext2D) {
            ctx.font = "20px sans-serif";
            ctx.fillText(symbol, pos.x, pos.y);
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
        },
        drag(newX: number, newY: number) {
            pos = { x: newX, y: newY };
        },
    };
}

function createDisplayCommand(x: number, y: number) {
    switch (currentTool) {
        case "marker": return createStroke(x, y, currentLineWidth, currentHue, currentSat, currentLight);
        case "sticker": return createSticker(currentSymbol, x, y);
    }
}

function createToolPreview(x: number, y: number, radius: number): ToolPreview {
    return {
        draw(ctx: CanvasRenderingContext2D) {
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.stroke();
        },
    };
}



function notify(name: string) {
    canvas.dispatchEvent(new Event(name));
}

function redrawCanvas(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    displayList.forEach(stroke => {
        stroke.draw(ctx);
    });
}

function failDraw() {
    isDrawing = false;
    currentStroke = null;
}

if (ctx) {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 256, 256);

    canvas.addEventListener('mousedown', (event) => {
        isDrawing = true;
        currentStroke = createDisplayCommand(event.offsetX, event.offsetY);
        displayList.push(currentStroke);
        redoStack = [];
        notify("drawing-changed");
    });

    canvas.addEventListener("mousemove", (event) => {
        if (isDrawing) {
            if (currentStroke) {
                currentStroke.drag(event.offsetX, event.offsetY);
                notify("drawing-changed");
            }
        } else {
            toolPreview = createToolPreview(event.offsetX, event.offsetY, 5);
            notify("tool-moved");
        }
    });

    canvas.addEventListener("mouseup", () => {
        if (isDrawing) {
            failDraw();
        }
    });

    canvas.addEventListener("mouseleave", () => {
        failDraw();
    });

    canvas.addEventListener('drawing-changed', () => {
        redrawCanvas(ctx);
    });

    canvas.addEventListener('tool-moved', () => {
        if (ctx) {
            notify("drawing-changed");
            if (toolPreview) { toolPreview.draw(ctx); }
        }
    });
}

const clear = document.createElement("button");
clear.innerHTML = "Clear Drawing";
clear.addEventListener("click", () => {
    displayList = [];
    redoStack = [];
    notify("drawing-changed");
});
buttonContainer.append(clear);

const undo = document.createElement("button");
undo.innerHTML = "Undo";
undo.addEventListener("click", () => {
    if (displayList.length > 0) {
        const lastStroke = displayList.pop();
        if (lastStroke) {
            redoStack.push(lastStroke);
            notify("drawing-changed");
        }
    }
});
buttonContainer.append(undo);

const redo = document.createElement("button");
redo.innerHTML = "Redo";
redo.addEventListener("click", () => {
    if (redoStack.length > 0) {
        const stroke = redoStack.pop();
        if (stroke) {
            displayList.push(stroke);
            notify("drawing-changed");
        }
    }
});
buttonContainer.appendChild(redo);

function setToolButtonSelected(button: HTMLButtonElement) {
    document.querySelectorAll('.tool-button').forEach(btn => {
        btn.classList.remove('selectedTool');
    });
    button.classList.add('selectedTool');
}

function createSizeButton(size: number, name: string) {
    const pen = document.createElement("button");
    pen.innerHTML = name;
    pen.classList.add("tool-button");
    if (!firstPenCheck) {
        setToolButtonSelected(pen);
        firstPenCheck = true;
    }
    pen.addEventListener("click", () => {
        currentTool = "marker";
        currentLineWidth = size;
        setToolButtonSelected(pen);
    });
    buttonContainer.appendChild(pen);
}

createSizeButton(1, "1 pt");
createSizeButton(3, "3 pt");
createSizeButton(5, "5 pt");

function saveImage() {
    const tempCanvas = document.getElementById("canvas") as HTMLCanvasElement;
    const exportSize = 1024;
    tempCanvas.width = exportSize;
    tempCanvas.height = exportSize;
    const tempctx = tempCanvas.getContext("2d");
    const scaleSize = 4;
    if (tempctx) {
        tempctx.scale(scaleSize, scaleSize);
        tempctx.fillStyle = "white";
        tempctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        displayList.forEach(stroke => stroke.draw(tempctx));
    }
    const anchor = document.createElement("a");
    anchor.href = tempCanvas.toDataURL("image/png");
    anchor.download = "sketchpad.png";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.appendChild(anchor);

    canvas.width = exportSize / scaleSize;
    canvas.height = exportSize / scaleSize;

    tempCanvas.remove();
    app.append(canvas);
}

const exportPic = document.createElement("button");
exportPic.innerHTML = "Export to PNG";
exportPic.addEventListener("click", () => {
    saveImage();
});
buttonContainer.appendChild(exportPic);

function createStickerButton(symbol: string) {
    const button = document.createElement("button");
    button.innerHTML = symbol;
    button.classList.add("emoji-button");
    button.addEventListener("click", () => {
        currentTool = "sticker";
        currentSymbol = symbol;
        notify("tool-moved");
    });
    buttonContainer.appendChild(button);
}

function initStickerButtons() {
    stickerData.forEach(sticker => {
        createStickerButton(sticker.symbol);
    });
}

const createNewSticker = document.createElement("button");
createNewSticker.innerHTML = "Add New Sticker";
createNewSticker.classList.add("emoji-button");
createNewSticker.addEventListener("click", () => {
    const symbol = prompt("Enter the symbol for your new sticker:", "");
    if (symbol) {
        const newSticker = {
            symbol: "Custom"
        };
        stickerData.push(newSticker);
        createStickerButton(symbol);
    }
    canvas.dispatchEvent(new CustomEvent('tool-moved'));
});
buttonContainer.appendChild(createNewSticker);

initStickerButtons();
