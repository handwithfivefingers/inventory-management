import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { CardItem } from "~/components/card-item";
import { TMButton } from "~/components/tm-button";
export const meta: MetaFunction = () => {
  return [{ title: `Not Found` }];
};

export default function AllRouteCatch() {
  return <ErrorBoundary />;
}
export function ErrorBoundary() {
  return (
    <div className="container mx-auto h-screen flex items-center justify-center">
      <div>
        <CardItem
          title="Whoops!"
          className="flex w-full flex-col items-center justify-center gap-8 rounded-md p-8 w-80"
        >
          {/* <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-600 text-slate-600 ">
            <TbHelpCircle className="h-8 w-8 stroke-[1.5px] text-slate-600" />
          </div> */}
          <div className="flex flex-col items-center gap-2 w-full">
            <p className="text-2xl font-medium text-slate-800">Whoops!</p>
            <p className="text-center text-lg font-normal text-slate-800/60">Nothing here yet!</p>
          </div>
          <TMButton>
            <Link to="/" prefetch="intent" className={`hover:text-main-900 flex items-center gap-2`}>
              {/* <TbArrowLeft className="h-5 w-5" /> */}
              <span>Home</span>
            </Link>
          </TMButton>
        </CardItem>
      </div>
    </div>
  );
}
