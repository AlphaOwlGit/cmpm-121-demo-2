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

const hueSlider = document.getElementById('hueSlider') as HTMLInputElement;
let currentHue = 0;
if (hueSlider) {
    hueSlider.addEventListener('input', (event) => {
        currentHue = parseInt((event.target as HTMLInputElement).value, 10);
    })
}
const satSlider = document.getElementById('satSlider') as HTMLInputElement;
let currentSat = 100;
if (satSlider) {
    satSlider.addEventListener('input', (event) => {
        currentSat = parseInt((event.target as HTMLInputElement).value, 10);
    })
}
const lightSlider = document.getElementById('lightSlider') as HTMLInputElement;
let currentLight = 50;
if (lightSlider) {
    lightSlider.addEventListener('input', (event) => {
        currentLight = parseInt((event.target as HTMLInputElement).value, 10);
    })
}

let isDrawing = false;
let currentLineWidth = 1;
let strokes: Stroke[] = [];
let redoStack: Stroke[] = [];
let stickers: Sticker[] = [];
let currentStroke: Stroke | null = null;
let toolPreview: ToolPreview | null = null;
let currentSticker: Sticker | null = null;
let firstPenCheck = false;

const stickerData = [
    {symbol: "👻"},
    {symbol: "🎃"},
    {symbol: "💀"},
    {symbol: "🧟"},
    {symbol: "🧛"},
];

interface Stroke {
    points: {x: number; y: number; }[];
    lineWidth: number;
    color: string;
    draw(ctx: CanvasRenderingContext2D): void;
    drag(x: number, y: number): void;
}

interface ToolPreview {
    x: number;
    y: number;
    radius: number;
    draw(ctx: CanvasRenderingContext2D): void;
    move(x: number, y: number): void;
}

interface Sticker {
    x: number;
    y: number;
    symbol: string;
    isDragging: boolean;
    draw(ctx: CanvasRenderingContext2D): void;
    move(x: number, y: number): void;
    drag(x: number, y: number): void;
    startDrag(): void;
    stopDrag(): void;
    isCursorOverSticker(x: number, y: number): boolean;
}

function createStroke(initialX: number, initialY: number, lineWidth: number, hue: number, sat: number, light: number): Stroke {
    const points = [{ x: initialX, y: initialY }];
    const color = `hsl(${hue}, ${sat}%, ${light}%)`;
    return {
        points,
        lineWidth,
        color,
        draw(ctx: CanvasRenderingContext2D): void {
            ctx.lineWidth = this.lineWidth;
            ctx.strokeStyle = this.color;
            if (this.points.length > 0) {
              ctx.beginPath();
              ctx.moveTo(this.points[0].x, this.points[0].y);
              this.points.forEach(points => {
                  ctx.lineTo(points.x, points.y);
              });
              ctx.stroke();
            }
        },
        drag(x: number, y: number ) {
            this.points.push({ x , y });
        }
    };
}

function createToolPreview(radius: number): ToolPreview {
    const x = 0;
    const y = 0;
    return {
        x, y, radius,
        draw(ctx: CanvasRenderingContext2D) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();
        }, 
        move(x: number, y: number) {
            this.x = x;
            this.y = y;
        }
    };
}

function createSticker(symbol: string, initialX: number = 0, initialY: number = 0): Sticker {
    const x = initialX;
    const y = initialY;
    const isDragging = false;
    return {
        x, y, symbol, isDragging,
        drag(x: number, y: number) {
            if (this.isDragging) {
                this.x = x;
                this.y = y;
            }
        },
        move(x: number, y: number) {
            if (!this.isDragging) {
                this.x = x;
                this.y = y;
            }
        },
        draw(ctx: CanvasRenderingContext2D) {
            ctx.font = "20px sans-serif";
            ctx.fillText(this.symbol, this.x, this.y);
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
        },
        startDrag() {
            this.isDragging = true;
        },
        stopDrag() {
            this.isDragging = false;
        },
        isCursorOverSticker(x: number, y: number): boolean {
            const tolerance = 16;
            return Math.abs(this.x - x) < tolerance && Math.abs(this.y - y) < tolerance;
        }
    };
}

