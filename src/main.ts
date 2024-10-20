import "./style.css";

const APP_NAME = "Sticker Sketchpad";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

const header = document.createElement("h1");
header.innerHTML = APP_NAME;
app.append(header);

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");
app.append(canvas);

let isDrawing = false;
let strokes: Drawable[] = [];
let currentStroke: Stroke | null = null;
let redoStack: Drawable[] = [];

interface Drawable {
    display(ctx: CanvasRenderingContext2D): void;
}

class Stroke implements Drawable {
    private points: { x: number; y: number; }[] = [];
    
    constructor( initialX: number, initialY: number) {
        this.points = [{ x: initialX, y: initialY }];
    }

    addPoint(x: number, y: number ) {
        this.points.push({ x , y });
    }

    display(ctx: CanvasRenderingContext2D): void {
      if (this.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);

        this.points.forEach(points => {
            ctx.lineTo(points.x, points.y);
        });
        ctx.stroke();
      }
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
        stroke.display(ctx);
    });
}

if (ctx) {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 256, 256);

    canvas.addEventListener('mousedown', (event) => {
        isDrawing = true;
        currentStroke = new Stroke(event.offsetX, event.offsetY);
        strokes.push(currentStroke);
        redoStack = [];
        dispatchDrawingChangedEvent();
    });

    canvas.addEventListener("mousemove", (event) => {
        if (isDrawing && currentStroke) {
            currentStroke.addPoint(event.offsetX, event.offsetY);
            dispatchDrawingChangedEvent();
        }
    });

    canvas.addEventListener("mouseup", () => {
        if (isDrawing) {
            isDrawing = false;
            currentStroke = null;
        }
    });

    canvas.addEventListener("mouseleave", () => {
        isDrawing = false;
        currentStroke = null;
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