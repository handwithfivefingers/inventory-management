import { useState } from "react";
import { TMButton } from "./tm-button";
import { TMModal } from "./tm-modal";
import { IVendor } from "~/types/vendor";

interface IWarehouseVendorSelectionModal {
  open: boolean;
  vendors: IVendor[];
  defaultVendorId?: number | null;
  defaultWarehouseId?: number | null;
  onConfirm: (vendorId: number, warehouseId: number) => void;
}

export const WarehouseVendorSelectionModal = ({
  open,
  vendors,
  defaultVendorId,
  defaultWarehouseId,
  onConfirm,
}: IWarehouseVendorSelectionModal) => {
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(defaultVendorId || null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(defaultWarehouseId || null);

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);
  const warehouses = selectedVendor?.warehouses || [];

  const handleConfirm = () => {
    if (selectedVendorId && selectedWarehouseId) {
      onConfirm(selectedVendorId, selectedWarehouseId);
    }
  };

  return (
    <TMModal open={open} title="Chọn nhà cung cấp và kho hàng" width="500px" close={() => {}} maskOnClose={false}>
      <div className="flex flex-col gap-4 w-full">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Nhà cung cấp</label>
          <select
            className="border rounded-md p-2 w-full"
            value={selectedVendorId || ""}
            onChange={(e) => {
              const vendorId = Number(e.target.value);
              setSelectedVendorId(vendorId);
              // Reset warehouse when vendor changes
              const vendor = vendors.find((v) => v.id === vendorId);
              setSelectedWarehouseId(vendor?.warehouses?.[0]?.id || null);
            }}
          >
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Kho hàng</label>
          <select
            className="border rounded-md p-2 w-full"
            value={selectedWarehouseId || ""}
            onChange={(e) => setSelectedWarehouseId(Number(e.target.value))}
          >
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name} {warehouse.isMain ? "(Chính)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <TMButton htmlType="button" onClick={handleConfirm}>
            Xác nhận
          </TMButton>
        </div>
      </div>
    </TMModal>
  );
};
