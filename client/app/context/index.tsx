import { c } from "node_modules/vite/dist/node/types.d-aGj9QkWt";
import React, { createContext, useEffect, useState } from "react";
import { Navigate, useFetcher, useLocation, useNavigate, useParams } from "react-router-dom";
import { useVendor } from "~/store/vendor.store";
import { useWarehouse } from "~/store/warehouse.store";
import { BaseProps } from "~/types/common";

const AppContent = createContext({});

interface IAppProvider {
  children: React.ReactNode;
  // vendors?: any[];
  // warehouses?: any[];
  // isLogin: boolean;
  data: any;
}
export const AppProvider = ({ children, data }: IAppProvider) => {
  // const { defaultActive, updateVendor, activeVendor } = useVendor();
  // const { warehouse, updateWarehouse } = useWarehouse();
  // const fetcher = useFetcher();
  const location = useLocation();
  const navigate = useNavigate();
  // useEffect(() => {
  //   if (vendors) {
  //     updateVendor(vendors);
  //     activeVendor(vendors[0]);
  //   }
  // }, [vendors]);
  // useEffect(() => {
  //   if (warehouses?.[0]) {
  //     updateWarehouse(warehouses[0]);
  //   }
  // }, [warehouses]);
  // useEffect(() => {
  //   if (warehouse?.id) {
  //     fetcher.submit({ warehouse: warehouse.id }, { method: "POST", action: "/api/storage?/storageWarehouse" });
  //   }
  // }, [warehouse]);

  // useEffect(() => {
  //   if (defaultActive?.id) {
  //     fetcher.submit({ vendor: defaultActive.id }, { method: "POST", action: "/api/storage?/storageVendor" });
  //   }
  // }, [defaultActive]);

  return <AppContent.Provider value={{}}>{children}</AppContent.Provider>;
};
