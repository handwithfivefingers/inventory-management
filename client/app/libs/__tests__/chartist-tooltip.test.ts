import { describe, it, expect } from "vitest";
import { hoverTooltips } from "~/libs/chartist-tooltip";

const flushObservers = () => new Promise((resolve) => setTimeout(resolve, 0));

const makeChart = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return { container, chart: { container } as any };
};

describe("hoverTooltips", () => {
  it("appends a tooltip element to the chart container", async () => {
    const { container, chart } = makeChart();
    hoverTooltips()(chart);
    await flushObservers();

    const tooltip = container.querySelector(".ct-tooltip");
    expect(tooltip).not.toBeNull();
    container.remove();
  });

  it("renders the hovered value formatted for vi-VN with prefix and suffix", async () => {
    const { container, chart } = makeChart();
    hoverTooltips({ prefix: "DT: ", suffix: " VND" })(chart);

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("class", "ct-point");
    line.setAttribute("ct:value", "1500000");
    container.appendChild(line);
    await flushObservers();

    const tooltip = container.querySelector(".ct-tooltip") as HTMLElement;
    line.dispatchEvent(new Event("mouseenter", { bubbles: true }));

    expect(tooltip.innerHTML).toContain("DT: ");
    expect(tooltip.innerHTML).toContain("VND");
    expect(tooltip.innerHTML).toContain("1.500.000");
    expect(tooltip.classList.contains("animate__fadeIn")).toBe(true);
    container.remove();
  });

  it("fades out on container mouseleave", async () => {
    const { container, chart } = makeChart();
    hoverTooltips()(chart);
    await flushObservers();

    const tooltip = container.querySelector(".ct-tooltip") as HTMLElement;
    container.dispatchEvent(new Event("mouseleave", { bubbles: true }));

    expect(tooltip.classList.contains("animate__fadeOut")).toBe(true);
    expect(tooltip.style.pointerEvents).toBe("none");
    container.remove();
  });
});