function updateToolPreview() {
    toolPreview = createToolPreview(currentLineWidth / 2);
    if (!isDrawing && ctx && toolPreview) {
        toolPreview.draw(ctx);
    }
}

function dispatchDrawingChangedEvent() {
    const drawingChangedEvent = new CustomEvent('drawing-changed');
    canvas.dispatchEvent(drawingChangedEvent);
}

function redrawCanvas(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    strokes.forEach(stroke => {
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
        let foundStickerToDrag = false;

        if (currentSticker) {
            currentSticker.startDrag();
            currentSticker.drag(event.offsetX, event.offsetY);
            stickers.push(currentSticker);
            currentSticker = null;
            foundStickerToDrag = true;
        } else {
            stickers.forEach(sticker => {
                if (sticker.isCursorOverSticker(event.offsetX, event.offsetY)) {
                    sticker.startDrag();
                    sticker.drag(event.offsetX, event.offsetY);
                    foundStickerToDrag = true;
                }
            });
        }
        if (!foundStickerToDrag) {
            isDrawing = true;
            currentStroke = createStroke(event.offsetX, event.offsetY, currentLineWidth, currentHue, currentSat, currentLight);
            strokes.push(currentStroke);
            redoStack = [];
            dispatchDrawingChangedEvent();
        }
    });

    canvas.addEventListener("mousemove", (event) => {
        if (isDrawing) {
            if (currentStroke) {
                currentStroke.drag(event.offsetX, event.offsetY);
                dispatchDrawingChangedEvent();
            }
        } else {
            if (toolPreview) {
                toolPreview.move(event.offsetX, event.offsetY);
            }
            if (currentSticker) {
                currentSticker.move(event.offsetX, event.offsetY);
            }
        }
        stickers.forEach(sticker => {
            if (sticker) {
                sticker.drag(event.offsetX, event.offsetY);
            }
        });
        canvas.dispatchEvent(new CustomEvent('tool-moved'));
    });

    canvas.addEventListener("mouseup", () => {
        if (isDrawing) {
            failDraw();
        }
        stickers.forEach(sticker => {
            sticker.stopDrag();
        });
    });

    canvas.addEventListener("mouseleave", () => {
        failDraw();
    });

    canvas.addEventListener('drawing-changed', () => {
        redrawCanvas(ctx);
    });

    canvas.addEventListener('tool-moved', () => {
        if (ctx) {
            if (toolPreview && !isDrawing) {
                redrawCanvas(ctx);
                toolPreview.draw(ctx);
            }
            redrawCanvas(ctx);
            stickers.forEach(sticker => sticker.draw(ctx));
            if (currentSticker) {
                currentSticker.draw(ctx);
            } else if (toolPreview) {
                toolPreview.draw(ctx);
            }
        }
    });
}

const clear = document.createElement("button");
clear.innerHTML = "Clear Drawing";
clear.addEventListener("click", () => {
    strokes = [];
    redoStack = [];
    stickers = [];
    dispatchDrawingChangedEvent();
});
buttonContainer.append(clear);

const undo = document.createElement("button");
undo.innerHTML = "Undo";
undo.addEventListener("click", () => {
    if (strokes.length > 0) {
        const lastStroke = strokes.pop();
        if (lastStroke) {
            redoStack.push(lastStroke);
            dispatchDrawingChangedEvent();
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
            strokes.push(stroke);
            dispatchDrawingChangedEvent();
        }
    }
});
buttonContainer.appendChild(redo);

function setToolButtonSelected(button: HTMLButtonElement) {
    document.querySelectorAll('.tool-button').forEach(btn => {
        btn.classList.remove('selectedTool');
    });
    button.classList.add('selectedTool');

    updateToolPreview();
    currentSticker = null;
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
      strokes.forEach(stroke => stroke.draw(tempctx));
      stickers.forEach(sticker => sticker.draw(tempctx));
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
        currentSticker = createSticker(symbol);
        canvas.dispatchEvent(new CustomEvent('tool-moved'));
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