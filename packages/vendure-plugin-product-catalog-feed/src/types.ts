import { AvailableStock, Channel, ProductVariant } from '@vendure/core';
import { Writable } from 'stream';

declare module '@vendure/core/dist/entity/custom-entity-fields' {
    interface CustomChannelFields {
        rebuildCatalogFeed: boolean;
        productCatalogXml?: string;
        productCatalogShopUrl?: string;
        productCatalogOutput: 'disabled' | 'url' | 'sftp';
        productCatalogSftpServer?: string;
        productCatalogSftpPort?: number;
        productCatalogSftpUser?: string;
        productCatalogSftpPassword?: string;
    }
}

export type ProductCatalogFeedStrategyOptions = {
    assetUrlPrefix: string;
    productUrl: (shopUrl: string, variant: ProductVariant) => string;
}
export interface ProductCatalogFeedStrategy {
    create(file: Writable): void
    addProduct(variant: ProductVariant, stock: AvailableStock): void
    end(): void
}

export type ProductCatalogFeedOutputFactory = (channel: Channel, options: ProductCatalogFeedStrategyOptions) => ProductCatalogFeedStrategy

export interface ProductCatalogFeedPluginOptions extends ProductCatalogFeedStrategyOptions {
    productCatalogFeedOutputFactory: ProductCatalogFeedOutputFactory
  }