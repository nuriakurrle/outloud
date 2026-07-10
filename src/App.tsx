import { HashRouter as BrowserRouter, Routes, Route } from "react-router";
import { Navbar } from "./components/Navbar";
import { ChalkPosterGenerator } from "./components/ChalkPosterGenerator";
import Interactive from "./pages/Interactive";
import Home from "./pages/Home";
import Merch from "./pages/Merch";
import "./styles/chalkUi.css";

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
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/interactive" element={<Interactive />} />
            <Route path="/poster-maker" element={<ChalkPosterGenerator />} />
            <Route path="/merch" element={<Merch />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
