import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { CheckboxInput } from "~/components/form/checkbox-input";
import { SwitchInput } from "~/components/form/switch-input";

describe("CheckboxInput", () => {
  it("reflects the checked prop (state must be visible, e.g. table row selection)", () => {
    const { rerender } = render(<CheckboxInput checked={false} onChange={() => {}} />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();

    rerender(<CheckboxInput checked onChange={() => {}} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("supports the `value` prop used by FormControl-driven pages", () => {
    render(<CheckboxInput value onChange={() => {}} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("forwards onClick to the wrapper (row-click stopPropagation in tables)", () => {
    const onClick = vi.fn();
    render(<CheckboxInput onClick={onClick} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onClick).toHaveBeenCalled();
  });

  it("emits a native change event with e.target.checked", () => {
    const onChange = vi.fn((e) => e.target.checked);
    render(<CheckboxInput onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveReturnedWith(true);
  });
});

describe("SwitchInput", () => {
  it("renders as a switch (role=switch) and reflects state", () => {
    const { rerender } = render(<SwitchInput value={false} onChange={() => {}} />);
    expect(screen.getByRole("switch")).not.toBeChecked();

    rerender(<SwitchInput checked onChange={() => {}} />);
    expect(screen.getByRole("switch")).toBeChecked();
  });
});
