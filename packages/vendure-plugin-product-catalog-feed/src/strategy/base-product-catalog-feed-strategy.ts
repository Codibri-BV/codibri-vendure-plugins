import { Writable } from "stream";
import {
  ProductCatalogFeedStrategy,
  ProductCatalogFeedStrategyOptions,
} from "../types";
import { AvailableStock, Channel, ProductVariant } from "@vendure/core";

export abstract class BaseProductCatalogFeedStrategy
  implements ProductCatalogFeedStrategy
{
  options: ProductCatalogFeedStrategyOptions;
  channel: Channel;

  constructor(channel: Channel, options: ProductCatalogFeedStrategyOptions) {
    this.channel = channel;
    this.options = options;
  }

  protected getProductUrl(variant: ProductVariant) {
    return this.options.productUrl(
      this.channel.customFields.productCatalogShopUrl?.trim() || "",
      variant
    );
  }

  protected getAssetUrl(asset: string) {
    return `${this.options.assetUrlPrefix.trim()}/${asset}`
  }

  abstract create(file: Writable): void;
  abstract addProduct(variant: ProductVariant, stock: AvailableStock): void;
  abstract end(): void;
}
