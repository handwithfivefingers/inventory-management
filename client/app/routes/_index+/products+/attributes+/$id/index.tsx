import { zodResolver } from "@hookform/resolvers/zod";
import { ActionFunctionArgs, json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { namedAction } from "remix-utils/named-action";
import { z } from "zod";
import { productAttributeService } from "~/action.server/productAttribute.service";
import { productService } from "~/action.server/products.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { FormControl } from "~/components/form/form-control";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";
import { TMTable } from "~/components/tm-table";
import { useSubmitPromise } from "~/hooks";
import { useTranslation } from "~/i18n";
import { dayjs } from "~/libs/date";
import { parseCookieFromRequest } from "~/sessions";

const attributeNameSchema = z.object({
  name: z.string().min(1, "Tên không được trống"),
});

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { cookie, vendorId } = await parseCookieFromRequest(request);
  const { id } = params;
  if (!id) throw new Error("Missing id");
  const attrResp = await productAttributeService.getAttributeById({ attributeId: id, cookie, vendorId });
  const attr = (attrResp.data as any)?.data || attrResp.data;
  let products: any[] = [];
  try {
    const prodResp = await productAttributeService.getAttributeProducts({ attributeId: id, cookie, vendorId });
    products = (prodResp.data as any)?.data || [];
  } catch {}
  return { data: attr, products };
};

export const meta: MetaFunction = () => [{ title: "Chi tiết thuộc tính" }];

export default function AttributeDetail() {
  const { data } = useLoaderData<typeof loader>();
  const [edit, setEdit] = useState(false);
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
          {!edit ? <Detail /> : <AttributeNameForm id={data?.id} name={data?.name} />}
        </CardItem>

        {edit ? <AttributeValuesSection attributeId={data?.id} values={data?.values || []} /> : <ProductsSection />}
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
          {
            title: "Ngày tạo",
            dataIndex: "createdAt",
            render: (r: any) => (r.createdAt ? dayjs(r.createdAt).format("DD/MM/YYYY") : "—"),
          },
        ]}
        data={products || []}
        rowKey="id"
        onRow={{ onClick: (record: any) => navigate(`/products/${record?.id}`) }}
      />
      {(!products || products.length === 0) && (
        <p className="text-sm text-slate-400 mt-2">Chưa có sản phẩm nào sử dụng thuộc tính này</p>
      )}
    </CardItem>
  );
};

// Section 1: modify attribute (independent submit)
const AttributeNameForm = ({ name, id }: { name: string; id: number | string }) => {
  const { submit, isLoading } = useSubmitPromise();
  const formMethods = useForm<z.infer<typeof attributeNameSchema>>({
    defaultValues: { name: "" },
    values: { name: name || "" },
    resolver: zodResolver(attributeNameSchema),
  });

  const onSubmit = (v: z.infer<typeof attributeNameSchema>) => {
    submit({ intent: "updateAttribute", name: v.name.trim() }, { method: "POST" });
  };

  return (
    <FormProvider {...formMethods}>
      <form onSubmit={formMethods.handleSubmit(onSubmit)} className="flex flex-col gap-5 mt-2">
        <FormControl name="name">
          {(field) => (
            <TextInput
              label="Tên thuộc tính"
              required
              value={field.value as any}
              onChange={(e: any) => field.onChange(e.target.value)}
              prefix={<Icon name="tag" fontSize={16} className="text-slate-400" />}
              disabled={isLoading}
            />
          )}
        </FormControl>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-1">
          <TMButton variant="ghost" size="sm" component={Link} to=".." type="button" disabled={isLoading}>
            Hủy
          </TMButton>
          <TMButton htmlType="submit" size="sm" loading={isLoading} disabled={isLoading}>
            <Icon name="save" fontSize={16} /> Lưu thuộc tính
          </TMButton>
        </div>
      </form>
    </FormProvider>
  );
};

// Section 2: modify attribute values with Create / Update / Remove (separate submits)
const AttributeValuesSection = ({
  attributeId,
  values,
}: {
  attributeId: number | string;
  values: { id: number; value: string }[];
}) => {
  // Use loader data to stay in sync after fetcher revalidation
  const loaderData = useLoaderData<typeof loader>();
  const liveValues = (loaderData?.data?.values as { id: number; value: string }[]) || values;

  return (
    <CardItem
      title={
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Giá trị thuộc tính</h3>
          <span className="text-xs text-slate-400">{liveValues.length} giá trị</span>
        </div>
      }
      className="p-5 sm:p-6"
    >
      <div className="flex flex-col gap-4">
        {liveValues.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có giá trị nào. Thêm giá trị mới bên dưới.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {liveValues.map((v) => (
              <AttributeValueRow key={v.id} value={v} />
            ))}
          </div>
        )}

        <div className="border-t border-slate-100 dark:border-slate-700 pt-4 mt-1">
          <CreateValueForm />
        </div>
      </div>
    </CardItem>
  );
};

