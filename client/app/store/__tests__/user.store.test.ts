import { describe, it, expect, beforeEach } from "vitest";
import { useUser } from "../user.store";
import type { IVendor } from "~/types/vendor";
import type { IWareHouse } from "~/types/warehouse";
import type { IUser } from "~/types/user";

const warehouse = (id: number, isMain = false): IWareHouse => ({
  id,
  name: `Warehouse ${id}`,
  isMain,
});

const vendor = (id: number, warehouses: IWareHouse[]): IVendor => ({
  id,
  name: `Vendor ${id}`,
  warehouses,
});

const user: IUser = { id: 1, email: "a@b.com", firstName: "A", lastName: "B" };

describe("useUser store", () => {
  beforeEach(() => {
    useUser.getState().reset();
  });

  it("starts empty", () => {
    const state = useUser.getState();
    expect(state.user).toBeUndefined();
    expect(state.roles).toBeUndefined();
    expect(state.vendors).toBeUndefined();
    expect(state.activeVendor).toBeUndefined();
    expect(state.activeWarehouse).toBeUndefined();
  });

  it("syncAuth sets the user and selects the persisted vendor/warehouse", () => {
    const v1 = vendor(1, [warehouse(10, true), warehouse(11, false)]);
    const v2 = vendor(2, [warehouse(20, true)]);
    useUser.getState().syncAuth({
      user,
      vendors: [v1, v2],
      selectedVendorId: 1,
      selectedWarehouseId: 11,
    });
    const state = useUser.getState();
    expect(state.user).toBe(user);
    expect(state.activeVendor?.id).toBe(1);
    expect(state.activeWarehouse?.id).toBe(11);
  });

  it("syncAuth falls back to the main warehouse when no warehouse id is provided", () => {
    const v1 = vendor(1, [warehouse(10, false), warehouse(11, true)]);
    useUser.getState().syncAuth({ user, vendors: [v1], selectedVendorId: 1 });
    expect(useUser.getState().activeWarehouse?.id).toBe(11);
  });

  it("syncAuth falls back to the first vendor when selection is absent", () => {
    const v1 = vendor(1, [warehouse(10, true)]);
    useUser.getState().syncAuth({ user, vendors: [v1] });
    expect(useUser.getState().activeVendor?.id).toBe(1);
  });

  it("preserves the existing selection when it is still valid", () => {
    const v1 = vendor(1, [warehouse(10, true), warehouse(11, false)]);
    const v2 = vendor(2, [warehouse(20, true)]);
    useUser.getState().syncAuth({ user, vendors: [v1, v2], selectedVendorId: 1, selectedWarehouseId: 10 });
    // change the persisted cookie choice to vendor 2 but keep current selection valid
    useUser.getState().syncAuth({ user, vendors: [v1, v2], selectedVendorId: 2 });
    const state = useUser.getState();
    expect(state.activeVendor?.id).toBe(1);
    expect(state.activeWarehouse?.id).toBe(10);
  });

  it("setVendor updates the active vendor and its main warehouse", () => {
    const v2 = vendor(2, [warehouse(20, false), warehouse(21, true)]);
    useUser.getState().setVendor(v2);
    expect(useUser.getState().activeVendor?.id).toBe(2);
    expect(useUser.getState().activeWarehouse?.id).toBe(21);
  });

  it("setWarehouse updates only the active warehouse", () => {
    const v1 = vendor(1, [warehouse(10, true), warehouse(11, false)]);
    useUser.getState().setVendor(v1);
    useUser.getState().setWarehouse(warehouse(11));
    expect(useUser.getState().activeWarehouse?.id).toBe(11);
    expect(useUser.getState().activeVendor?.id).toBe(1);
  });

  it("reset clears the state", () => {
    const v1 = vendor(1, [warehouse(10, true)]);
    useUser.getState().syncAuth({ user, vendors: [v1] });
    useUser.getState().reset();
    const state = useUser.getState();
    expect(state.user).toBeUndefined();
    expect(state.vendors).toBeUndefined();
    expect(state.activeVendor).toBeUndefined();
  });

  it("leaves selections undefined when no vendors are provided", () => {
    useUser.getState().syncAuth({ user });
    const state = useUser.getState();
    expect(state.activeVendor).toBeUndefined();
    expect(state.activeWarehouse).toBeUndefined();
  });

  it("falls back to the first vendor when the selected id is unknown", () => {
    const v1 = vendor(1, [warehouse(10, true)]);
    const v2 = vendor(2, [warehouse(20, true)]);
    useUser.getState().syncAuth({ user, vendors: [v1, v2], selectedVendorId: 999 });
    expect(useUser.getState().activeVendor?.id).toBe(1);
  });

  it("sets the vendor but leaves the warehouse undefined when it has no warehouses", () => {
    const v = vendor(3, []);
    useUser.getState().setVendor(v);
    expect(useUser.getState().activeVendor?.id).toBe(3);
    expect(useUser.getState().activeWarehouse).toBeUndefined();
  });

  it("updates the warehouse independently of any vendor selection", () => {
    const w = warehouse(99, false);
    useUser.getState().setWarehouse(w);
    expect(useUser.getState().activeWarehouse?.id).toBe(99);
  });
});
