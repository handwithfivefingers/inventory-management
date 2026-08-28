import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { productService } from "~/action.server/products.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { TMTable } from "~/components/tm-table";
import { useTranslation } from "~/i18n";
import { parseCookieFromRequest } from "~/sessions";

export const meta: MetaFunction = () => {
  return [{ title: "Thuộc tính sản phẩm" }, { name: "description", content: "Quản lý thuộc tính biến thể" }];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { cookie, vendorId } = await parseCookieFromRequest(request);
  if (!cookie) throw new Error("Unauthorized");
  const resp = await productService.getAttributes({ cookie, vendorId });
  return { data: resp.data?.data || [] };
};

export default function ProductAttributes() {
  const { data } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem title={t("product.attributesTitle")} className="p-4 h-full">
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
              {
                title: t("product.product"),
                dataIndex: "product",
                render: (r) => r.product?.name || "—",
              },
              {
                title: t("product.sku"),
                dataIndex: "skuCode",
                render: (r) => r.product?.skuCode || "—",
              },
            ]}
            data={data as any}
            rowKey="id"
            onRow={{
              onClick: (record: any) => record?.productId && navigate(`/products/${record.productId}`),
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
