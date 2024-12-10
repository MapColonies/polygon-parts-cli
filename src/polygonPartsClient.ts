import axios from "axios";
import { PolygonPartsPayload } from "./interfaces";

export class PolygonPartsManagerClient {
  private readonly polygonPartsManagerServiceUrl: string;
  public constructor(serviceUrl: string) {
    this.polygonPartsManagerServiceUrl = serviceUrl;
  }

  public async insert(payload: PolygonPartsPayload): Promise<void> {
    axios
      .post(`${this.polygonPartsManagerServiceUrl}/polygonParts`, {
        ...payload,
      })
      .catch((error) => {
        console.log(error);
      });
  }
}
