import { Link, useFetcher } from "@remix-run/react";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";
import { TMDropdown } from "~/components/tm-dropdown";
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
  const handleNotification = () => {};
  return (
    <div className="flex border-b items-center w-full overflow-hidden">
      <div className=" p-2 min-w-40 text-center max-w-60 font-bold w-full ">
        <Link to="/">{defaultActive?.name}</Link>
      </div>
      <nav className=" flex flex-row gap-4 flex-1 px-4   p-2">
        <div className="flex items-center flex-row gap-2">
          <div className="flex gap-2 items-center">
            <div>Warehouse:</div>
            <TextInput value={warehouse?.name} className="" readOnly />
          </div>
        </div>

        <div className="ml-auto min-w-12  py-2 text-center rounded-sm flex gap-4">
          <div className="flex gap-2 items-center text-sm relative px-2">
            <div className="flex relative">
              <Icon name="bell" className="w-4 h-4" />
              <span className="text-red-600/80 absolute -right-2 -top-2 rounded-full h-3 w-3 text-[10px] flex items-center justify-center font-semibold">
                12
              </span>
            </div>
          </div>

          <TMDropdown
            placement="right"
            variant="ghost"
            items={[
              {
                label: (
                  <div className="flex gap-2 items-center text-sm">
                    <Icon name="user" className="w-4 h-4" />
                    <span>Profile</span>
                  </div>
                ),
                onClick: handleLogOut,
              },
              {
                label: (
                  <div className="flex gap-2 items-center text-sm">
                    <Icon name="log-out" className="w-4 h-4" />
                    <span>Logout</span>
                  </div>
                ),
                onClick: handleLogOut,
              },
            ]}
          >
            <Icon name="user" className="w-4 h-4" />
          </TMDropdown>
        </div>
      </nav>
    </div>
  );
};
