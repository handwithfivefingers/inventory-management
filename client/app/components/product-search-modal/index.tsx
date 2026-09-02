import { useEffect } from "react";
import { NumericFormat } from "react-number-format";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";
import { TMModal } from "~/components/tm-modal";
import { TMTable } from "~/components/tm-table";
import { IProduct } from "~/types/product";

interface Props {
  show: boolean;
  close: () => void;
  onSelect: (product: IProduct) => void;
  data: IProduct[];
  onSearch: (value: string) => void;
}
export const ProductSearchModal = ({ data, show, close, onSelect, onSearch }: Props) => {
  return (
    <TMModal open={show} close={close} width={600}>
      <div className="flex flex-col gap-2 w-full  ">
        <div className="py-4">
          <TextInput
            prefix={<Icon name="search" className="w-4" />}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearch(e.target.value)}
          />
        </div>
        <div className="max-h-[50vh] overflow-auto">
          <TMTable
            scrollable
            columns={[
              {
                title: "Hình ảnh",
                dataIndex: "image",
                render: () => <img src="https://placehold.co/60" />,
                width: 100,
              },
              { title: "Tên sản phẩm", dataIndex: "name" },
              {
                title: "Giá tiền",
                dataIndex: "regularPrice",
                render: (record) => (
                  <NumericFormat value={record.regularPrice} thousandSeparator="," displayType="text" />
                ),
              },
              {
                title: "Action",
                dataIndex: "action",
                width: 110,
                render: (record) => (
                  <TMButton onClick={() => onSelect(record)} variant="light">
                    Chọn
                  </TMButton>
                ),
              },
            ]}
            data={data}
            rowKey="id"
          />
        </div>
      </div>
    </TMModal>
  );
};
