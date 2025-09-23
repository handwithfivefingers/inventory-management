import { zodResolver } from "@hookform/resolvers/zod";
import type { MetaFunction } from "@remix-run/node";
import { FormProvider, useForm } from "react-hook-form";
import { tagsService } from "~/action.server/tags.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { FormInput } from "~/components/form/formInput";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { ITagSchema, tagSchema } from "~/constants/schema/tag";
import { useSubmitPromise } from "~/hooks";
import { parseCookieFromRequest } from "~/sessions";
export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function ProductItem() {
  return (
    <div className=" w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem title="Thẻ" className="p-4 h-full">
        <CategoryForm />
      </CardItem>
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
        className="py-2 grid grid-cols-12 gap-4"
        onSubmit={formMethods.handleSubmit(onSubmit, (error) => handleError(error))}
      >
        <div className="col-span-12">
          <FormInput name="name">
            <TextInput label="Tên thẻ" />
          </FormInput>
        </div>
        <div className="ml-auto col-span-12">
          <TMButton htmlType="submit" variant="light" loading={isLoading}>
            Thêm
          </TMButton>
        </div>
      </form>
    </FormProvider>
  );
};
export const action = async ({ request }: any) => {
  const { cookie, vendorId } = await parseCookieFromRequest(request);
  const formData = await request.formData();
  const data = (await formData.get("data")) as `${string}`;
  const dataJson: { name: string } = JSON.parse(data);
  const bodyData = { ...dataJson, vendorId: vendorId, cookie };
  const resp = await tagsService.create(bodyData);
  return resp;
};
export function ErrorBoundary() {
  return <ErrorComponent />;
}
