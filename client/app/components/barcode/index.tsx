import JsBarcode from "jsbarcode";
import { useEffect, useRef } from "react";
export const BarCode = ({ code }: { code: string }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (code) {
      JsBarcode(svgRef.current, code, {
        width: 1,
        fontSize: 12,
        height: 28,
        background: "transparent",
      });
    }
  }, [code]);
  return <svg ref={svgRef} />;
};
