import "./app.css";
import { mount } from "svelte";
import App from "./App.svelte";

const appRoot = document.getElementById("app");

if (!appRoot) {
    throw new Error(
        'Failed to initialize app: missing root element with id "app".',
    );
}

const app = mount(App, {
    target: appRoot,
});

export default app;
