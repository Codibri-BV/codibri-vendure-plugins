import {
  Parent,
  ResolveField,
  Resolver
} from "@nestjs/graphql";
import {
  Allow,
  Ctx,
  Permission,
  Product,
  RequestContext
} from "@vendure/core";
import { ProductReview } from "../entity/product-review.entity";
import { ProductReviewService } from "./../service/product-review.service";

@Resolver('Product')
export class ProductResolver {
  constructor(private productReviewService: ProductReviewService) {}

  @ResolveField()
  @Allow(Permission.Public)
  async reviews(
    @Ctx() ctx: RequestContext,
    @Parent() product: Product
  ): Promise<ProductReview[]> {
    return this.productReviewService.findAll(ctx, product.id);
  }
}
