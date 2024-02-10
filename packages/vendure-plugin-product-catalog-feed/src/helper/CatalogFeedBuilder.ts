import { create } from "xmlbuilder2";
import { XMLBuilder, XMLBuilderCreateOptions } from "xmlbuilder2/lib/interfaces";

export type FeedOptions = {
    title: string;
    link: string;
    description?: string;
}

export type AvailabilityFeedField = 'in_stock' | 'out_of_stock' | 'preorder' | 'backorder'

export type FeedProduct = {
    id: string;
    title: string;
    description: string;
    link: string;
    imageLink?: string;
    price: number;
    currency: string;
    availability: AvailabilityFeedField
  };

export class CatalogFeedBuilder {
    private root: XMLBuilder;
    private options: FeedOptions;
    
    constructor(feedOptions: FeedOptions, options: XMLBuilderCreateOptions = {}){
        this.options = feedOptions
        this.root = create({version: "1.0", ...options})

        const rssEl = this.root.ele("rss");
        rssEl.att("xmlns:g", "http://base.google.com/ns/1.0");
        rssEl.att("version", "2.0");

        const channelEl = rssEl.ele("channel");
        channelEl.ele("title").txt(feedOptions.title);
        channelEl.ele("link").txt(feedOptions.link);

        if(feedOptions.description) {
            channelEl.ele("description").txt(feedOptions.description);
        }
    }

    addProduct(product: FeedProduct) {
        const channelNode = this.root.first().first()
        const item = channelNode.ele("item");

        item.ele("g:id").txt(product.id);
        item.ele("g:title").txt(product.title);
        item.ele("g:description").txt(product.description);

        item.ele("g:link").txt(`${this.options.link}/${product.link}`);

        if (product.imageLink) {
          item.ele("g:image_link").txt(product.imageLink);
        }

        item.ele("g:price").txt(`${product.price / 100} ${product.currency}`);
        item.ele("g:availability").txt(product.availability);
    }

    xml() {
        return this.root.end({ prettyPrint: true });
    }

    toString() {
        return this.root.toString()
    }
}