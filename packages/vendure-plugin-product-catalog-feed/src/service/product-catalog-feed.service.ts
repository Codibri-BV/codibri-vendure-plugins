import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import {
  Channel,
  ConfigService,
  ID,
  JobQueue,
  JobQueueService,
  Logger,
  ProductPriceApplicator,
  ProductVariant,
  RequestContext,
  RequestContextService,
  StockLevelService,
  TransactionalConnection,
  TranslatorService,
  asyncObservable
} from "@vendure/core";
import Client from "ssh2-sftp-client";
import { PLUGIN_INIT_OPTIONS, loggerCtx } from "../constants";
import {
  AvailabilityFeedField,
  CatalogFeedBuilder
} from "../helper/CatalogFeedBuilder";
import { ProductCatalogFeedPluginOptions } from "../types";

export const BATCH_SIZE = 2;

type BuildFeedReponse = {
  total: number,
  completed: number,
  duration: number,
}

@Injectable()
export class ProductCatalogFeedService implements OnModuleInit {
  private jobQueue: JobQueue<{ channelId: ID }>;
  private sftpClient: Client;

  constructor(
    @Inject(PLUGIN_INIT_OPTIONS)
    private options: ProductCatalogFeedPluginOptions,
    private jobQueueService: JobQueueService,
    private connection: TransactionalConnection,
    private requestContextService: RequestContextService,
    private configService: ConfigService,
    private stockLevelService: StockLevelService,
    private translator: TranslatorService,
    private productPriceApplicator: ProductPriceApplicator,
  ) {
    this.sftpClient = new Client();
  }

  async onModuleInit() {
    this.jobQueue = await this.jobQueueService.createQueue({
      name: "product-catalog-feed",
      process: async (job) => {
        const ob = this.buildChannelFeed(job.data.channelId);
        
        return new Promise((resolve, reject) => {
          let total: number | undefined;
          let duration = 0;
          let completed = 0;
          ob.subscribe({
              next: (response: BuildFeedReponse) => {
                  if (!total) {
                      total = response.total;
                  }
                  duration = response.duration;
                  completed = response.completed;
                  const progress = total === 0 ? 100 : Math.ceil((completed / total) * 100);
                  job.setProgress(progress);
              },
              complete: () => {
                  resolve({
                      success: true,
                      totalProductsCount: total,
                      timeTaken: duration,
                  });
              },
              error: (err: any) => {
                  Logger.error(err.message || JSON.stringify(err), undefined, err.stack);
                  reject(err);
              },
          });
      });
        
      },
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

  async buildAllFeeds() {
    Logger.verbose("Checking channels to build", loggerCtx);

    const channels = await this.connection.rawConnection
      .getRepository(Channel)
      .find({ where: { customFields: { rebuildCatalogFeed: true } } });

    channels.forEach((channel) => {
      Logger.verbose(`Rebuild channel "${channel.code}"`);
      this.addChannelRebuildToQueue(channel.id);
    });
  }

  addChannelRebuildToQueue(channelId: ID) {
    return this.jobQueue.add({ channelId });
  }

  private buildChannelFeed(channelId: ID) {
    return asyncObservable<BuildFeedReponse>(async (observer) => {
      const timeStart = Date.now();

      const channel = await this.connection.rawConnection
        .getRepository(Channel)
        .findOneOrFail({
          where: { id: channelId },
          relations: ["defaultTaxZone"],
        });

      Logger.verbose(`Start building feed for channel ${channel.code}`);

      const ctx = await this.requestContextService.create({
        apiType: "custom",
        channelOrToken: channel,
      });

      const getImageUrl = (image?: string) => {
        if (image) {
          return `${this.options.assetUrlPrefix.trim()}/${image}`;
        }
      };

      const getAvailability = async (
        variant: ProductVariant
      ): Promise<AvailabilityFeedField> => {
        const stock = await this.stockLevelService.getAvailableStock(
          ctx,
          variant.id
        );

        return stock.stockOnHand > 1 ? "in_stock" : "out_of_stock";
      };

      const qb = this.connection
        .getRepository(ctx, ProductVariant)
        .createQueryBuilder('variants')
        .setFindOptions({
          relations: ['translations', 'taxCategory', 'featuredAsset', 'product'],
          loadEagerRelations: true,
      })
        .leftJoin('variants.product', 'product')
        .leftJoin('product.channels', 'channel')
        .where('channel.id = :channelId', { channelId });

      const count = await qb.getCount();
      Logger.verbose(
        `Building product catalog feed. Found ${count} variants for channel ${ctx.channel.code}`,
        loggerCtx
      );

      const batches = Math.ceil(count / BATCH_SIZE);

      const feed = new CatalogFeedBuilder({
        title: `${channel.code} product catelog`,
        link: channel.customFields.productCatalogShopUrl || "",
        description: `All products for ${channel.code}`,
      });

      for (let i = 0; i < batches; i++) {
        Logger.verbose(`Processing batch ${i + 1} of ${batches}`, loggerCtx);

        const variants = await qb
          .take(BATCH_SIZE)
          .skip(i * BATCH_SIZE)
          .getMany();

        await Promise.all(
          variants.map(async (rawVariant) => {
            const availability = await getAvailability(rawVariant);
            const translatedVariant = this.translator.translate(rawVariant, ctx, ['product'])
            const variant = await this.productPriceApplicator.applyChannelPriceAndTax(translatedVariant, ctx) 

            const product = {
              id: variant.sku,
              title: variant.name,
              description: variant.product.description,
              link: `product/${variant.product.slug}`,
              imageLink: getImageUrl(
                variant.featuredAsset?.preview ??
                  variant.product?.featuredAsset?.preview
              ),
              price: variant.priceWithTax,
              currency: variant.currencyCode,
              availability,
            };

            feed.addProduct(product);
          })
        );

        observer.next({
          total: count,
          completed: Math.min((i + 1) * BATCH_SIZE, count),
          duration: +new Date() - timeStart,
        });
      }

      const xml = feed.xml();
      Logger.verbose("Completed building feed", loggerCtx);

      const { channel: updatedChannel, output } = await this.output(
        xml,
        channel
      );

      updatedChannel.customFields.rebuildCatalogFeed = false;

      await this.connection.getRepository(ctx, Channel).save(updatedChannel);

      return {
        total: count,
        completed: count,
        duration: +new Date() - timeStart,
      };
    });
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

    await this.sftpClient.delete(fileName, true);
    await this.sftpClient.put(Buffer.from(xml), fileName);
    await this.sftpClient.end();

    return {
      file: fileName,
    };
  }

  private async output(
    xml: string,
    channel: Channel
  ): Promise<{ channel: Channel; output?: object }> {
    if (channel.customFields.productCatalogOutput == "sftp") {
      const { file } = await this.uploadToSftp(channel, xml);

      return {
        channel,
        output: { file },
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
