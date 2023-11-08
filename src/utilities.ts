export const getErrorMessage = (err: unknown): string => {
    let message: string | undefined;
    if (err instanceof Error) message = err.message;
    else if (typeof err === 'string') message = err;
    else message = String(err);
    return message;
}

// type guards
export const isPartOf = <T extends Record<PropertyKey, string | number>>(key: PropertyKey, map: T): key is keyof T => {
    return key in map;
}

export const isInArray = <T extends string>(value: string, array: Readonly<Array<T>>): value is T => {
    return !!array.find(item => item === value);
}

export const hasProps = <T extends { [P in K]?: any }, K extends keyof T>(obj: T, ...keys: K[]): obj is Required<T> => {
    return keys.every(key => obj[key] !== undefined)
}
