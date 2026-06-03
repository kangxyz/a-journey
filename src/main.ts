import { App } from "./app/App";

import "./style.css";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Missing #app root element.");
}

const app = new App(root);
app.start();
