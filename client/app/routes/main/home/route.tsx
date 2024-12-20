import type { MetaFunction } from "@remix-run/node";
import { ErrorComponent } from "~/components/error-component";
import { useEffect, useRef } from "react";
import { BarChart, LineChart } from "chartist";
import "chartist/dist/index.css";
import "./styles.scss";
const chartOptions = {
  layout: { textColor: "black", background: { type: "solid", color: "white" } },
  waterMark: { visible: false },
};

export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};
let mount = false;
export default function Home() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartRef1 = useRef<HTMLDivElement>(null);
  const chartRef2 = useRef<HTMLDivElement>(null);
  const chartRef3 = useRef<HTMLDivElement>(null);
  const chartRef4 = useRef<HTMLDivElement>(null);
  const chartJS = useRef<any>(null);
  useEffect(() => {
    if (chartRef.current) {
      const data = {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        series: [
          [5, 4, 3, 7, 5, 10, 3],
          [3, 2, 9, 5, 4, 6, 4],
        ],
      };
      const configs = {
        axisX: {
          position: "start",
        },
        axisY: {
          position: "end",
        },
      };
      chartJS.current = new BarChart(chartRef.current, data, configs as any);
      new BarChart(chartRef1.current, data, configs  as any);
      new BarChart(chartRef2.current, data, configs  as any);
      new BarChart(chartRef3.current, data, configs  as any);
      new LineChart(chartRef4.current, data, configs  as any);
      console.log("chartJS.current", chartJS.current);
    }
  }, []);
  return (
    <div className="grid grid-cols-6 gap-4 p-4">
      <div className="col-span-6">Doanh thu</div>
      <div className="col-span-4">
        <div ref={chartRef4} className="h-[200px] w-full bg-white p-4 rounded-md shadow-md" />
      </div>
      <div className="col-span-2">
        <div ref={chartRef2} className="h-[200px] w-full bg-white p-4 rounded-md shadow-md" />
      </div>
      <div className="col-span-6">
        <div ref={chartRef} className="h-[200px] w-full bg-white p-4 rounded-md shadow-md" />
      </div>
      <div className="col-span-3">
        <div ref={chartRef3} className="h-[200px] w-full bg-white p-4 rounded-md shadow-md" />
      </div>
      <div className="col-span-3">
        <div ref={chartRef1} className="h-[200px] w-full bg-white p-4 rounded-md shadow-md" />
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}
