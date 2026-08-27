import { cn } from "~/libs/utils";
import { Icon } from "../icon";
import { Loader } from "../loader";
import styles from "./styles.module.scss";
interface ICol<T> {
  title: React.ReactNode;
  dataIndex: string;
  render?: (record: T, index?: number) => React.ReactNode;
  width?: number | string;
  className?: string;
}

interface IRow<T extends object> {
  columns: ICol<T>[];
  data: T;
  onClick?: (record: T) => void;
  index?: number;
}
interface ITMTable<T> {
  columns: ICol<T>[];
  data: T[];
  rowKey: string;
  onRow?: {
    onClick?: (record: T) => void;
  };
  children?: React.ReactNode;
  scrollable?: boolean;
  className?: string;
  loading?: boolean;
}

export const TMTable = <T extends object>({
  columns,
  data,
  rowKey,
  onRow,
  children,
  scrollable,
  className,
  loading,
}: ITMTable<T>) => {
  const isEmpty = !children && !data?.length;
  return (
    <div
      className={cn(
        "relative bg-slate-100 w-full h-full rounded-md overflow-hidden dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600",
      )}
    >
      <div
        className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]"
        style={{
          backgroundPosition: "10px 10px",
        }}
      />
      {loading && <Loader />}
      <div className="relative rounded-md h-full flex flex-col">
        <div
          className={cn("shadow-sm flex-1 min-h-0", {
            ["overflow-auto"]: scrollable,
            ["overflow-hidden"]: !scrollable,
          })}
          style={{
            scrollbarWidth: "thin",
          }}
        >
          <table className={cn("border-collapse table-fixed text-sm w-max min-w-full", className)}>
            <TMTable.Header columns={columns} />
            <tbody className="bg-white dark:bg-slate-800">
              {isEmpty && (
                <tr>
                  <td colSpan={columns?.length || 1} className="h-full">
                    <div className="flex flex-col items-center justify-center py-8 ">
                      <Icon name="server" className="text-indigo-900 dark:text-slate-200" />
                      <p className="text-indigo-900 dark:text-slate-200">Chưa có data</p>
                    </div>
                  </td>
                </tr>
              )}
              {children
                ? children
                : data?.map((item, i) => (
                    <TMTable.Row
                      columns={columns}
                      data={item}
                      key={`row_${rowKey}_${i}`}
                      onClick={onRow?.onClick}
                      index={i}
                    />
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
TMTable.Header = <T extends object>({ columns }: { columns: ICol<T>[] }) => {
  return (
    <thead>
      <tr>
        {columns?.map((col, i) => (
          <th
            key={`header-${i}`}
            className={cn(
              "sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-600 font-medium p-4 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left py-3",
              col.className,
            )}
            style={{
              width: col.width,
            }}
          >
            {col.title}
          </th>
        ))}
      </tr>
    </thead>
  );
};
TMTable.Row = <T extends object>({ columns, data, onClick, index }: IRow<T>) => {
  const handleCellClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    if (onClick) {
      return onClick?.(data as T);
    }
  };
  return (
    <tr onClick={handleCellClick} className={cn("cursor-pointer group", styles.row)}>
      {columns.map((item, i) => {
        return (
          <TMTable.Cell className={cn(styles.cell, item.className)} key={`cell_${i}`} style={{ width: item.width }}>
            {item?.render ? item?.render(data as T, index) : (data as T)?.[item?.dataIndex as keyof T]}
          </TMTable.Cell>
        );
      })}
    </tr>
  );
};

TMTable.Cell = ({ children, className, style }: any) => {
  return (
    <td
      className={cn(
        " dark:border-slate-600 p-4 text-slate-500 dark:text-slate-400 group-hover:bg-slate-100 transition-all",
        className,
      )}
      style={style}
    >
      {children}
    </td>
  );
};
