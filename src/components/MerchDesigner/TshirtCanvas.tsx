import { forwardRef } from "react";
import frontImg from "../../../assets/merch/t-shirt_front.png";
import backImg from "../../../assets/merch/t-shirt_back.png";
import { PosterCanvas, type PosterCanvasHandle, type PosterCanvasProps } from "../ChalkPosterGenerator/PosterCanvas";
import { EMPTY_PATTERN } from "./constants";

export type { PosterCanvasHandle };

export type TshirtCanvasProps = Omit<PosterCanvasProps, "pattern" | "patternStrokes" | "bg" | "backdrop"> & {
  side: "front" | "back";
  shirtColor: "black" | "white";
};

export const TshirtCanvas = forwardRef<PosterCanvasHandle, TshirtCanvasProps>(
  function TshirtCanvas({ side, shirtColor, children, ...rest }, ref) {
    return (
      <PosterCanvas
        ref={ref}
        {...rest}
        bg={shirtColor === "white" ? "#f0f0f0" : "#111"}
        pattern={EMPTY_PATTERN}
        patternStrokes={[]}
        printZoneClip
        backdrop={
          <img
            src={side === "front" ? frontImg : backImg}
            style={{
              width: "100%", height: "100%", objectFit: "contain",
              filter: shirtColor === "white" ? "invert(1)" : undefined,
            }}
            alt=""
          />
        }
      >
        {/* Print-zone guide — sits in overlay above SVG strokes, below interactive elements */}
        <div style={{
          position: "absolute", left: "20%", top: "18%", width: "60%", height: "52%",
          border: "1px dashed rgba(255,255,255,0.3)", pointerEvents: "none", zIndex: 1,
        }} />
        {children}
      </PosterCanvas>
    );
  }
);

export const FRONT_IMG = frontImg;
export const BACK_IMG = backImg;
