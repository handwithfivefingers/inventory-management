import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import { ErrorComponent } from "~/components/error-component";

export const meta: MetaFunction = () => {
  return [{ title: "Cài đặt" }, { name: "description", content: "Quản lý cài đặt hệ thống" }];
};

/**
 * GET /setting
 * Load setting page
 */
export async function loader({ request }: LoaderFunctionArgs) {
  return {};
}

interface ISettingItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  to: string;
  color: string;
}

const SETTING_ITEMS: ISettingItem[] = [
  {
    id: "general",
    title: "General",
    description: "Cài đặt giao diện và cấu hình hệ thống",
    icon: "settings",
    to: "./general",
    color: "text-blue-600",
  },
  {
    id: "payment",
    title: "Payment",
    description: "Cài đặt tài khoản ngân hàng và thanh toán",
    icon: "credit-card",
    to: "./payment",
    color: "text-green-600",
  },
  {
    id: "role",
    title: "Role",
    description: "Quản lý vai trò và phân quyền",
    icon: "shield",
    to: "./role",
    color: "text-primary",
  },
];

export default function Setting() {
  return (
    <div className="w-full flex flex-col p-4 gap-4">
      {/* <CardItem title="Cài đặt" className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SETTING_ITEMS.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              className="block p-6 rounded-lg border border-gray-200 hover:shadow-lg hover:border-indigo-200 transition-all duration-200 group"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg bg-gray-50 group-hover:bg-indigo-50 transition-colors ${item.color}`}>
                  <Icon name={item.icon} className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                </div>
                <Icon
                  name="chevron-right"
                  className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors"
                />
              </div>
            </Link>
          ))}
        </div>
      </CardItem> */}
      <Outlet />
    </div>
  );
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}
