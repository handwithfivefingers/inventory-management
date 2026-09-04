import { ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { Link, useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { productService } from "~/action.server/products.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { PermissionGuard } from "~/components/permission-guard";
import { TMButton } from "~/components/tm-button";
import { TMPagination } from "~/components/tm-pagination";
import { TMTable } from "~/components/tm-table";
import { MODULE_ENUM } from "~/constants/modules";
import { useTranslation } from "~/i18n";
import { dayjs } from "~/libs/date";
import { debounce } from "~/libs/debounce";
import { parseCookieFromRequest } from "~/sessions";
import { IProduct } from "~/types/product";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { cookie, vendorId } = await parseCookieFromRequest(request);
  const url = new URL(request.url);
  const params = url.searchParams;
  const page = params.get("page") || "1";
  const pageSize = params.get("pageSize") || "10";
  const s = params.get("s") || "";
  const resp = await productService.getProducts({
    vendorId,
    page,
    pageSize,
    cookie,
    s,
  });
  return {
    data: resp.data?.data,
    total: resp.data?.total,
    s,
    page,
    pageSize,
  };
};

export const meta: MetaFunction = () => {
  return [{ title: "Sản phẩm" }, { name: "description", content: "Quản lý sản phẩm" }];
};

export default function Products() {
  const navigate = useNavigate();
  const { data, total: currentTotal, page: defaultPage, pageSize: defaultPageSize, s } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const fetcher = useFetcher<{
    data: IProduct[];
    total: number;
    page: string;
    pageSize: string;
    s: string;
  }>();
  const isLoading = fetcher.state === "submitting" || fetcher.state === "loading";
  console.log(`fetcher`, fetcher);
  const handleImportUpload = (file: File) => {
    alert("Function not build yet");
    // const form = new FormData();
    // form.append("products", file);
    // if (warehouse?.id) {
    //   form.append("warehouse", warehouse?.id as any);
    // }
    // fetch("http://localhost:3001/api/products/import", {
    //   method: "POST",
    //   body: form,
    // });
  };
  const products = fetcher.data?.data || data || [];
  const total = fetcher.data?.total || currentTotal || 0;
  const query = fetcher?.data?.s || s || "";
  const pageSize = Number(fetcher?.data?.pageSize || defaultPageSize || 10);
  const page = Number(fetcher?.data?.page || defaultPage || 1);
  return (
    <div className=" w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem
        title={
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                <Icon name="package" fontSize={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                  {t("sidebar.products")}
                </h2>
                {/* <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">{t("orders.titleHint")}</p> */}
              </div>
            </div>
          </div>
        }
        action={
          <div className="ml-auto block my-auto">
            <div className="flex gap-2 flex-wrap flex-row">
              <PermissionGuard permission="READ" module={MODULE_ENUM.product} requireAdmin>
                <TMButton component={Link} to={"./add"} size="sm">
                  <Icon name="plus" fontSize={16} />
                  <span>{t("common.add")}</span>
                </TMButton>
              </PermissionGuard>
              <PermissionGuard permission="READ" module={MODULE_ENUM.product} requireAdmin>
                <TMButton component={Link} to={"./add"} size="sm">
                  <Icon name="file-plus" fontSize={16} />
                  <span>{t("common.importExcel")}</span>
                </TMButton>
              </PermissionGuard>
              <PermissionGuard permission="READ" module={MODULE_ENUM.product} requireAdmin>
                <TMButton component={Link} to={"./add"} size="sm">
                  <Icon name="file-text" fontSize={16} />
                  <span>{t("common.exportExcel")}</span>
                </TMButton>
              </PermissionGuard>
              <PermissionGuard permission="READ" module={MODULE_ENUM.product} requireAdmin>
                <TMButton component={Link} to={"./add"} size="sm">
                  <Icon name="bar-chart-2" fontSize={16} />
                  <span>{t("common.printBarcode")}</span>
                </TMButton>
              </PermissionGuard>
            </div>
          </div>
        }
        className="flex flex-col w-full rounded-md dark:bg-slate-500 bg-white shadow-2xl shadow-slate-200 gap-2 dark:shadow-slate-600 p-5 sm:p-6 h-full"
      >
        <div className="flex gap-2 flex-col h-full overflow-hidden">
          <div className="flex gap-2 shrink-0">
            <TextInput
              placeholder="Lọc theo mã, tên hàng hóa"
              defaultValue={query}
              onChange={debounce((v) => {
                const value = v.target.value;
                fetcher.load(
                  `/products?${new URLSearchParams({
                    s: value,
                    page: "1",
                    pageSize: String(pageSize),
                  }).toString()}`,
                );
              }, 500)}
            />
          </div>
          <div className="flex gap-2 flex-col items-end animate__animated animate__faster animate__fadeIn flex-1 overflow-auto">
            <TMTable
              loading={isLoading}
              scrollable
              columns={[
                {
                  title: "Tên sản phẩm",
                  dataIndex: "name",
                  render: (record) => record["name"],
                },
                {
                  title: "Mã sản phẩm",
                  dataIndex: "skuCode",
                  render: (record) => record["skuCode"],
                },
                {
                  title: "Tồn kho",
                  dataIndex: "quantity",
                  render: (record) => record["quantity"] || 0,
                },
                {
                  title: "Biến thể",
                  dataIndex: "variantCount",
                  render: (record) =>
                    Number(record.variantCount) > 0 ? (
                      <span className="bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5 text-xs">
                        {record.variantCount} biến thể
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    ),
                },
                {
                  title: "Đã bán",
                  dataIndex: "sold",
                  render: (record) => record["sold"] || 0,
                },
                {
                  title: "Ngày tạo",
                  dataIndex: "createdAt",
                  render: (record) => dayjs(record.createdAt).format("DD/MM/YYYY"),
                },
              ]}
              data={products || []}
              rowKey={"id"}
              onRow={{
                onClick: (record) => navigate(`./${record?.id}`),
              }}
            />
          </div>
          <div className="flex  gap-2 shrink-0">
            <TMPagination
              total={total || 0}
              current={page}
              pageSize={pageSize}
              onPageChange={(page: number) => {
                navigate(`?page=${page}&pageSize=${pageSize}&s=${s}`);
              }}
            />
          </div>
        </div>
      </CardItem>
    </div>
  );
}
export const action = async ({ request }: ActionFunctionArgs) => {
  const { warehouseId, vendorId, cookie } = await parseCookieFromRequest(request);
  const form = await request.formData();
  // Variant listing for the order flow: POST /products with variantOf=<productId>
  const variantOf = form.get("variantOf");
  if (variantOf) {
    return productService.getProductVariants({ id: variantOf as string, cookie, warehouseId, vendorId });
  }
  const s = form.get("s") || "";
  return productService.getProducts({ s: s as string, warehouseId, vendorId, page: "1", pageSize: "10", cookie });
};

export function ErrorBoundary() {
  return <ErrorComponent />;
}
