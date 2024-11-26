import { Link } from "@remix-run/react";

export const Header = () => {
  return (
    <div className="flex border-b items-center w-full overflow-hidden">
      <div className="bg-indigo-300 p-4 min-w-40 text-center">Header</div>
      <nav className=" flex flex-row gap-4 flex-1 px-4 ">
        {[...Array(10)].map((_, i) => (
          <Link to={_} key={i} className="min-w-12 bg-slate-200 py-2 px-8 text-center rounded-sm">
            {i}
          </Link>
        ))}
        <div className="ml-auto min-w-12 bg-slate-200 py-2 px-8 text-center rounded-sm">
          <Link to="/login">Login</Link>
        </div>
      </nav>
    </div>
  );
};
