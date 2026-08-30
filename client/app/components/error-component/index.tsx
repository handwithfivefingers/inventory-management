import { Link, useRouteError } from "@remix-run/react";
import { useState } from "react";
import { TMButton } from "../tm-button";

export function ErrorComponent() {
  const error: any = useRouteError();
  const [show, setShow] = useState(false);
  return (
    <div className=" w-full flex flex-col p-4">
      <div className="px-8 bg-white mx-auto rounded-md justify-center flex flex-col gap-2">
        <h1 className="text-[100px] font-bold -skew-x-12 mx-auto">
          <span className="text-red-700/80">4</span>
          <span className="text-red-700/70">0</span>
          <span className="text-red-700/60">4</span>
        </h1>
        <p className="text-slate-700 text-center">{error?.message}</p>
        <div className="p-4 flex gap-2">
          <TMButton onClick={() => setShow(!show)}>Xem thêm </TMButton>
          <TMButton component={Link} to="/">
            Quay lại trang chủ
          </TMButton>
        </div>
        {show && (
          <div className="bg-red-200 p-2 rounded-md">
            <pre className="whitespace-break-spaces text-gray-900/80 text-xs">{error.stack}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
