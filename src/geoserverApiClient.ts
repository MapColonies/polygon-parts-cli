import axios, { HttpStatusCode } from "axios";

export class GeoserverApiClient {
  private readonly geoserverApiUrl: string;
  public constructor(serviceUrl: string) {
    this.geoserverApiUrl = serviceUrl;
  }

  public async postFeatureType(
    name: string,
    nativeName: string,
  ): Promise<void> {
    try {
      await axios.post(
        `${this.geoserverApiUrl}/featureTypes/polygonParts/polygonParts`,
        {
          name,
          nativeName,
        },
      );
    } catch (e) {
      throw e;
    }
  }

  public async findFeatureType(layerName: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.geoserverApiUrl}/featureTypes/polygonParts/polygonParts/${layerName}`,
      );
      return response.status === HttpStatusCode.Ok;
    } catch (e) {
      if ((e as any).status === 404) {
        return false;
      }
      throw e;
    }
  }
}
