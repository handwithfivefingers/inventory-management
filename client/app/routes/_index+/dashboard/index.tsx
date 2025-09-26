import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { BarChart, LineChart } from "chartist";
import "chartist/dist/index.css";
import { useEffect, useRef } from "react";
import { orderService } from "~/action.server/order.service";
import { ErrorComponent } from "~/components/error-component";
import { dayjs } from "~/libs/date";
import { parseCookieFromRequest } from "~/sessions";
import "./styles.scss";
// const chartOptions = {
//   layout: { textColor: "black", background: { type: "solid", color: "white" } },
//   waterMark: { visible: false },
// };
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { cookie, warehouseId } = await parseCookieFromRequest(request);
  const resp = await orderService.getOrders({ page: "1", pageSize: "10", cookie, warehouseId });
  return {
    ...resp,
    page: "1",
    pageSize: "10",
  };
};
export const meta: MetaFunction = () => {
  return [{ title: "Trang chủ" }];
};
export default function Home() {
  const { data } = useLoaderData<typeof loader>();
  console.log("data", data);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartRef1 = useRef<HTMLDivElement>(null);
  const chartRef2 = useRef<HTMLDivElement>(null);
  const chartRef3 = useRef<HTMLDivElement>(null);
  const chartRef4 = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chartRef.current) {
      const lastSevenDay = getCurrentWeek();
      const orderCurrentWeek = new Map();
      for (const day of lastSevenDay) {
        orderCurrentWeek.set(day, 0);
      }
      if (!data?.length) return;
      for (let i = 0; i < data.length; i++) {
        const orderDate = dayjs(data[i].updatedAt).format("MM/DD");
        const paid = data[i].paid;
        if (orderCurrentWeek.has(orderDate)) {
          orderCurrentWeek.set(orderDate, (orderCurrentWeek.get(orderDate) || 0) + paid);
        }
      }
      console.log("orderCurrentWeek", orderCurrentWeek);
      const chartData = {
        labels: lastSevenDay,
        series: [[...orderCurrentWeek.values()]],
      };
      const configs = {
        axisX: {
          position: "start",
        },
        axisY: {
          position: "end",
        },
        plugins: [hoverTooltips({ prefix: "Đơn hàng: ", suffix: " $" })],
      };
      // chartJS.current = new BarChart(chartRef.current, chartData, configs as any);
      new BarChart(chartRef1.current, chartData, configs as any);
      new BarChart(chartRef2.current, chartData, configs as any);
      new BarChart(chartRef3.current, chartData, configs as any);
      new LineChart(chartRef4.current, chartData, configs as any);
    }
  }, []);

  const hoverTooltips = (options: any) => {
    return function tooltip(chart: any) {
      const container = chart.container;
      const tooltipDiv = document.createElement("div");
      tooltipDiv.setAttribute(
        "class",
        "ct-tooltip animate__animated animate__faster animate__fadeOut absolute bg-white px-4 py-2 rounded shadow text-slate-600 text-sm transition-all"
      );
      container.appendChild(tooltipDiv);
      const cleanObs = (obs: any) => {
        obs.disconnect();
      };
      const callback = (mutationList: any[], obs: any) => {
        const lines = container.querySelectorAll("line.ct-point");
        lines.forEach((item: any) => {
          item.addEventListener("mouseenter", (event: any) => {
            console.log("mouse enter");
            const target = event.target;
            const value = target.getAttribute("ct:value");
            let html = "";
            if (options.prefix) html += options.prefix;
            if (value) html += Intl.NumberFormat("vi-VI").format(value);
            if (options.suffix) html += options.suffix;
            tooltipDiv.innerHTML = html;
            tooltipDiv.classList.remove("animate__fadeOut");
            tooltipDiv.classList.add("animate__fadeIn");
            tooltipDiv.style.left = `${event.offsetX}px`;
            tooltipDiv.style.top = `${event.offsetY}px`;
            // tooltipDiv.addEventListener("mouseleave", (event: any) => {
            //   tooltipDiv.classList.remove("animate__fadeIn");
            //   tooltipDiv.classList.add("animate__fadeOut");
            // });
          });
        });
        cleanObs(observer);
      };
      const observer = new MutationObserver(callback);
      const config = { childList: true, subtree: true };
      observer.observe(container, config);
      container.addEventListener("mouseleave", (event: any) => {
        tooltipDiv.classList.remove("animate__fadeIn");
        tooltipDiv.classList.add("animate__fadeOut");
        tooltipDiv.style.pointerEvents = "none";
      });
    };
  };

  const getCurrentWeek = () => {
    let last7day = dayjs().subtract(6, "day");
    let result = [];
    for (let i = 0; i < 7; i++) {
      result.push(last7day.add(i, "day").format("MM/DD"));
    }
    return result;
  };
  return (
    <div className="grid grid-cols-6 gap-4 p-4">
      <div className="col-span-6">Doanh thu</div>
      <div className="col-span-4">
        <div ref={chartRef4} className="h-[200px] w-full bg-white p-4 rounded-md shadow-md relative" />
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
