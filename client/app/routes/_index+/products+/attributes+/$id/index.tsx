import { zodResolver } from "@hookform/resolvers/zod";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, redirect, useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { productService } from "~/action.server/products.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { FormControl } from "~/components/form/form-control";
import { CreatableTagInput } from "~/components/form/creatable-tag-input";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";
import { TMTable } from "~/components/tm-table";
import { useTranslation } from "~/i18n";
import { dayjs } from "~/libs/date";
import { parseCookieFromRequest } from "~/sessions";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { cookie, vendorId } = await parseCookieFromRequest(request);
  const { id } = params;
  if (!id) throw new Error("Missing id");
  const attrResp = await productService.getAttributeById({ attributeId: id, cookie, vendorId });
  const attr = (attrResp.data as any)?.data || attrResp.data;
  let products: any[] = [];
  try {
    const prodResp = await productService.getAttributeProducts({ attributeId: id, cookie, vendorId });
    products = (prodResp.data as any)?.data || [];
  } catch {}
  return { data: attr, products };
};

export const meta: MetaFunction = () => [{ title: "Chi tiết thuộc tính" }];

export default function AttributeDetail() {
  const { data } = useLoaderData<typeof loader>();
  const [edit, setEdit] = useState(false);
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
      <div className="max-w-3xl w-full mx-auto flex flex-col gap-4">
        <CardItem
          title={
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                  <Icon name="sliders" fontSize={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                    {edit ? "Chỉnh sửa thuộc tính" : data?.name}
                  </h2>
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                    {edit ? "Cập nhật thông tin thuộc tính" : "Chi tiết thuộc tính và sản phẩm liên quan"}
                  </p>
                </div>
              </div>
              <TMButton variant={edit ? "ghost" : "primary"} size="sm" onClick={() => setEdit(!edit)}>
                <Icon name={edit ? "x" : "edit-2"} fontSize={14} />
                {edit ? "Hủy" : "Sửa"}
              </TMButton>
            </div>
          }
          className="p-5 sm:p-6"
        >
          {!edit ? <Detail /> : <EditForm {...data} />}
        </CardItem>

        {!edit && <ProductsSection />}
      </div>
    </div>
  );
}

const Detail = () => {
  const { data } = useLoaderData<typeof loader>();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1">
        <span className="text-sm text-slate-500 mr-2">Giá trị:</span>
        {(data?.values || []).map((v: any) => (
          <span key={v.id} className="bg-slate-100 rounded px-2 py-0.5 text-xs">
            {v.value}
          </span>
        ))}
        {(!data?.values || data.values.length === 0) && <span className="text-xs text-slate-400">Chưa có giá trị</span>}
      </div>
    </div>
  );
};

const ProductsSection = () => {
  const { products } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <CardItem title={<h3 className="font-medium">Sản phẩm sử dụng thuộc tính này</h3>} className="p-5 sm:p-6">
      <TMTable
        columns={[
          { title: t("product.product") || "Tên sản phẩm", dataIndex: "name", render: (r: any) => r.name },
          { title: "Mã SKU", dataIndex: "skuCode", render: (r: any) => r.skuCode || "—" },
          { title: "Ngày tạo", dataIndex: "createdAt", render: (r: any) => (r.createdAt ? dayjs(r.createdAt).format("DD/MM/YYYY") : "—") },
        ]}
        data={products || []}
        rowKey="id"
        onRow={{ onClick: (record: any) => navigate(`/products/${record?.id}`) }}
      />
      {(!products || products.length === 0) && <p className="text-sm text-slate-400 mt-2">Chưa có sản phẩm nào sử dụng thuộc tính này</p>}
    </CardItem>
  );
};

const editSchema = z.object({
  name: z.string().min(1),
  values: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
});

const EditForm = ({ name, id, values }: any) => {
  const fetcher = useFetcher();
  const initialValues = (values || []).map((v: any) => ({ label: v.value, value: v.value }));
  const formMethods = useForm({
    defaultValues: { name: "", values: [] as any[] },
    values: { name, values: initialValues },
    resolver: zodResolver(editSchema),
  });

  const onSubmit = (v: any) => {
    fetcher.submit(
      { data: JSON.stringify({ data: { name: v.name, values: v.values.map((o: any) => o.value) }, id }) },
      { method: "POST", action: `/products/attributes/${id}` },
    );
  };

  return (
    <FormProvider {...formMethods}>
      <form onSubmit={formMethods.handleSubmit(onSubmit)} className="flex flex-col gap-5 mt-2">
        <FormControl name="name">
          {(field) => <TextInput label="Tên thuộc tính" required value={field.value as any} onChange={(e: any) => field.onChange(e.target.value)} prefix={<Icon name="tag" fontSize={16} className="text-slate-400" />} />}
        </FormControl>
        <FormControl name="values">
          {(field) => (
            <CreatableTagInput
              label="Giá trị"
              value={(field.value as any) || []}
              options={[]}
              onChange={(next) => field.onChange(next)}
              placeholder="Nhập giá trị và Enter"
            />
          )}
        </FormControl>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-1">
          <TMButton variant="ghost" size="sm" component={Link} to=".." type="button">
            Hủy
          </TMButton>
          <TMButton htmlType="submit" size="sm">
            <Icon name="save" fontSize={16} /> Lưu
          </TMButton>
        </div>
      </form>
    </FormProvider>
  );
};

export const action = async ({ request, params }: any) => {
  const { cookie, vendorId } = await parseCookieFromRequest(request);
  const formData = await request.formData();
  const { id } = params;
  const actionType = formData.get("_action");
  if (actionType === "createValues") {
    const raw = formData.get("values") as string;
    const values = raw ? JSON.parse(raw) : [];
    const resp = await productService.createAttributeValues({ attributeId: id, cookie, values });
    return Response.json(resp, { status: resp.status });
  }
  const data = await formData.get("data");
  const dataJson = JSON.parse(data as string);
  const body = { ...dataJson.data, vendorId };
  const resp = await productService.updateAttribute({ attributeId: id, cookie, ...body });
  if (resp.status === 200) return redirect(`/products/attributes`, 302);
  return resp;
};

export function ErrorBoundary() {
  return <ErrorComponent />;
}
