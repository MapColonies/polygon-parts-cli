import axios from "axios";
import { PolygonPartsPayload } from "./interfaces";

export class PolygonPartsManagerClient {
  private readonly polygonPartsManagerServiceUrl: string;
  public constructor(serviceUrl: string) {
    this.polygonPartsManagerServiceUrl = serviceUrl;
  }

  public async insert(payload: PolygonPartsPayload): Promise<void> {
    try {
      await axios.post(`${this.polygonPartsManagerServiceUrl}/polygonParts`, {
        ...payload,
      });
      console.log(`finished pp insert on ${payload.catalogId}`);
    } catch (e) {
      if ((e as any).status === 504) {
        await new Promise((resolve) => setTimeout(resolve, 120000));
        return;
      }
      throw e;
    }
  }
}
