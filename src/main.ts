import "./style.css";

const APP_NAME = "Sticker Sketchpad";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

const header = document.createElement("h1");
header.innerHTML = APP_NAME;
app.append(header);

const canvas = document.getElementById("canvas") as HTMLCanvasElement;

let isDrawing = false;
let strokes: { x: number; y: number; } [][] = [];
let currentStroke: {x: number; y: number; }[] = [];
let redoStack: { x: number; y: number; }[][] = [];

const ctx = canvas.getContext("2d");
app.append(canvas);

function addPointToStroke(event: MouseEvent) {
    const point = {x: event.offsetX, y: event.offsetY };
    currentStroke.push(point);
    dispatchDrawingChangedEvent();
}

function dispatchDrawingChangedEvent() {
    const drawingChangedEvent = new CustomEvent('drawing-changed');
    canvas.dispatchEvent(drawingChangedEvent);
}

function redrawCanvas(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.beginPath();
    strokes.forEach(stroke => {
        if (stroke.length > 0) {
            ctx.moveTo(stroke[0].x, stroke[0].y);

            stroke.forEach(point => {
                ctx.lineTo(point.x, point.y);
            });
        }
    });
    ctx.stroke();
}

if (ctx) {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 256, 256);

    canvas.addEventListener('mousedown', (event) => {
        isDrawing = true;
        currentStroke = [];
        strokes.push(currentStroke);
        redoStack = [];
        addPointToStroke(event);
    });

    canvas.addEventListener("mousemove", (event) => {
        if (isDrawing) {
            addPointToStroke(event);
        }
    });

    canvas.addEventListener("mouseup", () => {
        if (isDrawing) {
            isDrawing = false;
        }
    });

    canvas.addEventListener("mouseleave", () => {
        isDrawing = false;
    });

    canvas.addEventListener('drawing-changed', () => {
        redrawCanvas(ctx);
    });

    const clear = document.createElement("button");
    clear.innerHTML = "Clear Drawing";
    clear.addEventListener("click", () => {
        strokes = [];
        redoStack = [];
        dispatchDrawingChangedEvent();
    });
    app.append(clear);

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
    app.append(undo);

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
    app.appendChild(redo);
}