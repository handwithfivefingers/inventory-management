import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { productAttributeService } from "~/action.server/productAttribute.service";
import { productService } from "~/action.server/products.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";
import { TMTable } from "~/components/tm-table";
import { useTranslation } from "~/i18n";
import { parseCookieFromRequest } from "~/sessions";

export const meta: MetaFunction = () => {
  return [{ title: "Thuộc tính sản phẩm" }, { name: "description", content: "Quản lý thuộc tính biến thể" }];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { cookie, vendorId } = await parseCookieFromRequest(request);
  if (!cookie) throw new Error("Unauthorized");
  const resp = await productAttributeService.getAttributes({ cookie, vendorId });
  return { data: (resp.data as any)?.data || (resp.data as any)?.rows || [] };
};

export default function ProductAttributes() {
  const { data } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem
        title={
          <div className="flex gap-3">
            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
              <Icon name="sliders" fontSize={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                {t("product.attributesTitle")}
              </h2>
              <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                {t("product.attributesTitle")}
              </p>
            </div>
          </div>
        }
        action={
          <TMButton size="sm" component={Link} to="/products/attributes/add">
            <Icon name="plus" fontSize={14} />
            {t("common.add")}
          </TMButton>
        }
        className="flex flex-col w-full rounded-md dark:bg-slate-500 bg-white shadow-2xl shadow-slate-200 gap-2 dark:shadow-slate-600 p-5 sm:p-6 h-full"
      >
        <div className="flex gap-2 flex-col h-full overflow-hidden">
          <TMTable
            scrollable
            columns={[
              {
                title: t("product.attributeName"),
                dataIndex: "name",
                render: (r) => r.name,
              },
              {
                title: t("product.values"),
                dataIndex: "values",
                render: (r) => (
                  <div className="flex flex-wrap gap-1">
                    {(r.values || []).map((v: any) => (
                      <span key={v.id} className="bg-slate-100 rounded px-1.5 py-0.5 text-xs">
                        {v.value}
                      </span>
                    ))}
                  </div>
                ),
              },
            ]}
            data={data as any}
            rowKey="id"
            onRow={{
              onClick: (record: any) => navigate(`/products/attributes/${record?.id}`),
            }}
          />
        </div>
      </CardItem>
    </div>
  );
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}
