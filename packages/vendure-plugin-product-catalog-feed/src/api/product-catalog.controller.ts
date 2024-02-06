import {
  Controller,
  Get,
  Header,
  Res,
  HttpStatus,
  Query,
} from "@nestjs/common";
import { Response } from "express";
import {
  Ctx,
  Logger,
  RequestContext,
  RequestContextService,
} from "@vendure/core";
import { ProductCatalogFeedService } from "../service/product-catalog-feed.service";

@Controller("product-catalog")
export class ProductCatalogController {
  constructor(
    private productCatalogService: ProductCatalogFeedService,
    private requestContextService: RequestContextService
  ) {}

  @Get()
  @Header("Content-Type", "text/xml")
  async findAll(
    @Ctx() ctx: RequestContext,
    @Res() reponse: Response,
    @Query("token") token?: string
  ) {
    const context = await (token
      ? this.requestContextService.create({
          apiType: "shop",
          channelOrToken: token,
        })
      : Promise.resolve(ctx));

    Logger.info(
      `Requesting product catalog for channel "${context.channel.code}"`
    );

    if (context.channel.customFields.productCatalogOutput !== "url")
      return reponse.status(HttpStatus.NOT_FOUND);

    const xml = await this.productCatalogService.getXmlFromChannel(context);

    if (!xml) return reponse.status(HttpStatus.NOT_FOUND);

    reponse.send(xml.toString("utf-8"));
  }
}
