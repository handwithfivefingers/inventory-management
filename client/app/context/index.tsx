import React, { createContext } from "react";

const AppContent = createContext({});

interface IAppProvider {
  children: React.ReactNode;
  data: any;
}
export const AppProvider = ({ children, data }: IAppProvider) => {
  return <AppContent.Provider value={{}}>{children}</AppContent.Provider>;
};
