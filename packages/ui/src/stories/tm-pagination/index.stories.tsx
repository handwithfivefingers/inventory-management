import type { Meta, StoryFn, StoryObj } from "@storybook/react";
import { TMPagination } from ".";
import { useState } from "react";
import { fn } from "@storybook/test";

type PagePropsAndCustomArgs = React.ComponentProps<typeof TMPagination>;

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta: Meta<PagePropsAndCustomArgs> = {
  title: "Components/Pagination",
  component: TMPagination,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    onPageChange: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof TMPagination>;

export const Primary: Story = {
  args: {
    total: 49,
    current: 1,
    pageSize: 10,
  },
  render: (props) => {
    const [pagination, setPagination] = useState<any>(props);
    const handleChange = (page: number) => {
      setPagination((prev: any) => ({ ...prev, current: page }));
    };
    return (
      <div>
        <TMPagination {...pagination} onPageChange={handleChange} />
      </div>
    );
  },
};
