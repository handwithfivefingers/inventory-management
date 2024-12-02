import { Link } from "@remix-run/react";
import { TextInput } from "~/components/form/text-input";
import { useVendor } from "~/store/vendor.store";
import { useWarehouse } from "~/store/warehouse.store";

export const Header = () => {
  const { defaultActive } = useVendor();
  const { warehouse } = useWarehouse();
  return (
    <div className="flex border-b items-center w-full overflow-hidden">
      <div className="bg-indigo-200 p-4 min-w-40 text-center max-w-60 font-bold w-full">I-ERP</div>
      <nav className=" flex flex-row gap-4 flex-1 px-4 ">
        <div className="flex items-center flex-row gap-2">
          <h2>Site Title</h2>
          <div className="flex gap-2">
            <TextInput value={defaultActive?.name} prefix="Vendor" className="!bg-transparent" readOnly />
            <TextInput value={warehouse?.name} prefix="Warehouse" className="" readOnly />
          </div>
        </div>

        <div className="ml-auto min-w-12 bg-slate-200 py-2 px-8 text-center rounded-sm">
          <Link to="/login">Login</Link>
        </div>
      </nav>
    </div>
  );
};
