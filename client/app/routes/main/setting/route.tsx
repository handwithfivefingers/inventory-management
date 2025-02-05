import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, json, useLoaderData, useNavigate } from "@remix-run/react";
import { Suspense, lazy, useState } from "react";
import { NumericFormat } from "react-number-format";
import { financialService } from "~/action.server/financial.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { CheckboxInput } from "~/components/form/checkbox-input";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { TMPagination } from "~/components/tm-pagination";
import { TMTab } from "~/components/tm-tab";
import { TMTable } from "~/components/tm-table";
import { dayjs } from "~/libs/date";
import { cn } from "~/libs/utils";
import { getSession } from "~/sessions";
// import { Payment } from "./_component/payment";
const Payment = lazy(() => import("./_component/payment"));

// export const loader = async ({ request }: LoaderFunctionArgs) => {
//   try {
//     const session = await getSession(request.headers.get("Cookie"));
//     const warehouse = session.get("warehouse");
//     const url = new URL(request.url);
//     const params = url.searchParams;
//     const page = params.get("page") || 1;
//     const pageSize = params.get("pageSize") || 10;
//     const resp = await financialService.get({ warehouse: warehouse as string, page, pageSize });
//     resp.page = Number(page);
//     resp.pageSize = Number(pageSize);

//     return resp;
//   } catch (error) {
//     return json({ message: "error" }, { status: 404 });
//   }
// };

export const meta: MetaFunction = () => {
  return [{ title: "Nhập hàng" }, { name: "description", content: "Nhập hàng" }];
};

export default function ImportOrder() {
  // const { data, total, page, pageSize } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<string>("general");
  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <CardItem title="Cài đặt">
        {/* <div className="flex">
          <div
            className="px-4 py-1.5 bg-white border rounded-l-md rounded-b-none border-b-0"
            onClick={() => setTab("general")}
          >
            General
          </div>
          <div
            className="px-4 py-1.5 bg-white border border-l-0 border-r-0 border-b-0"
            onClick={() => setTab("payment")}
          >
            Thanh Toán
          </div>
          <div
            className="px-4 py-1.5 bg-white border rounded-r-md rounded-b-none border-b-0"
            onClick={() => setTab("role")}
          >
            Role
          </div>
        </div>
        <div className="px-2 py-2.5 border">
          <div
            className={cn("animate__animated animate__faster", {
              ["animate__fadeIn"]: tab === "general",
              ["animate__fadeOut hidden"]: tab !== "general",
            })}
          >
            Content 1
          </div>
          <div
            className={cn("animate__animated animate__faster", {
              ["animate__fadeIn"]: tab === "display",
              ["animate__fadeOut hidden"]: tab !== "display",
            })}
          >
            Content 2
          </div>
          <div
            className={cn("animate__animated animate__faster", {
              ["animate__fadeIn"]: tab === "role",
              ["animate__fadeOut hidden"]: tab !== "role",
            })}
          >
            <div className="grid grid-cols-4 gap-4 items-center">
              <div className="col-span-1">General Module</div>
              <div className="col-span-3">
                <div className="flex gap-2 justify-between  px-2 py-2 ">
                  <div className="flex gap-1 flex-col items-center ">
                    <label>Create</label>
                    <CheckboxInput value={false} />
                  </div>
                  <div className="flex gap-1 flex-col items-center ">
                    <label>Read</label>
                    <CheckboxInput value={false} />
                  </div>
                  <div className="flex gap-1 flex-col items-center ">
                    <label>Update</label>
                    <CheckboxInput value={false} />
                  </div>
                  <div className="flex gap-1 flex-col items-center ">
                    <label>Delete</label>
                    <CheckboxInput value={false} />
                  </div>
                </div>
              </div>
              <div className="col-span-4">
                <div className="h-0.5 bg-indigo-600/20" />
              </div>
              <div className="col-span-1">Danh mục </div>
              <div className="col-span-3">
                <div className="flex gap-2 justify-between  px-2 py-2 ">
                  <div className="flex gap-1 flex-col items-center ">
                    <label>Create</label>
                    <CheckboxInput value={false} />
                  </div>
                  <div className="flex gap-1 flex-col items-center ">
                    <label>Read</label>
                    <CheckboxInput value={false} />
                  </div>
                  <div className="flex gap-1 flex-col items-center ">
                    <label>Update</label>
                    <CheckboxInput value={false} />
                  </div>
                  <div className="flex gap-1 flex-col items-center ">
                    <label>Delete</label>
                    <CheckboxInput value={false} />
                  </div>
                </div>
              </div>

              <div className="col-span-4">
                <div className="h-0.5 bg-indigo-600/20" />
              </div>
              <div className="col-span-1">Thống kê</div>
              <div className="col-span-3">
                <div className="flex gap-2 justify-between  px-2 py-2 ">
                  <div className="flex gap-1 flex-col items-center ">
                    <label>Create</label>
                    <CheckboxInput value={false} />
                  </div>
                  <div className="flex gap-1 flex-col items-center ">
                    <label>Read</label>
                    <CheckboxInput value={false} />
                  </div>
                  <div className="flex gap-1 flex-col items-center ">
                    <label>Update</label>
                    <CheckboxInput value={false} />
                  </div>
                  <div className="flex gap-1 flex-col items-center ">
                    <label>Delete</label>
                    <CheckboxInput value={false} />
                  </div>
                </div>
              </div>

              <div className="col-span-4">
                <div className="h-0.5 bg-indigo-600/20" />
              </div>
              <div className="col-span-1">Quản lý</div>
              <div className="col-span-3">
                <div className="flex gap-2 justify-between  px-2 py-2 ">
                  <div className="flex gap-1 flex-col items-center ">
                    <label>Create</label>
                    <CheckboxInput value={false} />
                  </div>
                  <div className="flex gap-1 flex-col items-center ">
                    <label>Read</label>
                    <CheckboxInput value={false} />
                  </div>
                  <div className="flex gap-1 flex-col items-center ">
                    <label>Update</label>
                    <CheckboxInput value={false} />
                  </div>
                  <div className="flex gap-1 flex-col items-center ">
                    <label>Delete</label>
                    <CheckboxInput value={false} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div> */}
        <TMTab
          active="general"
          items={[
            {
              label: "General",
              value: "general",
              content: <div>Content 1</div>,
            },
            {
              label: "Payment",
              value: "payment",
              content: (
                <Suspense fallback={<div>Loading...</div>}>
                  <Payment />
                </Suspense>
              ),
            },
            {
              label: "Role",
              value: "role",
              content: <div>Content 3</div>,
            },
          ]}
        />
      </CardItem>
    </div>
  );
}
export function ErrorBoundary() {
  return <ErrorComponent />;
}
