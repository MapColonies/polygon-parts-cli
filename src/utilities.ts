export const getErrorMessage = (err: unknown): string => {
    let message: string | undefined;
    if (err instanceof Error) message = err.message;
    else if (typeof err === 'string') message = err;
    else message = String(err);
    return message;
}
