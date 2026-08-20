import { useUser } from "~/store/user.store";
import { Icon } from "~/components/icon";
import { cn } from "~/libs/utils";
import { useState, useRef, useEffect } from "react";
import { Portal } from "~/components/portal";
import { m } from "motion/react";
export const VendorWarehouseSwitcher = () => {
  const { vendors, activeVendor, activeWarehouse, setVendor, setWarehouse } = useUser();

  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hasMultipleVendors = (vendors?.length || 0) > 1;
  const hasMultipleWarehouses = (activeVendor?.warehouses?.length || 0) > 1;
  const showSwitcher = hasMultipleVendors || hasMultipleWarehouses;

  useEffect(() => {
    let resizeObserver: ResizeObserver;

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
      resizeObserver = new ResizeObserver(() => {
        handleBounce();
      });
      resizeObserver.observe(document.body);
      handleBounce();
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      resizeObserver?.disconnect();
    };
  }, [isOpen]);

  const handleBounce = () => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    dropdownRef.current?.style.setProperty("top", `${rect?.bottom}px`);
    dropdownRef.current?.style.setProperty("left", `${rect?.left}px`);
    dropdownRef.current?.style.setProperty("height", "auto");
    dropdownRef.current?.style.setProperty("z-index", "999");
    dropdownRef.current?.style.setProperty("width", `${rect?.width}px`);
  };

  const handleVendorChange = (vendorId: number) => {
    const vendor = vendors?.find((v) => v.id === vendorId);
    if (vendor) {
      setVendor(vendor);
    }
  };

  const handleWarehouseChange = (warehouseId: number) => {
    const warehouse = activeVendor?.warehouses?.find((w) => w.id === warehouseId);
    if (warehouse) {
      setWarehouse(warehouse);
    }
  };

  if (!showSwitcher || !activeVendor) return null;

  return (
    <div className="flex items-center gap-2" ref={wrapperRef}>
      {/* Vendor Selector */}
      {hasMultipleVendors && (
        <div className="relative">
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white hover:bg-indigo-50 border border-indigo-200 rounded-md transition-colors"
          >
            <Icon name="briefcase" className="w-4 h-4 text-indigo-600" />
            <span className="max-w-[150px] truncate">{activeVendor.name}</span>
            <Icon name="chevron-down" className="w-4 h-4 text-indigo-600" />
          </button>

          <Portal>
            {isOpen && (
              <m.div
                ref={dropdownRef}
                className="fixed top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[200px]"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-500 px-2 py-1">Nhà cung cấp</div>
                  <ul className="max-h-[300px] overflow-y-auto">
                    {vendors?.map((vendor) => (
                      <li
                        key={vendor.id}
                        onClick={() => {
                          handleVendorChange(vendor.id);
                          setIsOpen(false);
                        }}
                        className={cn(
                          "px-3 py-2 cursor-pointer rounded-md flex items-center gap-2 text-sm",
                          vendor.id === activeVendor.id
                            ? "bg-indigo-50 text-indigo-700"
                            : "hover:bg-gray-50 text-gray-700",
                        )}
                      >
                        <Icon name={vendor.id === activeVendor.id ? "check-circle" : "circle"} className="w-4 h-4" />
                        <span className="flex-1">{vendor.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </m.div>
            )}
          </Portal>
        </div>
      )}

      {/* Warehouse Selector */}
      {hasMultipleWarehouses && (
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white hover:bg-indigo-50 border border-indigo-200 rounded-md transition-colors"
          >
            <Icon name="package" className="w-4 h-4 text-indigo-600" />
            <span className="max-w-[150px] truncate">{activeWarehouse?.name || "Select warehouse"}</span>
            <Icon name="chevron-down" className="w-4 h-4 text-indigo-600" />
          </button>

          <Portal>
            {isOpen && (
              <m.div
                ref={dropdownRef}
                className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[200px]"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-500 px-2 py-1">Kho hàng</div>
                  <ul className="max-h-[300px] overflow-y-auto">
                    {activeVendor.warehouses?.map((warehouse) => (
                      <li
                        key={warehouse.id}
                        onClick={() => {
                          handleWarehouseChange(warehouse.id);
                          setIsOpen(false);
                        }}
                        className={cn(
                          "px-3 py-2 cursor-pointer rounded-md flex items-center gap-2 text-sm",
                          warehouse.id === activeWarehouse?.id
                            ? "bg-indigo-50 text-indigo-700"
                            : "hover:bg-gray-50 text-gray-700",
                        )}
                      >
                        <Icon
                          name={warehouse.id === activeWarehouse?.id ? "check-circle" : "circle"}
                          className="w-4 h-4"
                        />
                        <span className="flex-1">{warehouse.name}</span>
                        {warehouse.isMain && (
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">Chính</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </m.div>
            )}
          </Portal>
        </div>
      )}
    </div>
  );
};
