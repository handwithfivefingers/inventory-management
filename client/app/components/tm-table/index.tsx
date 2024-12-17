import { cn } from "~/libs/utils";
import styles from "./styles.module.scss";
import { Icon } from "../icon";
interface ICol {
  title: string;
  dataIndex: string;
  render?: (record: any, index: number) => React.ReactNode;
  width?: number | string;
}

interface IRow {
  columns: ICol[];
  data: any;
  onClick?: (record: any) => void;
}
interface ITMTable {
  columns: ICol[];
  data: Record<string, any>[];
  rowKey: string;
  onRow?: {
    onClick?: (record: IRow["data"]) => void;
  };
  children?: React.ReactNode;
}

export const TMTable = ({ columns, data, rowKey, onRow, children }: ITMTable) => {
  const isEmpty = !children && !data?.length;

  return (
    <div className="not-prose relative bg-slate-100 rounded-md overflow-hidden dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600">
      <div
        className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]"
        style={{
          backgroundPosition: "10px 10px",
        }}
      />
      <div className="relative rounded-md overflow-auto">
        <div className="shadow-sm overflow-hidden mt-4 ">
          <table className="border-collapse table-fixed w-full text-sm">
            <TMTable.Header columns={columns} />
            <tbody className="bg-white dark:bg-slate-800">
              {isEmpty && (
                <tr>
                  <td colSpan={columns?.length || 1}>
                    <div className="flex flex-col items-center justify-center py-8 ">
                      <Icon name="server" className="text-indigo-900" />
                      <p className="text-indigo-900">Chưa có data</p>
                    </div>
                  </td>
                </tr>
              )}
              {children
                ? children
                : data?.map((item, i) => (
                    <TMTable.Row columns={columns} data={item} key={`row_${rowKey}_${i}`} onClick={onRow?.onClick} />
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
            className="border-b dark:border-slate-600 font-medium p-4 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left"
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
TMTable.Row = ({ columns, data, onClick }: IRow) => {
  const handleCellClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    if (onClick) {
      return onClick?.(data);
    }
  };
  return (
    <tr onClick={handleCellClick} className={cn("cursor-pointer group", styles.row)}>
      {columns.map((item, i) => {
        return (
          <TMTable.Cell className={styles.cell} key={`cell_${i}`}>
            {item?.render ? item?.render(data, i) : data?.[item?.dataIndex]}
          </TMTable.Cell>
        );
      })}
    </tr>
  );
};

TMTable.Cell = ({ children, className }: any) => {
  return (
    <td
      className={cn(
        " dark:border-slate-600 p-4 text-slate-500 dark:text-slate-400 group-hover:bg-slate-100 transition-all",
        className
      )}
    >
      {children}
    </td>
  );
};
