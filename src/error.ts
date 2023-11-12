import type { Field } from "./types";

export class CSVValidationError extends Error {
    constructor(private readonly field: Field, private readonly errMessage: string, private readonly lineNumber: number, private readonly optionalData?: string) {
        super();
        this.message = this.formatError();
    }

    private formatError = (): string => {
        return `Failed validation of field "${this.field}" in line ${this.lineNumber} -- ${this.errMessage}${this.optionalData ?? ''}`;
    };
}

export class DBError extends Error {
    constructor(private readonly errMessage: string, private readonly lineNumber: number) {
        super();
        this.message = this.formatError();
    }
    
    private formatError = (): string => {
        return `Failed processing polygon part in line ${this.lineNumber} -- ${this.errMessage}`;
    };
}