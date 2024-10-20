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
let currentLineWidth = 1;
let toolPreview: ToolPreview | null = null;

interface Drawable {
    display(ctx: CanvasRenderingContext2D): void;
}

class Stroke implements Drawable {
    private points: { x: number; y: number; }[] = [];
    private lineWidth: number;

    constructor( initialX: number, initialY: number, lineWidth: number) {
        this.points = [{ x: initialX, y: initialY }];
        this.lineWidth = lineWidth;
    }

    addPoint(x: number, y: number ) {
        this.points.push({ x , y });
    }

    display(ctx: CanvasRenderingContext2D): void {
      ctx.lineWidth = this.lineWidth;
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

class ToolPreview implements Drawable {
    private x: number;
    private y: number;
    private radius: number;

    constructor(radius: number) {
        this.x = 0;
        this.y = 0;
        this.radius = radius;
    }

    move(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function updateToolPreview() {
    toolPreview = new ToolPreview(currentLineWidth / 2);
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
        stroke.display(ctx);
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
        currentStroke = new Stroke(event.offsetX, event.offsetY, currentLineWidth);
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

    canvas.addEventListener("mousemove", (event) => {
        if (!isDrawing && toolPreview) {
            toolPreview.move(event.offsetX, event.offsetY);
            canvas.dispatchEvent(new CustomEvent('tool-moved'));
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
        if (ctx && toolPreview && !isDrawing) {
            redrawCanvas(ctx);
            toolPreview.draw(ctx);
        }
    });
}

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

function setToolButtonSelected(button: HTMLButtonElement) {
    document.querySelectorAll('.tool-button').forEach(btn => {
        btn.classList.remove('selectedTool');
    });
    button.classList.add('selectedTool');

    updateToolPreview();
}

const thin = document.createElement("button");
    thin.innerHTML = "Thin";
    thin.classList.add("tool-button");
    thin.addEventListener("click", () => {
        currentLineWidth = 1;
        setToolButtonSelected(thin);
    });
    app.appendChild(thin);

    const thick = document.createElement("button");
    thick.innerHTML = "Thick";
    thick.classList.add("tool-button");
    thick.addEventListener("click", () => {
        currentLineWidth = 5;
        setToolButtonSelected(thick);
    });
    app.appendChild(thick);

    setToolButtonSelected(thin);