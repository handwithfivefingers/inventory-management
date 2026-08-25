/**
 * Chartist plugin rendering a floating tooltip on point/bar hover.
 * Shared by dashboard charts so the logic is not copy-pasted per route.
 */
export const hoverTooltips = (options: { prefix?: string; suffix?: string } = {}) => {
  return function tooltip(chart: any) {
    const container = chart.container;
    const tooltipDiv = document.createElement("div");
    tooltipDiv.setAttribute(
      "class",
      "ct-tooltip animate__animated animate__faster animate__fadeOut absolute bg-white px-4 py-2 rounded shadow text-slate-600 text-sm transition-all",
    );
    container.appendChild(tooltipDiv);
    const observer = new MutationObserver(() => {
      const lines = container.querySelectorAll("line.ct-point");
      lines.forEach((item: any) => {
        item.addEventListener("mouseenter", (event: any) => {
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
        });
      });
      observer.disconnect();
    });
    observer.observe(container, { childList: true, subtree: true });
    container.addEventListener("mouseleave", () => {
      tooltipDiv.classList.remove("animate__fadeIn");
      tooltipDiv.classList.add("animate__fadeOut");
      tooltipDiv.style.pointerEvents = "none";
    });
  };
};
