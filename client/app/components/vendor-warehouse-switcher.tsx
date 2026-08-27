import { m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "~/components/icon";
import { Portal } from "~/components/portal";
import { useSubmitPromise, DROPDOWN_PANEL_CLASS, useDropdownPosition } from "~/hooks";
import { cn } from "~/libs/utils";
import { useUser } from "~/store/user.store";
import { IVendor } from "~/types/vendor";
import { IWareHouse } from "~/types/warehouse";
export const VendorWarehouseSwitcher = () => {
  const { vendors, activeVendor, activeWarehouse, setVendor, setWarehouse } = useUser();

  const hasMultipleVendors = (vendors?.length || 0) > 1;
  const hasMultipleWarehouses = (activeVendor?.warehouses?.length || 0) > 1;
  const showSwitcher = hasMultipleVendors || hasMultipleWarehouses;

  const { submit } = useSubmitPromise();

  const handleVendorChange = (vendorId: number) => {
    const vendor = vendors?.find((v) => v.id === vendorId);
    if (!vendor) return;
    // Switching vendor resets the active warehouse to the vendor's first one.
    const warehouse = vendor.warehouses?.[0];
    setVendor(vendor);
    if (warehouse && warehouse.id !== activeWarehouse?.id) {
      setWarehouse(warehouse);
    }
    // Persist both values in a single submit — two sequential submits through
    // the same fetcher would cancel the first request and drop vendorId.
    const formData: Record<string, string> = { vendorId: String(vendor.id) };
    if (warehouse && warehouse.id !== activeWarehouse?.id) {
      formData.warehouseId = String(warehouse.id);
    }
    submit(formData, { method: "post", action: "/api/session" });
  };

  const handleWarehouseChange = (warehouseId: number) => {
    const warehouse = activeVendor?.warehouses?.find((w) => w.id === warehouseId);
    if (!warehouse || !activeVendor) return;
    setWarehouse(warehouse);
    submit({ warehouseId: warehouse.id }, { method: "post", action: "/api/session" });
  };

  if (!showSwitcher || !activeVendor) return null;
  return (
    <div className="flex items-center gap-2">
      {/* Vendor Selector */}
      {hasMultipleVendors && (
        <Selector
          name={activeVendor?.name || ""}
          onChange={(v) => handleVendorChange(+v.id)}
          selected={activeVendor.id}
          data={vendors as IVendor[]}
        />
      )}

      {/* Warehouse Selector */}

      {hasMultipleWarehouses && (
        <Selector
          name={activeWarehouse?.name || ""}
          onChange={(warehouse) => handleWarehouseChange(+warehouse.id)}
          selected={activeWarehouse?.id as number}
          data={activeVendor.warehouses as IWareHouse[]}
        />
      )}
    </div>
  );
};

interface Props<T> {
  name: string;
  selected: number;
  data: T[];
  onChange: (v: T) => void;
}
const Selector = <T extends { name: string; id: number }>({ name, onChange, data, selected }: Props<T>) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !wrapperRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Keep the dropdown glued to the trigger on scroll / resize.
  useDropdownPosition(isOpen, wrapperRef, dropdownRef);

  return (
    <div className="flex items-center gap-2" ref={wrapperRef}>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white hover:bg-indigo-50 border border-indigo-200 rounded-md transition-colors"
        >
          <Icon name="package" className="w-4 h-4 text-indigo-600" />
          <span className="max-w-[150px] truncate">{name || "Select"}</span>
          <Icon name="chevron-down" className="w-4 h-4 text-indigo-600" />
        </button>

        <Portal>
          {isOpen && (
            <m.div
              ref={dropdownRef}
              className={cn(DROPDOWN_PANEL_CLASS, "min-w-[200px]")}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="p-2">
                <div className="text-xs font-medium text-gray-500 px-2 py-1">Kho hàng</div>
                <ul className="max-h-[300px] overflow-y-auto">
                  {data?.map((item, index) => (
                    <li
                      key={`dropdown-${index}`}
                      onClick={() => {
                        onChange(item);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "px-3 py-2 cursor-pointer rounded-md flex items-center gap-2 text-sm",
                        Number(selected) === +item.id
                          ? "bg-indigo-50 text-indigo-700"
                          : "hover:bg-gray-50 text-gray-700",
                      )}
                    >
                      <Icon name={Number(selected) === +item.id ? "check-circle" : "circle"} className="w-4 h-4" />
                      <span className="flex-1">{item.name}</span>
                      {/* {warehouse.isMain && (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">Chính</span>
                    )} */}
                    </li>
                  ))}
                </ul>
              </div>
            </m.div>
          )}
        </Portal>
      </div>
    </div>
  );
};
