import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RadioGroup, RadioGroupItem } from "../radio-group";

function renderGroup(onValueChange = vi.fn()) {
  render(
    <RadioGroup defaultValue="a" onValueChange={onValueChange}>
      <RadioGroupItem value="a" id="radio-a" />
      <RadioGroupItem value="b" id="radio-b" />
      <RadioGroupItem value="c" id="radio-c" />
    </RadioGroup>,
  );
  return { onValueChange };
}

describe("RadioGroup selection on focus", () => {
  it("does not change selection on the first focus entering the group", () => {
    const { onValueChange } = renderGroup();
    fireEvent.focusIn(document.querySelector('[value="b"]') as HTMLElement);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("selects the radio that focus moved to from another radio in the group", () => {
    const { onValueChange } = renderGroup();
    const radioA = document.querySelector('[value="a"]') as HTMLElement;
    const radioB = document.querySelector('[value="b"]') as HTMLElement;

    fireEvent.focusIn(radioA);
    fireEvent.focusIn(radioB);

    expect(onValueChange).toHaveBeenCalledWith("b");
  });

  it("does not treat focus after leaving the group as keyboard navigation", () => {
    const { onValueChange } = renderGroup();
    const group = screen.getByRole("radiogroup");
    const radioC = document.querySelector('[value="c"]') as HTMLElement;

    fireEvent.focusIn(document.querySelector('[value="a"]') as HTMLElement);
    fireEvent.focusOut(group, { relatedTarget: null });
    fireEvent.focusIn(radioC);

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("still selects on click", () => {
    const { onValueChange } = renderGroup();
    fireEvent.click(document.querySelector('[value="c"]') as HTMLElement);
    expect(onValueChange).toHaveBeenCalledWith("c");
  });
});
