import { useNavigation } from "@remix-run/react";
import { BaseProps } from "~/types/common";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { useEffect } from "react";
import Quagga from "quagga"; // ES6

export const AppLayout = ({ children }: BaseProps) => {
  const navigation = useNavigation();

  useEffect(() => {
    console.log("function navigationState");
    if (navigation.state === "loading") {
      (Quagga as any)?.stop();
    }
  }, [navigation]);

  console.log("navigation", navigation);
  return (
    <div className="w-full bg-slate-300 min-h-[100svh] flex flex-col">
      <div className="w-full">
        <Header />
      </div>
      <div className="flex flex-row flex-1">
        <div className="w-full max-w-60 bg-indigo-200 border-dashed border-2 h-full shrink-0 px-4 py-4">
          <Sidebar />
        </div>
        <div className="container-lg mx-auto  h-full w-full rounded-sm px-4">{children}</div>
      </div>
    </div>
  );
};
