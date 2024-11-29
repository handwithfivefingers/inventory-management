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
  useEffect(() => {
    turnOn();
    return () => stopScan();
  }, []);

  useEffect(() => {
    if (start && isReady) {
      startScan();
    } else {
      pauseScan();
    }

    return () => {
      scanModule.current = null;
      storedScan.current = "";
    };
  }, [start, isReady]);

  useEffect(() => {
    if (start) {
      storedScan.current = "";
    }
  }, [start]);

  const startScan = () => {
    try {
      if (scanModule.current) {
        console.log("scanModule.current", scanModule.current);
        scanModule.current.start();
        scanModule.current?.onDetected((data: any) => {
          if (data?.codeResult?.code && !storedScan.current) {
            storedScan.current = data?.codeResult?.code;
            onScan?.(data?.codeResult?.code);
          }
        });
      }
    } catch (error) {
      console.log("startScan error", error);
    }
  };

  const stopScan = () => {
    try {
      scanModule.current?.offProcessed();
      scanModule.current?.offDetected();
      scanModule.current?.stop();
      divRef.current?.remove();
      console.log("stop");
    } catch (error) {
      console.log("function stopScan error", error);
    }
  };

  const pauseScan = () => {
    try {
      if (scanModule.current) {
        scanModule.current.pause();
      }
    } catch (error) {
      console.log("function stopScan error", error);
    }
  };

  const turnOn = async () => {
    try {
      const resp: boolean = await new Promise((resolve, reject) => {
        (Quagga as any).init(
          {
            inputStream: {
              name: "Live",
              type: "LiveStream",
              target: divRef.current,
              frequency: 1,
              numOfWorkers: 1,
            },
            decoder: {
              readers: ["code_128_reader"],
            },
          },
          (err: any) => {
            console.log("Error", err);
            if (err) {
              console.log("Initialization failed", err);
              reject(false);
            }
            console.log("Initialization finished. Ready to start");
            scanModule.current = Quagga as any;
            resolve(true);
          }
        );
      });
      setIsReady(resp);
      console.log("TURN ON resp", resp);
    } catch (error) {
      console.log("TURN ON error", error);
    }
  };
  return (
    <div>
      <div ref={divRef} className="hidden" />
      {children}
    </div>
  );
};
