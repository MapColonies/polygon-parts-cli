import { DataSource } from "./types";

export class CSVValidationError extends Error {
    constructor(private readonly field: DataSource, private readonly lineNumber: number, private readonly errMessage: string, private readonly optionalData?: string) {
        super();
        this.message = this.formatError();
    }

    private formatError = (): string => {
        return `Failed validation of field "${this.field}" in line ${this.lineNumber} -- ${this.errMessage}${this.optionalData ?? ''}`;
    };
}
