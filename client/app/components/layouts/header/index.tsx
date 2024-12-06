import { Link, useFetcher } from "@remix-run/react";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { useUser } from "~/store/user.store";
import { useVendor } from "~/store/vendor.store";
import { useWarehouse } from "~/store/warehouse.store";

export const Header = () => {
  const { defaultActive, reset: vendorReset } = useVendor();
  const { warehouse, reset: warehouseReset } = useWarehouse();
  const usr = useUser();
  const fetcher = useFetcher();
  const handleLogOut = () => {
    usr.reset();
    warehouseReset();
    vendorReset();
    fetcher.submit({}, { method: "POST", action: "/" });
  };
  return (
    <div className="flex border-b items-center w-full overflow-hidden">
      <div className="bg-indigo-200 p-4 min-w-40 text-center max-w-60 font-bold w-full">
        <Link to="/">I-ERP</Link>
      </div>
      <nav className=" flex flex-row gap-4 flex-1 px-4 ">
        <div className="flex items-center flex-row gap-2">
          <div className="flex gap-2 items-center">
            <TextInput value={defaultActive?.name} prefix="Vendor" className="!bg-transparent" readOnly />
            <TextInput value={warehouse?.name} prefix="Warehouse" className="" readOnly />
          </div>
        </div>

        <div className="ml-auto min-w-12  py-2 text-center rounded-sm">
          {usr?.user?.id ? (
            <TMButton variant="light" onClick={handleLogOut}>
              Logout
            </TMButton>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </nav>
    </div>
  );
};
