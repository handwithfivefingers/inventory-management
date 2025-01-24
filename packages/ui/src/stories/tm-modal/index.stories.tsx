import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { TMModal } from ".";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Components/Modal",
  component: TMModal,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: "centered",
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {
    close: fn(),
    // open?: boolean;
    // close?: () => void;
    // maskOnClose?: boolean;
    // width?: number | string;
    // title?: React.ReactNode;
  },
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
} satisfies Meta<typeof TMModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const SampleChildren = () => {
  return <p>Hello world</p>;
};

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Primary: Story = {
  args: {
    open: true,
    close: () => {},
    maskOnClose: true,
    width: 200,
    title: "Sample Title",
    children: <SampleChildren />,
  },
};
