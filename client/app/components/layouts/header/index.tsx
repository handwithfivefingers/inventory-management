import { Link } from "@remix-run/react";
import { TextInput } from "~/components/form/text-input";

export const Header = () => {
  return (
    <div className="flex border-b items-center w-full overflow-hidden">
      <div className="bg-indigo-300 p-4 min-w-40 text-center max-w-60 w-full">Header</div>
      <nav className=" flex flex-row gap-4 flex-1 px-4 ">
        {/* {[...Array(10)].map((_, i) => (
          <Link to={_} key={i} className="min-w-12 bg-slate-200 py-2 px-8 text-center rounded-sm">
            {i}
          </Link>
        ))} */}
        <div className="flex items-center flex-row gap-2">
          <h2>Site Title</h2>
          <div className="flex gap-2">
            <TextInput value={import.meta.env.VITE_VENDOR} prefix="Vendor" className="!bg-transparent" readOnly />
            <TextInput value={import.meta.env.VITE_WARE_HOUSE} prefix="Warehouse" className="" readOnly />
          </div>
        </div>

        <div className="ml-auto min-w-12 bg-slate-200 py-2 px-8 text-center rounded-sm">
          <Link to="/login">Login</Link>
        </div>
      </nav>
    </div>
  );
};
