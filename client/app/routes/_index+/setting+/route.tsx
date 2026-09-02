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
  return <Outlet />;
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}
