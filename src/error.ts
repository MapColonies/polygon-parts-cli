import type { Field } from "./types";

export class CSVHeaderValidationError extends Error {
    constructor(private readonly field: Field | string, private readonly errMessage: string) {
        super();
        this.message = this.formatError();
    }

    private formatError = (): string => {
        return `Failed validation of headers "${this.field}" -- ${this.errMessage}`;
    };
}

export class CSVContentValidationError extends Error {
    constructor(private readonly field: Field, private readonly errMessage: string, private readonly rowNumber: number, private readonly optionalData?: string) {
        super();
        this.message = this.formatError();
    }

    private formatError = (): string => {
        return `Failed validation of field "${this.field}" at row ${this.rowNumber} -- ${this.errMessage}${this.optionalData ?? ''}`;
    };
}

export class DBError extends Error {
    constructor(private readonly errMessage: string, private readonly rowNumber: number) {
        super();
        this.message = this.formatError();
    }

    private formatError = (): string => {
        return `Failed processing polygon part at row ${this.rowNumber} -- ${this.errMessage}`;
    };
}
