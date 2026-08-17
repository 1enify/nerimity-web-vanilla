import type { ExpressionPickerProps } from "./ExpressionPicker";

export const ExpressionPickerLazy = async (opts: ExpressionPickerProps) => {
  const { createExpressionPicker } = await import("./ExpressionPicker");
  createExpressionPicker(opts);
};
