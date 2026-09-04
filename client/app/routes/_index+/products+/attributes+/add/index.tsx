import { zodResolver } from "@hookform/resolvers/zod";
import type { MetaFunction } from "@remix-run/node";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { Link } from "@remix-run/react";
import { productService } from "~/action.server/products.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { FormControl } from "~/components/form/form-control";
import { CreatableTagInput } from "~/components/form/creatable-tag-input";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { useSubmitPromise } from "~/hooks";
import { useTranslation } from "~/i18n";
import { parseCookieFromRequest } from "~/sessions";
import { productAttributeService } from "~/action.server/productAttribute.service";

export const meta: MetaFunction = () => {
  return [{ title: "Thêm thuộc tính" }, { name: "description", content: "Tạo thuộc tính biến thể" }];
};

export default function AttributeAdd() {
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
      <div className="max-w-3xl w-full mx-auto">
        <CardItem
          title={
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                  <Icon name="sliders" fontSize={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                    {t("product.attributesTitle")}
                  </h2>
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">Thêm thuộc tính mới</p>
                </div>
              </div>
            </div>
          }
          className="p-5 sm:p-6"
        >
          <AttributeForm />
        </CardItem>
      </div>
    </div>
  );
}

const attrSchema = z.object({
  name: z.string().min(1, "Tên không được trống"),
  values: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
});
type AttrSchema = z.infer<typeof attrSchema>;

const AttributeForm = () => {
  const { submit } = useSubmitPromise();
  const { t } = useTranslation();
  const formMethods = useForm<AttrSchema>({
    defaultValues: { name: "", values: [] },
    resolver: zodResolver(attrSchema),
  });

  const onSubmit = async (v: AttrSchema) => {
    try {
      const payload = { name: v.name.trim(), values: v.values.map((o) => o.value) };
      const resp = await submit<{ status: number }>({ data: JSON.stringify(payload) }, { method: "POST", action: "." });
      if (resp.status === 200) return toast.success({ title: "Success", message: "Tạo thuộc tính thành công" });
      throw resp;
    } catch (error: any) {
      return toast.danger({ title: "Error", message: error?.toString() });
    }
  };

  return (
    <FormProvider {...formMethods}>
      <form onSubmit={formMethods.handleSubmit(onSubmit)} className="flex flex-col gap-5 mt-2">
        <FormControl name="name">
          <TextInput
            label={t("product.attributeName")}
            placeholder="VD: Màu sắc, Kích cỡ"
            required
            prefix={<Icon name="tag" fontSize={16} className="text-slate-400" />}
          />
        </FormControl>
        <FormControl name="values">
          {(field) => (
            <CreatableTagInput
              label={t("product.values")}
              value={(field.value as any) || []}
              options={[]}
              onChange={(next) => field.onChange(next)}
              placeholder="Nhập giá trị và Enter, phân cách bằng dấu phẩy"
            />
          )}
        </FormControl>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-1">
          <TMButton variant="ghost" size="sm" component={Link} to="/products/attributes" type="button">
            Hủy
          </TMButton>
          <TMButton htmlType="submit" size="sm">
            <Icon name="save" fontSize={16} /> Thêm
          </TMButton>
        </div>
      </form>
    </FormProvider>
  );
};

export const action = async ({ request }: any) => {
  try {
    const { cookie, vendorId } = await parseCookieFromRequest(request);
    const formData = await request.formData();
    const data = await formData.get("data");
    const payload = JSON.parse(data);
    const resp = await productAttributeService.createAttribute({ ...payload, vendorId, cookie });
    if (resp.status === 200) return Response.json(resp, { status: 200 });
    throw resp;
  } catch (error) {
    return Response.json({ error, status: 400 }, { status: 400 });
  }
};

export function ErrorBoundary() {
  return <ErrorComponent />;
}
