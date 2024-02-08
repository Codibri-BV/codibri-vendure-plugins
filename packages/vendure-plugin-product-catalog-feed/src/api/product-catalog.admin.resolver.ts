import { Mutation, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, RequestContext } from '@vendure/core';
import { productCatalogFeedPerm } from '../constants';
import { ProductCatalogFeedService } from '../service/product-catalog-feed.service';

@Resolver()
export class ProductCatalogAdminResolver {
    constructor(private productCatalogFeedService: ProductCatalogFeedService) {}

    @Mutation()
    @Allow(productCatalogFeedPerm.Permission)
    async rebuildProductCatalog(
        @Ctx() ctx: RequestContext,
    ) {
        return this.productCatalogFeedService.addChannelRebuildToQueue(ctx.channelId)
    }
}