import { PluginCommonModule, VendurePlugin } from "@vendure/core";
import { shopSchema } from "./api/api-extensions";
import { ProductReviewResolver } from "./api/product-review.resolver";
import { ProductResolver } from "./api/product.resolver";
import { ProductReview } from './entity/product-review.entity'

import { PLUGIN_INIT_OPTIONS } from "./constants";
import { ProductReviewService } from "./service/product-review.service";

export interface ExampleOptions {
  enabled: boolean;
}

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [ProductReview],
  providers: [
    {
      provide: PLUGIN_INIT_OPTIONS,
      useFactory: () => ProductReviewPlugin.options,
    },
    ProductReviewService
  ],
  shopApiExtensions: {
    resolvers: [ProductReviewResolver, ProductResolver],
    schema: shopSchema,
  },
})
export class ProductReviewPlugin {
  static options: ExampleOptions;

  static init(options: ExampleOptions) {
    this.options = options;
    return ProductReviewPlugin;
  }
}
