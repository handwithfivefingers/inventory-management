import JsBarcode from "jsbarcode";
import { useEffect, useRef } from "react";
export const BarCode = ({ code }: { code?: string }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (code) {
      JsBarcode(svgRef.current, code, {
        width: 2.2,
        fontSize: 16,
        height: 40,
        background: "transparent",
      });
    }
  }, [code]);
  return <svg ref={svgRef} />;
};
