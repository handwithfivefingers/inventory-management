import React, { useEffect, useRef, useState } from "react";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";
import { TMModal } from "~/components/tm-modal";
import { BaseProps } from "~/types/common";

interface IInputUpload extends BaseProps {
  onChange?: (file: File, files: File[]) => void;
  destroyOnUnMount?: boolean;
  values?: File[];
}
export const InputUpload = (props: IInputUpload) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [show, setShow] = useState(false);
  const [fileInformation, setFileInformation] = useState<File | undefined>(undefined);
  const handleUploadTarget = () => {
    inputRef.current?.click();
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileInformation(e.target.files![0]);
  };
  useEffect(() => {
    if (props.destroyOnUnMount) {
      return () => {
        setFileInformation(undefined);
      };
    }
  }, []);
  return (
    <div className="flex gap-2">
      <TMButton variant="light" onClick={() => setShow(!show)}>
        {props.children}
      </TMButton>
      <input type="file" className="hidden" ref={inputRef} onChange={handleChange} accept={".xlsx,.xls,.csv"} />

      <TMModal open={show} width={400} close={() => setShow(false)}>
        <div className="flex flex-col gap-2 w-full ">
          <div
            onClick={handleUploadTarget}
            className="px-4 py-12 border border-dashed rounded-md bg-neutral-100/50 w-full cursor-pointer max-w-[400px] mt-6 "
          >
            {!fileInformation ? (
              <div className="flex justify-center gap-2 flex-col items-center text-indigo-800/80 w-full">
                <Icon name="file-plus" />
                <span>Upload file here</span>
              </div>
            ) : (
              <div className="flex justify-center gap-2 flex-col  text-indigo-800/80 w-full">
                <span>Name: {fileInformation.name}</span>
                <span>Size:{(fileInformation.size / 1024 / 1024).toFixed(2)} Mb</span>
              </div>
            )}
          </div>
          <div className="ml-auto">
            <TMButton variant="light" htmlType="button" onClick={() => props.onChange?.(fileInformation!, [])}>
              Submit
            </TMButton>
          </div>
        </div>
      </TMModal>
    </div>
  );
};
