import {
  Args,
  Mutation,
  Resolver
} from "@nestjs/graphql";
import {
  Allow,
  Ctx,
  ID,
  Permission,
  RequestContext,
  Transaction
} from "@vendure/core";
import { ProductReviewService } from "./../service/product-review.service";

@Resolver()
export class ProductReviewResolver {
  constructor(private productReviewService: ProductReviewService) {}

  @Allow(Permission.Public)
  @Transaction()
  @Mutation()
  createProductReview(
    @Ctx() ctx: RequestContext,
    @Args()
    args: { prouctId: ID; text: string; rating: number; customerId?: ID }
  ) {
    const { prouctId, ...review } = args;
    return this.productReviewService.createReview(ctx, prouctId, review);
  }
}
