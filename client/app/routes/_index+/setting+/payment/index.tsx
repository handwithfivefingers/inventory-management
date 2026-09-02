import type { MetaFunction } from "@remix-run/node";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { Icon } from "~/components/icon";
import { Payment } from "~/components/payment";

export const meta: MetaFunction = () => {
  return [{ title: "Payment - Cài đặt" }, { name: "description", content: "Cài đặt tài khoản ngân hàng" }];
};

export default function PaymentRoute() {
  return (
    <div className=" w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem
        title={
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                <Icon name="credit-card" fontSize={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">Cài đặt thanh toán</h2>
                <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                  Cài đặt tài khoản ngân hàng
                </p>
              </div>
            </div>
          </div>
        }
        className="flex flex-col w-full rounded-md dark:bg-slate-500 bg-white shadow-2xl shadow-slate-200 gap-2 dark:shadow-slate-600 p-5 sm:p-6 h-full"
      >
        <Payment />
      </CardItem>
    </div>
  );
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}
