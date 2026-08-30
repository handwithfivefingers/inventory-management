import { zodResolver } from "@hookform/resolvers/zod";
import type { MetaFunction } from "@remix-run/node";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { categoryService } from "~/action.server/category.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { FormControl } from "~/components/form/form-control";
import { TextInput } from "~/components/form/text-input";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { useSubmitPromise } from "~/hooks";
import { parseCookieFromRequest } from "~/sessions";
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
          <FormControl name="name">
            <TextInput label="Tên danh mục" />
          </FormControl>
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
