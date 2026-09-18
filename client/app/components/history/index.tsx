import { IProduct } from "~/types/product";
import { TMTimeline } from "../tm-timeline";

export const HistoryList = ({ history }: { history: IProduct[] }) => {
  return (
    <div className="w-full flex flex-col gap-2">
      <TMTimeline
        items={
          history.map((item: any) => ({
            title: item.type == 0 ? `Nhập Kho  - SL:${item.quantity}` : `Xuất kho  - SL:${item.quantity}`,
            description: (
              <span>
                SKU:{" "}
                <span className="bg-slate-100 dark:bg-slate-700 border border-slate-200/50 dark:border-slate-600 px-2 py-0.5 rounded">
                  {item.variant?.skuCode || item?.skuCode}
                </span>
              </span>
            ),
            date: item?.updatedAt,
            variant: item.type == 0 ? "success" : "danger",
          })) || []
        }
      />
    </div>
  );
};
