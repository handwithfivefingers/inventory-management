import { zodResolver } from "@hookform/resolvers/zod";
import type { MetaFunction } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { categoryService } from "~/action.server/category.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { FormInput } from "~/components/form/formInput";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { useSubmitPromise } from "~/hooks";
import { getSessionValues } from "~/sessions";
export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function CategoryItem() {
  return (
    <div className="w-full flex flex-col p-2 gap-4">
      <CardItem title="Danh mục" className="p-4">
        <CategoryForm />
      </CardItem>
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
    console.log("submit", v);
    const resp = await submit(
      {
        data: JSON.stringify(v),
      },
      {
        method: "POST",
        action: ".",
      }
    );
    console.log("resp", resp);
  };
  return (
    <FormProvider {...formMethods}>
      <form
        className="py-2 grid grid-cols-12 gap-4"
        onSubmit={formMethods.handleSubmit(onSubmit, (error) => handleError(error))}
      >
        <div className="col-span-12">
          {/* <Controller
            name="name"
            control={formMethods.control}
            render={({ field }) => {
              return (
                <TextInput
                  label="Tên danh mục"
                  value={field.value as any}
                  onChange={(e: EventTarget | MouseEvent | any) => field.onChange(e.target.value)}
                />
              );
            }}
          /> */}
          <FormInput name="name">
            <TextInput label="Tên danh mục" />
          </FormInput>
        </div>
        <div className="ml-auto col-span-12">
          <TMButton htmlType="submit" variant="light">
            Thêm
          </TMButton>
        </div>
      </form>
    </FormProvider>
  );
};
export const action = async ({ request }: any) => {
  console.log("action");
  const cookie = request.headers.get("Cookie") as string;
  const { vendorId } = await getSessionValues(cookie);
  const formData = await request.formData();
  const data = await formData.get("data");
  console.log("data", data);
  const dataJson = JSON.parse(data);
  dataJson.vendorId = vendorId;
  const resp = await categoryService.create({ ...dataJson, cookie });
  // return resp;
  return resp;
};
export function ErrorBoundary() {
  return <ErrorComponent />;
}
