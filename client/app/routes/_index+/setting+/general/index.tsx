import type { MetaFunction } from "@remix-run/node";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { Icon } from "~/components/icon";

export const meta: MetaFunction = () => {
  return [
    { title: "General - Cài đặt" },
    { name: "description", content: "Cài đặt giao diện và cấu hình hệ thống" },
  ];
};

export default function GeneralSettings() {
  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <CardItem title="Cài đặt chung" className="p-4">
        <div className="text-center py-12">
          <Icon name="settings" className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600">General Settings</h3>
          <p className="text-gray-500 mt-2">
            Chức năng cài đặt giao diện và cấu hình hệ thống đang được phát triển
          </p>
          <ul className="text-left text-sm text-gray-500 mt-4 space-y-2 inline-block">
            <li>• Theme setting (Light/Dark mode)</li>
            <li>• Site setting (Tên website, Logo, Favicon)</li>
            <li>• Language setting (Ngôn ngữ)</li>
            <li>• Timezone setting (Múi giờ)</li>
          </ul>
        </div>
      </CardItem>
    </div>
  );
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}
