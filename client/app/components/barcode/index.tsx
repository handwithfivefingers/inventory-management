import JsBarcode from "jsbarcode";
import { useEffect, useRef } from "react";

export const BarCode = ({
  code,
  width = 2.2,
  height = 40,
  fontSize = 16,
  maxHeight,
}: {
  code?: string;
  width?: number;
  height?: number;
  fontSize?: number;
  /**
   * CSS cap for the rendered SVG (e.g. "12mm"). Bounds label height so a
   * printed page provably fits its sheet — mirrors the QZ device HTML cap.
   */
  maxHeight?: string | number;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!code || !svgRef.current) return;
    try {
      JsBarcode(svgRef.current, code, {
        width,
        fontSize,
        height,
        background: "transparent",
        margin: 0,
        displayValue: false, // parent renders the human-readable code line
      });
    } catch {
      /* invalid characters — parent still shows the raw code text */
    }
  }, [code, width, height, fontSize]);
  return (
    <svg
      ref={svgRef}
      style={{
        maxWidth: "100%",
        width: "auto",
        height: "auto",
        display: "block",
        margin: "0 auto",
        ...(maxHeight != null ? { maxHeight } : {}),
      }}
    />
  );
};
