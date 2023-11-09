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
