import Quagga from "quagga"; // ES6
import { useEffect, useRef, useState } from "react";

export interface IBarcodeScanner {
  children: React.ReactNode;
  onScan?: (barcode: string) => void;
  start?: boolean;
}

export const BarcodeScanner = ({ children, onScan, start = false }: IBarcodeScanner) => {
  const divRef = useRef<HTMLDivElement>(null);
  const scanModule = useRef<any>(null);
  const [isReady, setIsReady] = useState<boolean>(false);
  const storedScan = useRef<string>("");
  const onScanRef = useRef(onScan);
  const startRef = useRef(start);
  const initStarted = useRef(false);

  onScanRef.current = onScan;
  startRef.current = start;

  const [initError, setInitError] = useState<string | null>(null);

  const handleDetected = (data: any) => {
    console.log("detected", data);
    if (data?.codeResult?.code && !storedScan.current) {
      storedScan.current = data.codeResult.code;
      onScanRef.current?.(data.codeResult.code);
    }
  };

  const stopScan = () => {
    try {
      scanModule.current?.offDetected();
      scanModule.current?.offProcessed();
      scanModule.current?.stop();
    } catch (error) {
      console.log("function stopScan error", error);
    } finally {
      scanModule.current = null;
    }
  };

  const turnOn = async (isCancelled: () => boolean) => {
    setInitError(null);
    try {
      const resp: boolean = await new Promise((resolve, reject) => {
        (Quagga as any).init(
          {
            inputStream: {
              name: "Live",
              type: "LiveStream",
              target: divRef.current,
              constraints: {
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
            },
            locate: true,
            locator: {
              patchSize: "large",
              halfSample: false,
            },
            // Workers break under Vite/Remix (worker script 404) and then
            // silently decode nothing. 0 = main thread, reliable.
            numOfWorkers: 0,
            frequency: 5,
            decoder: {
              readers: [
                "code_128_reader",
                "ean_reader",
                "ean_8_reader",
                "code_39_reader",
                "code_39_vin_reader",
                "codabar_reader",
                "upc_reader",
                "upc_e_reader",
                "i2of5_reader",
                "code_93_reader",
              ],
            },
          },
          (err: any) => {
            if (err) {
              const msg = err?.message || err?.name || "Camera initialization failed";
              console.log("Initialization failed", err);
              setInitError(String(msg));
              reject(false);
              return;
            }
            console.log("Initialization finished. Ready to start");
            resolve(true);
          },
        );
      });
      if (isCancelled()) return;
      scanModule.current = Quagga as any;
      scanModule.current?.offDetected();
      scanModule.current?.onDetected(handleDetected);
      setIsReady(resp);
      // Auto-start if requested while init was in-flight.
      if (resp && startRef.current) {
        try {
          scanModule.current?.start();
        } catch (error) {
          console.log("startScan error", error);
        }
      }
      console.log("TURN ON resp", resp);
    } catch (error) {
      console.log("TURN ON error", error);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    if (!initStarted.current) {
      initStarted.current = true;
      turnOn(isCancelled);
    }
    return () => {
      cancelled = true;
      stopScan();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isReady || !scanModule.current) return;
    if (start) {
      storedScan.current = "";
      try {
        scanModule.current.start();
      } catch (error) {
        console.log("startScan error", error);
      }
    } else {
      try {
        scanModule.current.pause();
      } catch (error) {
        console.log("pauseScan error", error);
      }
    }
  }, [start, isReady]);
  return children;
  return (
    <div className="flex flex-col">
      <div>
        <div>Preview</div>
        {initError && (
          <div className="text-xs text-red-500">
            Camera error: {initError} (needs HTTPS/localhost + permission; QR codes are not supported by Quagga)
          </div>
        )}
        <div
          ref={divRef}
          className="w-full max-w-md aspect-video overflow-hidden rounded bg-black [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_canvas]:hidden"
        />
      </div>
      {children}
    </div>
  );
};
