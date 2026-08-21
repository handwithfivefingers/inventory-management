import React from "react";
import { Form, FormProvider, useForm } from "react-hook-form";
import { FormControl } from "~/components/form/form-control";
import { SelectInput } from "~/components/form/select-input";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { BANKS, CURRENCY } from "~/constants/banks";

export const Payment = () => {
  const formMethod = useForm({
    defaultValues: {
      merchant_name: "Truyền Mai",
      accountNumber: "TRUYENMAI",
      bankCode: "970436",
      currency: "704",
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <div>
        <h5 className="text-indigo-800 font-semibold text-lg">Cài đặt tài khoản ngân hàng</h5>
      </div>
      <FormProvider {...formMethod}>
        <form className="w-96 flex flex-col gap-2">
          <FormControl name="merchant_name">
            {(field) => {
              return <TextInput {...field} label="Tên tài khoản" />;
            }}
          </FormControl>
          <FormControl name="accountNumber">
            {(field) => {
              return <TextInput {...field} label="Số tài khoản" />;
            }}
          </FormControl>
          <FormControl name="bankCode">
            {(field) => {
              return (
                <SelectInput
                  label="Ngân hàng"
                  options={BANKS.data.map((bank) => {
                    return {
                      label: (
                        <div className="flex gap-2">
                          <div className="w-7 h-7 relative flex-shrink-0">
                            <span className="pb-[100%] block" />
                            <img
                              className="absolute top-0 left-0 w-full h-full object-contain bg-slate-200 rounded-md"
                              src={bank.logo}
                            />
                          </div>
                          <div className="flex flex-col">
                            <p className="text-xs flex gap-0.5">
                              <span className="font-bold">{bank.code}</span>
                              <span>-</span>
                              <span className="text-xs flex gap-0.5">{bank.short_name}</span>
                            </p>
                            <p className="text-xs">{bank.name}</p>
                          </div>
                        </div>
                      ),
                      value: bank.bin,
                    };
                  })}
                  onSelect={(v) => field.onChange(v)}
                  value={field.value}
                />
              );
            }}
          </FormControl>
          <FormControl name="currency">
            {(field) => {
              return (
                <SelectInput
                  label="Đơn vị tiền"
                  options={CURRENCY.map((cur) => {
                    return {
                      label: (
                        <div className="flex gap-2">
                          <div className="flex flex-col">
                            <p className="text-xs flex gap-0.5">
                              <span className="font-bold">{cur.value}</span>
                              <span>-</span>
                              <span className="text-xs flex gap-0.5">{cur.unit}</span>
                            </p>
                          </div>
                        </div>
                      ),
                      value: cur.value,
                    };
                  })}
                  onSelect={(v) => field.onChange(v)}
                  value={field.value}
                />
              );
            }}
          </FormControl>

          <TMButton type="submit">Lưu lại</TMButton>
        </form>
      </FormProvider>
    </div>
  );
};
