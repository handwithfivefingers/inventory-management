import { Outlet } from "@remix-run/react";

const AuthLayout = () => {
  return (
    <div className="grid grid-cols-2 min-h-[100svh]">
      <div className="col-span-1 bg-indigo-300 flex items-center justify-center">
        <img src={"/imgs/login-bg.webp"} className="object-contain w-full h-full max-w-[500px]" />
      </div>
      <div className="flex col-span-1  relative w-full">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
