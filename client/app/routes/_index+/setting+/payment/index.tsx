import type { MetaFunction } from "@remix-run/node";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { Payment } from "~/components/payment";

export const meta: MetaFunction = () => {
  return [{ title: "Payment - Cài đặt" }, { name: "description", content: "Cài đặt tài khoản ngân hàng" }];
};

export default function PaymentRoute() {
  return (
    <div className="w-full flex flex-col gap-4">
      <CardItem title="Cài đặt thanh toán" className="p-4">
        <Payment />
      </CardItem>
    </div>
  );
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}
