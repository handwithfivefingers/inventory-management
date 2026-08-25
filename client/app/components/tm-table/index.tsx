import { cn } from "~/libs/utils";
import styles from "./styles.module.scss";
import { Icon } from "../icon";
interface ICol {
  title: string;
  dataIndex: string;
  render?: (record: any, index?: number) => React.ReactNode;
  width?: number | string;
  className?: string;
}

interface IRow {
  columns: ICol[];
  data: any;
  onClick?: (record: any) => void;
  index?: number;
}
interface ITMTable {
  columns: ICol[];
  data: Record<string, any>[];
  rowKey: string;
  onRow?: {
    onClick?: (record: IRow["data"]) => void;
  };
  children?: React.ReactNode;
  scrollable?: boolean;
  className?: string;
}

export const TMTable = ({ columns, data, rowKey, onRow, children, scrollable, className }: ITMTable) => {
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
      <div className="relative rounded-md h-full flex flex-col">
        {/* Single scroll container wraps BOTH header and body, so they always
            scroll together horizontally. The header itself is position:sticky
            so it stays pinned when scrolling vertically. */}
        <div
          className={cn("shadow-sm flex-1 min-h-0", {
            ["overflow-auto"]: scrollable,
            ["overflow-hidden"]: !scrollable,
          })}
          style={{
            scrollbarWidth: "thin",
          }}
        >
          <table className={cn("border-collapse table-fixed w-full text-sm w-max min-w-full", className)}>
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
TMTable.Header = ({ columns }: { columns: ICol[] }) => {
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
TMTable.Row = ({ columns, data, onClick, index }: IRow) => {
  const handleCellClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    if (onClick) {
      return onClick?.(data);
    }
  };
  return (
    <tr onClick={handleCellClick} className={cn("cursor-pointer group", styles.row)}>
      {columns.map((item, i) => {
        return (
          <TMTable.Cell className={cn(styles.cell, item.className)} key={`cell_${i}`} style={{ width: item.width }}>
            {item?.render ? item?.render(data, index) : data?.[item?.dataIndex]}
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
