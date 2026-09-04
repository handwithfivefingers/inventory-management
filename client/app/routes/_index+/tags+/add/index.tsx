import { zodResolver } from "@hookform/resolvers/zod";
import type { MetaFunction } from "@remix-run/node";
import { Link, redirect } from "@remix-run/react";
import { FormProvider, useForm } from "react-hook-form";
import { tagsService } from "~/action.server/tags.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { FormControl } from "~/components/form/form-control";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";
import { ITagSchema, tagSchema } from "~/constants/schema/tag";
import { useSubmitPromise } from "~/hooks";
import { parseCookieFromRequest } from "~/sessions";
export const meta: MetaFunction = () => {
  return [{ title: "Create Tag" }];
};

export default function ProductItem() {
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
                  <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">Thẻ</h2>
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">Thêm thẻ mới</p>
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

const CategoryForm = () => {
  const { submit, isLoading } = useSubmitPromise();
  const formMethods = useForm<ITagSchema>({
    resolver: zodResolver(tagSchema),
  });

  const handleError = (errors: any) => {
    console.log("errors", errors);
  };
  const onSubmit = async (v: ITagSchema) => {
    try {
      const resp = await submit({ data: JSON.stringify(v) }, { method: "POST" });
      console.log("resp", resp);
    } catch (error) {
      console.log("error", error);
    }
  };

  return (
    <FormProvider {...formMethods}>
      <form
        onSubmit={formMethods.handleSubmit(onSubmit, (error) => handleError(error))}
        className="flex flex-col gap-5 mt-2"
      >
        <FormControl name="name">
          <TextInput
            label="Tên thẻ"
            placeholder="Nhập tên thẻ"
            required
            prefix={<Icon name="tag" fontSize={16} className="text-slate-400" />}
          />
        </FormControl>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-1">
          <TMButton variant="ghost" size="sm" component={Link} to="/tags" type="button">
            Hủy
          </TMButton>
          <TMButton htmlType="submit" size="sm" loading={isLoading}>
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
    const data = (await formData.get("data")) as `${string}`;
    const dataJson: { name: string } = JSON.parse(data);
    const bodyData = { ...dataJson, vendorId: vendorId, cookie };
    const resp = await tagsService.create(bodyData);
    if (resp.status === 200) {
      return redirect("/tags");
    }
    throw resp;
  } catch (error) {
    return Response.json({ error, status: 400 }, { status: 400 });
  }
};
export function ErrorBoundary() {
  return <ErrorComponent />;
}
