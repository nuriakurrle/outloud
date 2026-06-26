import { createRoot } from "react-dom/client";
import "./styles/index.css";
import App from "./App.tsx";
import { LangProvider } from "./i18n";

createRoot(document.getElementById("root")!).render(<LangProvider><App /></LangProvider>);
