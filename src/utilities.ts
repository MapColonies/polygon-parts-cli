import type { ExtractItem } from "./types";

export const getErrorMessage = (err: unknown): string => {
  let message: string | undefined;
  if (err instanceof Error) message = err.message;
  else if (typeof err === "string") message = err;
  else message = String(err);
  return message;
};

export const isInArray = <T extends string>(
  value: string,
  array: Readonly<Array<T>>,
): value is T => {
  return !!array.find((item) => item === value);
};

export const getValue = <T extends any[], K extends number | undefined>(
  row: T,
  field: K,
): ExtractItem<T, K, null> => {
  let value: any | null;
  if (field === undefined) value = null;
  else value = row.at(field);
  if (value === undefined)
    throw new RangeError("Field was not found in the row");
  return value;
};
