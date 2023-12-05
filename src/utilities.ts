export const getErrorMessage = (err: unknown): string => {
    let message: string | undefined;
    if (err instanceof Error) message = err.message;
    else if (typeof err === 'string') message = err;
    else message = String(err);
    return message;
}

export const isInArray = <T extends string>(value: string, array: Readonly<Array<T>>): value is T => {
    return !!array.find(item => item === value);
}

export type RowValue<T> = T extends Array<infer U> ? U : never;
