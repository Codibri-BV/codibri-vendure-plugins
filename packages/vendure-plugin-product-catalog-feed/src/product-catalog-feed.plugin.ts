import path from 'path';
import { AdminUiExtension } from '@vendure/ui-devkit/compiler';
import {
  EventBus,
  LanguageCode,
  PluginCommonModule,
  ProductEvent,
  ProductVariantEvent,
  VendurePlugin,
} from "@vendure/core";
import { ProductCatalogFeedService } from "./service/product-catalog-feed.service";
import "./types";
import { ProductCatalogController } from "./api/product-catalog.controller";
import { ProductCatalogFeedPluginOptions } from "./types";
import { PLUGIN_INIT_OPTIONS, productCatalogFeedPerm } from "./constants";
import { adminApiExtensions } from "./api/api-extentions";
import { ProductCatalogAdminResolver } from "./api/product-catalog.admin.resolver";

@VendurePlugin({
  imports: [PluginCommonModule],
  adminApiExtensions: {
    schema: adminApiExtensions,
    resolvers: [ProductCatalogAdminResolver]
  },
  providers: [
    ProductCatalogFeedService,
    {
      provide: PLUGIN_INIT_OPTIONS,
      useFactory: () => ProductCatalogFeedPlugin.options,
    },
  ],
  controllers: [ProductCatalogController],
  compatibility: ">2.0.0",
  configuration: (config) => {
    config.authOptions.customPermissions.push(productCatalogFeedPerm);

    config.customFields.Channel.push({
      type: "string",
      name: "productCatalogShopUrl",
      label: [
        {
          languageCode: LanguageCode.en,
          value: "Shop URL",
        },
      ],
      public: false,
      ui: { tab: "Product Catalog" },
    });

    config.customFields.Channel.push({
      type: "string",
      name: "productCatalogOutput",
      label: [
        {
          languageCode: LanguageCode.en,
          value: "Product catalog",
        },
      ],
      options: [
        {
          value: "disabled",
          label: [{ languageCode: LanguageCode.en, value: "Disabled" }],
        },
        {
          value: "url",
          label: [{ languageCode: LanguageCode.en, value: "URL" }],
        },
        {
          value: "sftp",
          label: [{ languageCode: LanguageCode.en, value: "SFTP" }],
        },
      ],
      defaultValue: "disabled",
      public: false,
      ui: { tab: "Product Catalog" },
    });

    config.customFields.Channel.push({
      type: "string",
      name: "productCatalogSftpServer",
      label: [
        {
          languageCode: LanguageCode.en,
          value: "SFTP server",
        },
      ],
      public: false,
      ui: { tab: "Product Catalog" },
    });

    config.customFields.Channel.push({
      type: "int",
      name: "productCatalogSftpPort",
      min: 1,
      max: 65535,
      label: [
        {
          languageCode: LanguageCode.en,
          value: "SFTP port",
        },
      ],
      defaultValue: 22,
      public: false,
      ui: { tab: "Product Catalog" },
    });

    config.customFields.Channel.push({
      type: "string",
      name: "productCatalogSftpUser",
      label: [
        {
          languageCode: LanguageCode.en,
          value: "SFTP user",
        },
      ],
      public: false,
      ui: { tab: "Product Catalog" },
    });

    config.customFields.Channel.push({
      type: "string",
      name: "productCatalogSftpPassword",
      label: [
        {
          languageCode: LanguageCode.en,
          value: "SFTP password",
        },
      ],
      public: false,
      ui: { tab: "Product Catalog", component: "password-form-input" },
    });

    config.customFields.Channel.push({
      type: "boolean",
      name: "rebuildCatalogFeed",
      defaultValue: false,
      internal: true,
    });
    config.customFields.Channel.push({
      type: "string",
      name: "productCatalogXml",
      internal: true,
    });

    return config;
  },
})
export class ProductCatalogFeedPlugin {
  static options: ProductCatalogFeedPluginOptions;

  static init(
    options: Pick<ProductCatalogFeedPluginOptions, 'vendureHost'> & Partial<ProductCatalogFeedPluginOptions>
  ): typeof ProductCatalogFeedPlugin {
    this.options = {outputInterval: '0 0 * * *',  ...options};
    return ProductCatalogFeedPlugin;
  }

  static ui: AdminUiExtension = {
    id: 'product-catalog-feed-extentions',
    extensionPath: path.join(__dirname, 'ui'),
    ngModules: [
      {
        type: "shared",
        ngModuleFileName: "product-catalog-feed.module.ts",
        ngModuleName: "ProductCatalogFeedModule",
      },
    ],
  };

  constructor(
    private eventBus: EventBus,
    private productCatalogFeedService: ProductCatalogFeedService
  ) {}

  async onApplicationBootstrap() {
    this.productCatalogFeedService.startProductFeed();

    this.eventBus.ofType(ProductEvent).subscribe(async (event) => {
      return this.productCatalogFeedService.markChannelForRebuild(event.ctx);
    });

    this.eventBus.ofType(ProductVariantEvent).subscribe((event) => {
      return this.productCatalogFeedService.markChannelForRebuild(event.ctx);
    });
  }
}
