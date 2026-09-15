import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { NumberInput } from "~/components/form/number-input";

describe("NumberInput", () => {
  it("never forwards the DOM onChange (formatted display text) to the parent", () => {
    const domOnChange = vi.fn();
    const onValueChange = vi.fn();
    render(<NumberInput value={"" as any} onChange={domOnChange} onValueChange={onValueChange} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "20,000" } });
    // The RHF-style DOM handler must not receive the formatted string...
    expect(domOnChange).not.toHaveBeenCalled();
    // ...the only writer is onValueChange with the raw numeric value
    expect(onValueChange).toHaveBeenCalled();
    const lastValues = onValueChange.mock.calls.at(-1)?.[0];
    expect(lastValues.value).toBe("20000");
    expect(lastValues.floatValue).toBe(20000);
  });
});
