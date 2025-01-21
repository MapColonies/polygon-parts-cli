import axios from "axios";
import { LayerInfo } from "./interfaces";
import { NotFoundError } from "@map-colonies/error-types";

export class RasterCatalogManagerClient {
  private readonly rasterCatalogClientUrl: string;
  public constructor(serviceUrl: string) {
    this.rasterCatalogClientUrl = serviceUrl;
  }

  public async getLayer(productId: string): Promise<LayerInfo> {
    let layers;
    try {
      const response = await axios.post<LayerInfo[]>(
        `${this.rasterCatalogClientUrl}/records/find`,
        { id: productId },
      );
      layers = response.data;
      if (layers.length === 0) {
        throw new NotFoundError(
          `Could not find catalog layer with id: ${productId}`,
        );
      }
      return layers[0];
    } catch (error) {
      throw error;
    }
  }
}
