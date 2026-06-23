import { BrowserRouter, Routes, Route } from "react-router";
import { ChalkPosterGenerator } from "./components/ChalkPosterGenerator";
import Interactive from "./pages/Interactive";
import "./styles/chalkUi.css";

export default function App() {
  return (
    <BrowserRouter>
      {/* Hand-gezeichneter „Kreide"-Rand für UI-Elemente (CSS: filter: url(#chalkRoughen)).
          feTurbulence + feDisplacementMap verwackeln Kanten & Text leicht → Skizzen-Look. */}
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

      <Routes>
        <Route path="/" element={<ChalkPosterGenerator />} />
        <Route path="/interactive" element={<Interactive />} />
      </Routes>
    </BrowserRouter>
  );
}
