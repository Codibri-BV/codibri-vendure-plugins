import { AvailableStock, Channel, ProductVariant } from "@vendure/core";
import { Writable } from "stream";
import { createCB } from "xmlbuilder2";
import { XMLBuilderCB } from "xmlbuilder2/lib/interfaces";
import {
  ProductCatalogFeedOutputFactory,
  ProductCatalogFeedStrategy,
  ProductCatalogFeedStrategyOptions,
} from "./../types";
import { BaseProductCatalogFeedStrategy } from "./base-product-catalog-feed-strategy";

export const googleCatalogFeed: ProductCatalogFeedOutputFactory = (
  channel: Channel,
  options: ProductCatalogFeedStrategyOptions
) => {
  return new GoogleProductCatalogFeedStrategy(channel, options);
};

export class GoogleProductCatalogFeedStrategy
  extends BaseProductCatalogFeedStrategy
  implements ProductCatalogFeedStrategy
{
  private xml: XMLBuilderCB;

  private getAvailabiltiy(variant: ProductVariant, stock: AvailableStock) {
    if (variant.trackInventory === "TRUE") {
      stock.stockOnHand > 1
          ? "in_stock"
          : "out_of_stock";
      
    }
     
    return "in_stock"
  }

  create(file: Writable) {
    const xml = createCB({
      data: (text: string) => {
        file.write(text);
      },
      prettyPrint: true,
    });

    xml.on("end", () => {
      file.end();
    });

    const root = xml.dec({ version: "1.0" });

    const rssEl = root
      .ele("rss")
      .att("xmlns:g", "http://base.google.com/ns/1.0")
      .att("version", "2.0");

    const channelEle = rssEl.ele("channel");

    channelEle.ele("title").txt(`${this.channel.code} product catelog`).up();
    channelEle
      .ele("link")
      .txt(this.channel.customFields.productCatalogShopUrl || "")
      .up();
    channelEle
      .ele("description")
      .txt(`All products for ${this.channel.code}`)
      .up();

    this.xml = channelEle;
  }

  addProduct(variant: ProductVariant, stock: AvailableStock): void {
    const item = this.xml.ele("item");

    item.ele("g:id").txt(variant.sku).up();
    item.ele("g:title").txt(variant.name).up();
    item.ele("g:description").txt(variant.product.description).up();

    item.ele("g:link").txt(this.getProductUrl(variant)).up();

    const asset = variant.featuredAsset ?? variant.product.featuredAsset
    if (asset) {
      item
        .ele("g:image_link")
        .txt(this.getAssetUrl(asset.preview))
        .up();
    }

    item
      .ele("g:price")
      .txt(`${variant.priceWithTax / 100} ${variant.currencyCode}`)
      .up();

    const availablability = this.getAvailabiltiy(variant, stock)
    
    item.ele("g:availability").txt(availablability).up();

    item.up();
  }

  end() {
    this.xml.end();
  }
}
