import axios from "axios";
import { LayerInfo } from "./interfaces";
import { NotFoundError } from "@map-colonies/error-types";
import { LayerMetadata, Link } from "@map-colonies/mc-model-types";

export class RasterCatalogManagerClient {
  private readonly rasterCatalogClientUrl: string;
  private readonly wfsLink: string;
  public constructor(serviceUrl: string, wfsLink: string) {
    this.rasterCatalogClientUrl = serviceUrl;
    this.wfsLink = wfsLink;
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

  public async updateLinks(
    layerInfo: LayerInfo,
    catalogId: string,
  ): Promise<void> {
    try {
      const links = layerInfo.links;
      const avi: Link = {
        name: `${layerInfo.metadata.productId}-${layerInfo.metadata.productType}`,
        protocol: "WFS",
        url: this.wfsLink,
      };
      links.push(avi);
      await axios.put(`${this.rasterCatalogClientUrl}/records/${catalogId}`, {
        metadata: {},
        links,
      });
      console.log(`Links updated for catalogId: ${catalogId}`);
    } catch (error) {
      throw error;
    }
  }
}
