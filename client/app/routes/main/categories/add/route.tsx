import { zodResolver } from "@hookform/resolvers/zod";
import type { MetaFunction } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import { MouseEvent } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { categoriesService } from "~/action.server/categories.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { productSchema } from "~/constants/schema/product";
import { getSession } from "~/sessions";
export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function ProductItem() {
  const fetcher = useFetcher();
  const formMethods = useForm({
    defaultValues: {
      name: "",
      code: "SM-001",
      skuCode: "ASM-0000001",
      quantity: 10,
      unit: undefined,
      categories: undefined,
      description: undefined,
      tags: undefined,
      costPrice: "20000",
      regularPrice: "50000",
      salePrice: "45000",
      wholeSalePrice: "40000",
      VAT: 5,
      expiredAt: undefined,
    },
    resolver: zodResolver(productSchema),
  });

  const handleError = (errors: any) => {
    console.log("errors", errors);
  };
  const onSubmit = (v: any): void => {
    fetcher.submit(
      {
        data: JSON.stringify({
          data: v,
        }),
      },
      { method: "POST", action: "/products/add" }
    );
  };

  console.log("fetcher", fetcher);
  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <CardItem title="Danh mục">
        <CategoryForm />
      </CardItem>
    </div>
  );
}

const CategoryForm = () => {
  const fetcher = useFetcher();
  const formMethods = useForm({
    defaultValues: {
      name: "",
    },
    resolver: zodResolver(productSchema),
  });

  const handleError = (errors: any) => {
    console.log("errors", errors);
  };
  const onSubmit = (v: any): void => {
    fetcher.submit(
      {
        data: JSON.stringify({
          data: v,
        }),
      },
      { method: "POST", action: "/categories/add" }
    );
  };
  return (
    <FormProvider {...formMethods}>
      <form
        className="py-2 grid grid-cols-12 gap-4"
        onSubmit={formMethods.handleSubmit(
          (v) => onSubmit({ ...v }),
          (error) => handleError(error)
        )}
      >
        <div className="col-span-12">
          <Controller
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
          />
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
  const session = await getSession(request.headers.get("Cookie"));
  const vendor = session.get("vendor");
  const formData = await request.formData();
  const data = await formData.get("data");
  const dataJson = JSON.parse(data);
  const bodyData = { ...dataJson.data, vendorId: vendor };
  const resp = await categoriesService.create(bodyData);
  return resp;
};
export function ErrorBoundary() {
  return <ErrorComponent />;
}
