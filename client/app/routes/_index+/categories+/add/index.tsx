import { zodResolver } from "@hookform/resolvers/zod";
import type { MetaFunction } from "@remix-run/node";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { Link } from "@remix-run/react";
import { categoryService } from "~/action.server/category.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { FormControl } from "~/components/form/form-control";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { useSubmitPromise } from "~/hooks";
import { parseCookieFromRequest } from "~/sessions";
export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function CategoryItem() {
  return (
    <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
      <div className="max-w-3xl w-full mx-auto">
        <CardItem
          title={
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                  <Icon name="tag" fontSize={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">Danh mục</h2>
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">Thêm danh mục mới</p>
                </div>
              </div>
            </div>
          }
          className="p-5 sm:p-6"
        >
          <CategoryForm />
        </CardItem>
      </div>
    </div>
  );
}

const cateSchema = z.object({
  name: z.string().min(1),
});
type CateSchema = z.infer<typeof cateSchema>;

const CategoryForm = () => {
  const { submit } = useSubmitPromise();
  const formMethods = useForm({
    defaultValues: {
      name: "",
    },
    resolver: zodResolver(cateSchema),
  });

  const handleError = (errors: any) => {
    console.log("errors", errors);
  };
  const onSubmit = async (v: CateSchema) => {
    try {
      const resp = await submit<{ status: number }>(
        {
          data: JSON.stringify(v),
        },
        {
          method: "POST",
          action: ".",
        },
      );
      if (resp.status === 200) {
        return toast.success({ title: "Success", message: "Create Categories success" });
      }
      throw resp;
    } catch (error) {
      return toast.danger({ title: "Error", message: error?.toString() });
    }
  };
  return (
    <FormProvider {...formMethods}>
      <form onSubmit={formMethods.handleSubmit(onSubmit, (error) => handleError(error))} className="flex flex-col gap-5 mt-2">
        <FormControl name="name">
          <TextInput
            label="Tên danh mục"
            placeholder="Nhập tên danh mục"
            required
            prefix={<Icon name="tag" fontSize={16} className="text-slate-400" />}
          />
        </FormControl>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-1">
          <TMButton variant="ghost" size="sm" component={Link} to="/categories" type="button">
            Hủy
          </TMButton>
          <TMButton htmlType="submit" size="sm">
            <Icon name="save" fontSize={16} />
            Thêm
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
    const dataJson = JSON.parse(data);
    dataJson.vendorId = vendorId;
    const resp = await categoryService.create({ ...dataJson, cookie });
    if (resp.status === 200) {
      return Response.json(resp, { status: 200 });
    }
    throw resp;
  } catch (error) {
    return Response.json({ error, status: 400 }, { status: 400 });
  }
};
export function ErrorBoundary() {
  return <ErrorComponent />;
}
