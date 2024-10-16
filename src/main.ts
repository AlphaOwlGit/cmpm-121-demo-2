import "./style.css";

const APP_NAME = "Sticker Sketchpad";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

const header = document.createElement("h1");
header.innerHTML = APP_NAME;
app.append(header);

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
if (canvas) {
    const ctx = canvas.getContext("2d");
    app.append(canvas);
    if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, 256, 256);

        let isDrawing = false;

        canvas.addEventListener('mousedown', (event) => {
            isDrawing = true;
            ctx.beginPath();
            ctx.moveTo(event.offsetX, event.offsetY);
        });

        canvas.addEventListener("mousemove", (event) => {
            if (isDrawing) {
                ctx.lineTo(event.offsetX, event.offsetY);
                ctx.stroke();
            }
        });

        canvas.addEventListener("mouseup", () => {
            isDrawing = false;
        });

        canvas.addEventListener("mouseleave", () => {
            isDrawing = false;
        });

        const clear = document.createElement("button");
        clear.innerHTML = "Clear Drawing";
        clear.addEventListener("click", () => {
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        });
        app.append(clear);
    }
}
