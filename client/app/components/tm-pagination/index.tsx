import React, { useCallback } from "react";
import { TMButton } from "../tm-button";
import { cn } from "~/libs/utils";

interface IPagination {
  total: number | string;
  page?: number | string;
  current?: number | string;
  pageSize: number | string;
  onChange?: (page: number) => void;
  onPageChange?: (page: number) => void;
}
export const TMPagination = ({ total, current, page, pageSize, onChange, onPageChange }: IPagination) => {
  const currentPage = Number(page || current || 1);
  const handlePageChange = (page: number) => {
    onChange?.(page);
    onPageChange?.(page);
  };
  const totalPage = Math.ceil(Number(total) / Number(pageSize));
  const generatePagination = useCallback(() => {
    const pagination = [];
    // Always include the first page
    pagination.push({
      label: 1,
      onClick: () => handlePageChange(1),
    });

    // Add `...` if there's a gap between 1 and the first visible range
    if (currentPage - 2 > 2) {
      pagination.push({
        label: "...",
      });
    }

    // Add pages around the current page
    for (let i = Math.max(2, currentPage - 2); i <= Math.min(totalPage - 1, currentPage + 2); i++) {
      //   pagination.push(i);
      pagination.push({
        label: i,
        onClick: () => handlePageChange(i),
      });
    }

    // Add `...` if there's a gap between the last visible range and the last page
    if (currentPage + 2 < totalPage - 1) {
      pagination.push({
        label: "...",
      });
    }

    // Always include the last page
    if (totalPage > 1) {
      pagination.push({
        label: totalPage,
        onClick: () => handlePageChange(totalPage),
      });
    }

    return pagination;
  }, [currentPage, totalPage]);

  const currentSize = +(current || 1) * +pageSize > +total ? +total : +(current || 1) * +pageSize;
  return (
    <div className="flex gap-1 items-center">
      {generatePagination().map((paginationItem, index) => (
        <div key={index}>
          <TMButton
            size="sm"
            onClick={paginationItem.onClick}
            className={cn("px-3 py-1", {
              "text-white bg-indigo-300 rounded": paginationItem.label === current,
            })}
          >
            {paginationItem.label}
          </TMButton>
        </div>
      ))}
      <span className="text-xs mx-4">
        Show {currentSize} / {total}
      </span>
    </div>
  );
};
