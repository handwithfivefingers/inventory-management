import { cn } from "~/libs/utils";
import styles from "./styles.module.scss";
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
}

export const TMTable = ({ columns, data, rowKey, onRow }: ITMTable) => {
  return (
    <div className="not-prose relative bg-slate-50 rounded-xl overflow-hidden dark:bg-slate-800/25">
      <div
        className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]"
        style={{
          backgroundPosition: "10px 10px",
        }}
      />
      <div className="relative rounded-xl overflow-auto">
        <div className="shadow-sm overflow-hidden my-8">
          <table className="border-collapse table-fixed w-full text-sm">
            <TMTable.Header columns={columns} />
            <tbody className="bg-white dark:bg-slate-800">
              {data?.map((item, i) => (
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
    <tr onClick={handleCellClick} className="cursor-pointer group">
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
        "border-b border-slate-200 dark:border-slate-600 p-4 text-slate-500 dark:text-slate-400 group-hover:backdrop-brightness-200",
        className
      )}
    >
      {children}
    </td>
  );
};