const AttributeValueRow = ({ value }: { value: { id: number; value: string } }) => {
  const { submit, isLoading } = useSubmitPromise();
  const [localValue, setLocalValue] = useState(value.value);
  const isDirty = localValue.trim() !== value.value;
  const isEmpty = !localValue.trim();
  useEffect(() => {
    setLocalValue(value.value);
  }, [value.value]);

  const handleUpdate = () => {
    if (isEmpty || !isDirty) return;
    submit({ intent: "updateValue", valueId: String(value.id), value: localValue.trim() }, { method: "POST" });
  };

  const handleDelete = () => {
    if (!confirm(`Xóa giá trị "${value.value}"? Hành động này sẽ gỡ giá trị khỏi các biến thể liên quan.`)) return;
    submit({ intent: "deleteValue", valueId: String(value.id) }, { method: "POST" });
  };

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1">
        <TextInput
          label=""
          placeholder="Giá trị"
          value={localValue}
          onChange={(e: any) => setLocalValue(e.target.value)}
          prefix={<Icon name="tag" fontSize={14} className="text-slate-400" />}
          disabled={isLoading}
        />
      </div>
      <TMButton
        size="sm"
        variant="primary"
        onClick={handleUpdate}
        disabled={!isDirty || isEmpty || isLoading}
        loading={isLoading}
        title={isDirty ? "Cập nhật" : "Chưa thay đổi"}
      >
        <Icon name="save" fontSize={14} />
        Cập nhật
      </TMButton>
      <TMButton
        size="sm"
        variant="ghost"
        onClick={handleDelete}
        disabled={isLoading}
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
        title="Xóa"
      >
        <Icon name="trash-2" fontSize={14} />
        Xóa
      </TMButton>
    </div>
  );
};

const CreateValueForm = () => {
  const { submit, isLoading } = useSubmitPromise();
  const [newValue, setNewValue] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newValue.trim();
    if (!trimmed) return;
    submit({ intent: "createValue", value: trimmed }, { method: "POST" });
  };

  return (
    <form onSubmit={handleCreate} className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Thêm giá trị mới</label>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <TextInput
            label=""
            placeholder="Nhập giá trị mới và nhấn Thêm"
            value={newValue}
            onChange={(e: any) => setNewValue(e.target.value)}
            prefix={<Icon name="plus" fontSize={14} className="text-slate-400" />}
            disabled={isLoading}
          />
        </div>
        <TMButton htmlType="submit" size="sm" loading={isLoading} disabled={!newValue.trim() || isLoading}>
          <Icon name="plus" fontSize={14} /> Thêm
        </TMButton>
      </div>
    </form>
  );
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { cookie, vendorId } = await parseCookieFromRequest(request);
  const formData = await request.formData();
  const { id } = params;
  const actionType = formData.get("intent") as string | null;
  console.log("Action called with intent:", actionType, "params:", params);
  if (!id) throw new Error("Missing id");
  return namedAction(formData, {
    updateAttribute: async () => {
      const name = (formData.get("name") as string)?.trim();
      if (!name) return json({ success: false, error: "Tên không được trống", status: 400 }, { status: 400 });
      const resp = await productAttributeService.updateAttribute({ attributeId: id, cookie, vendorId, name });
      return json({ success: true, data: resp.data, status: resp.status }, { status: resp.status });
    },
    createValue: async () => {
      const singleValue = formData.get("value") as string | null;
      const rawValues = formData.get("values") as string | null;
      let values: string[] = [];
      if (singleValue) values = [singleValue.trim()].filter(Boolean);
      else if (rawValues) {
        try {
          const parsed = JSON.parse(rawValues);
          values = Array.isArray(parsed)
            ? parsed.map((v: any) => String(v).trim()).filter(Boolean)
            : [String(parsed).trim()].filter(Boolean);
        } catch {
          values = String(rawValues)
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
        }
      }
      if (!values.length) {
        return Response.json({ success: false, error: "Giá trị không được trống", status: 400 }, { status: 400 });
      }
      const resp = await productAttributeService.createAttributeValues({ attributeId: id, vendorId, cookie, values });
      return Response.json(
        { success: true, _action: "createValue", data: resp.data, status: resp.status },
        { status: resp.status },
      );
    },
    updateValue: async () => {
      console.log("updateValue action called");
      const valueId = formData.get("valueId") as string;
      const value = (formData.get("value") as string)?.trim();
      if (!valueId) return json({ success: false, error: "Thiếu valueId", status: 400 }, { status: 400 });
      if (!value) return json({ success: false, error: "Giá trị không được trống", status: 400 }, { status: 400 });
      const resp = await productAttributeService.updateAttributeValue({ valueId, vendorId, cookie, value });
      return json({ success: true, data: resp.data, status: resp.status }, { status: resp.status });
    },
    deleteValue: async () => {
      const valueId = formData.get("valueId") as string;
      if (!valueId) return json({ success: false, error: "Thiếu valueId", status: 400 }, { status: 400 });
      const resp = await productAttributeService.deleteAttributeValue({ valueId, vendorId, cookie });
      return json({ success: true, data: resp.data, status: resp.status }, { status: resp.status });
    },
  });
};

export function ErrorBoundary() {
  return <ErrorComponent />;
}
