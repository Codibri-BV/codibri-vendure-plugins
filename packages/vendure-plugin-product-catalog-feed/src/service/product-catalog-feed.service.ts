import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import {
  Channel,
  ConfigService,
  EntityHydrator,
  ID,
  JobQueue,
  JobQueueService,
  Logger,
  ProductVariantService,
  RequestContext,
  RequestContextService,
  TransactionalConnection
} from "@vendure/core";
import { CronJob } from "cron";
import Client from "ssh2-sftp-client";
import { PLUGIN_INIT_OPTIONS, loggerCtx } from "../constants";
import { CatalogFeedBuilder, FeedProduct } from "../helper/CatalogFeedBuilder";
import { ProductCatalogFeedPluginOptions } from "../types";

@Injectable()
export class ProductCatalogFeedService implements OnModuleInit {
  private jobQueue: JobQueue<{ channelId: ID }>;
  private cron: CronJob<() => void>;
  private sftpClient: Client;

  constructor(
    @Inject(PLUGIN_INIT_OPTIONS) private options: ProductCatalogFeedPluginOptions,
    private jobQueueService: JobQueueService,
    private productVariantService: ProductVariantService,
    private entityHydrator: EntityHydrator,
    private connection: TransactionalConnection,
    private requestContextService: RequestContextService,
    private configService: ConfigService
  ) {
    this.sftpClient = new Client();
  }

  async onModuleInit() {
    this.jobQueue = await this.jobQueueService.createQueue({
      name: "product-catalog-feed",
      process: async (job) => {
        return this.buildChannelFeed(job.data.channelId);
      },
    });

    this.cron = new CronJob(this.options.outputInterval, () => {
      return this.buildAllFeeds();
    });
  }

  async markChannelForRebuild(ctx: RequestContext) {
    const channel = ctx.channel;

    if (channel.customFields.productCatalogOutput == "disabled") {
      return;
    }

    const rebuildCatalogFeed = channel.customFields.rebuildCatalogFeed;

    if (!rebuildCatalogFeed) {
      Logger.info(
        `Mark channel (ID: ${channel.id} ) for rebduilding product feed`
      );
      channel.customFields.rebuildCatalogFeed = true;
      await this.connection.getRepository(ctx, Channel).save(channel);
    }
  }

  async startProductFeed() {
    this.buildAllFeeds();
    this.cron.start();
  }

  buildXML(products: FeedProduct[], channel: Channel) {
    const feed = new CatalogFeedBuilder({
      title: `${channel.code} product catelog`,
      link: channel.customFields.productCatalogShopUrl || "",
      description: `All products for ${channel.code}`,
    });

    products.map(async (product) => {
      feed.addProduct(product);
    });

    return feed.xml();
  }

  async buildAllFeeds() {
    Logger.verbose('Checking channels to build', loggerCtx)
    
    const channels = await this.connection.rawConnection
      .getRepository(Channel)
      .find();

    channels.map((channel) => {
      if (channel.customFields.rebuildCatalogFeed) {
        this.jobQueue.add({ channelId: channel.id });
      }
    });
  }

  async buildChannelFeed(channelId: ID) {
    const channel = await this.connection.rawConnection
      .getRepository(Channel)
      .findOneOrFail({
        where: { id: channelId },
        relations: ["defaultTaxZone"],
      });

    const ctx = await this.requestContextService.create({
      apiType: "custom",
      channelOrToken: channel,
    });

    const variants = await this.productVariantService.findAll(ctx);

    const variantsWithProduct = await Promise.all(
      variants.items.map(async (variant) => {
        return this.entityHydrator.hydrate(ctx, variant, {
          relations: ["product"],
        });
      })
    );

    const feedProducts = variantsWithProduct.map<FeedProduct>((variant) => ({
      id: variant.sku,
      title: variant.name,
      description: variant.product.description,
      link: `/product/${variant.product.slug}`,
      imageLink: variant.product?.featuredAsset?.preview,
      price: variant.priceWithTax,
      currency: variant.currencyCode,
    }));

    const xml = this.buildXML(feedProducts, channel);

    const { channel: updatedChannel, output } = await this.output(xml, channel);

    updatedChannel.customFields.rebuildCatalogFeed = false;

    await this.connection.getRepository(ctx, Channel).save(updatedChannel);

    return {
      output: channel.customFields.productCatalogOutput,
      ...output,
      productCount: feedProducts.length,
    };
  }

  private async uploadToSftp(
    channel: Channel,
    xml: string
  ): Promise<{ file: string }> {
    await this.sftpClient.connect({
      host: channel.customFields.productCatalogSftpServer,
      port: channel.customFields.productCatalogSftpPort,
      username: channel.customFields.productCatalogSftpUser,
      password: channel.customFields.productCatalogSftpPassword,
    });

    const fileName = `${channel.token}.xml`;

    await this.sftpClient.delete(fileName, true)
    await this.sftpClient.put(Buffer.from(xml), fileName);

    return {
      file: fileName
    }
  }

  private async output(
    xml: string,
    channel: Channel
  ): Promise<{ channel: Channel; output?: object }> {
    if (channel.customFields.productCatalogOutput == "sftp") {
      const { file } = await this.uploadToSftp(channel, xml);

      return {
        channel,
        output: { file  },
      };
    }

    const { assetOptions } = this.configService;
    const { assetStorageStrategy } = assetOptions;
    const fileName = `product-catalog/${channel.token}.xml`;

    const file = await assetStorageStrategy.writeFileFromBuffer(
      fileName,
      Buffer.from(xml)
    );

    channel.customFields.productCatalogXml = file;

    return {
      channel,
      output: { file },
    };
  }

  async getXmlFromChannel(ctx: RequestContext) {
    const channel = await this.connection
      .getRepository(ctx, Channel)
      .findOneOrFail({ where: { id: ctx.channelId } });

    const { assetOptions } = this.configService;
    const { assetStorageStrategy } = assetOptions;

    return (
      channel.customFields.productCatalogXml &&
      assetStorageStrategy.readFileToBuffer(
        channel.customFields.productCatalogXml
      )
    );
  }
}
