/**
 * QZ Tray printer picker. Lists OS printers visible to the local QZ Tray
 * agent and persists the choice in localStorage (`qz-printer-name`).
 * Hydration-safe: options load after mount; first render is deterministic.
 *
 * TEMPORARILY DISABLED — renders nothing while browser print is the default.
 * To re-enable: restore the implementation below the early return.
 */
export const QzPrinterSelect = ({ label = "QZ printer" }: { label?: string }) => {
  void label;
  // Disabled: browser print is the default. Hooks-free early return so
  // no QZ websocket connection is attempted.
  return null;

  // --- QZ implementation (restore when re-enabling) ---
  // const [printers, setPrinters] = useState<string[]>([]);
  // const [selected, setSelected] = useState<string>("");
  // const [status, setStatus] = useState<"loading" | "ready" | "offline">("loading");
  // const refresh = useCallback(async () => {
  //   setStatus("loading");
  //   try {
  //     const names = await listQzPrinters();
  //     setPrinters(names);
  //     const saved = loadQzPrinterName();
  //     setSelected(saved && names.includes(saved) ? saved : "");
  //     setStatus("ready");
  //   } catch {
  //     setPrinters([]);
  //     setStatus("offline");
  //   }
  // }, []);
  // useEffect(() => {
  //   setSelected(loadQzPrinterName() ?? "");
  //   void refresh();
  // }, [refresh]);
  // return (
  //   <div className="w-52">
  //     <SelectInput
  //       label={label}
  //       options={[
  //         { label: status === "offline" ? "QZ Tray offline — run QZ Tray" : "System default", value: "" },
  //         ...printers.map((name) => ({ label: name, value: name })),
  //       ]}
  //       value={selected}
  //       onSelect={(v: any) => {
  //         const next = String(v ?? "");
  //         setSelected(next);
  //         saveQzPrinterName(next || null);
  //       }}
  //       onClick={() => {
  //         if (status === "ready" && printers.length === 0) void refresh();
  //       }}
  //     />
  //   </div>
  // );
};
