import { create, createCB } from "xmlbuilder2";
import {
  XMLBuilder,
  XMLBuilderCB,
  XMLBuilderCreateOptions,
} from "xmlbuilder2/lib/interfaces";
import { Writable } from "stream";

export type FeedOptions = {
  title: string;
  link: string;
  description?: string;
};

export type AvailabilityFeedField =
  | "in_stock"
  | "out_of_stock"
  | "preorder"
  | "backorder";

export type FeedProduct = {
  id: string;
  title: string;
  description: string;
  link: string;
  imageLink?: string;
  price: number;
  currency: string;
  availability: AvailabilityFeedField;
};

export class CatalogFeedBuilder {
  private xml: XMLBuilderCB;
  private options: FeedOptions;

  constructor(
    file: Writable,
    feedOptions: FeedOptions,
    options: XMLBuilderCreateOptions = {}
  ) {
    this.options = feedOptions;
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
    channelEle.ele("title").txt(feedOptions.title).up();
    channelEle.ele("link").txt(feedOptions.link).up();

    if (feedOptions.description) {
      channelEle.ele("description").txt(feedOptions.description).up();
    }

    this.xml = channelEle;
  }

  addProduct(product: FeedProduct) {
    const item = this.xml.ele("item");

    item.ele("g:id").txt(product.id).up();
    item.ele("g:title").txt(product.title).up();
    item.ele("g:description").txt(product.description).up();

    item.ele("g:link").txt(`${this.options.link}/${product.link}`).up();

    if (product.imageLink) {
      item.ele("g:image_link").txt(product.imageLink).up();
    }

    item.ele("g:price").txt(`${product.price / 100} ${product.currency}`).up();
    item.ele("g:availability").txt(product.availability).up();

    item.up()
  }

  end() {
    this.xml.end();
  }
}
