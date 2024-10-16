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
    if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, 256, 256);
    }
}
app.append(canvas);