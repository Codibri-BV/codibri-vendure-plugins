import { CustomChannelFields } from '@vendure/core/dist/entity/custom-entity-fields';

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

export interface ProductCatalogFeedPluginOptions {
    assetUrlPrefix: string;
  }