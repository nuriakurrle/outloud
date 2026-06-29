import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import { Navbar } from "./components/Navbar";
import Home from "./pages/Home";
import "./styles/chalkUi.css";

// Schwere Editor-Seiten (Poster, Mediapipe, Merch+three.js) erst bei Navigation laden.
const ChalkPosterGenerator = lazy(() => import("./components/ChalkPosterGenerator").then(m => ({ default: m.ChalkPosterGenerator })));
const Interactive = lazy(() => import("./pages/Interactive"));
const Merch = lazy(() => import("./pages/Merch"));

export default function App() {
  return (
    <BrowserRouter>
      <svg
        width="0"
        height="0"
        style={{ position: "absolute", pointerEvents: "none" }}
        aria-hidden="true"
      >
        <defs>
          <filter id="chalkRoughen" x="-20%" y="-40%" width="140%" height="180%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.02"
              numOctaves={2}
              seed={7}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={2.4}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Navbar />
        <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
          <Suspense fallback={<div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inria Sans', system-ui, sans-serif", color: "#000" }}>…</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/interactive" element={<Interactive />} />
              <Route path="/poster-maker" element={<ChalkPosterGenerator />} />
              <Route path="/merch" element={<Merch />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </BrowserRouter>
  );
}
