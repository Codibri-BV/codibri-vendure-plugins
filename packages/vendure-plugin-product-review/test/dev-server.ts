import {
  createTestEnvironment,
  registerInitializer,
  SqljsInitializer,
  testConfig,
} from "@vendure/testing";
import {
  DefaultLogger,
  DefaultSearchPlugin,
  Logger,
  LogLevel,
  mergeConfig,
} from "@vendure/core";
import { AdminUiPlugin } from "@vendure/admin-ui-plugin";
import { AssetServerPlugin } from "@vendure/asset-server-plugin";
import path from "path";
import { ProductReviewPlugin } from "../src";
import { initialData } from "../../test-utils/src/initial-data";
import gql from "graphql-tag";

require("dotenv").config();

(async () => {
  registerInitializer("sqljs", new SqljsInitializer("__data__"));
  const devConfig = mergeConfig(testConfig, {
    logger: new DefaultLogger({ level: LogLevel.Debug }),
    plugins: [
      AssetServerPlugin.init({
        assetUploadDir: path.join(__dirname, "__data__/assets"),
        route: "assets",
      }),
      ProductReviewPlugin.init({
        enabled: true,
      }),
      DefaultSearchPlugin,
      AdminUiPlugin.init({
        port: 3002,
        route: "admin",
        /*      
        TODO: uncomment this block to start the admin ui in dev mode
        app: compileUiExtensions({
          outputPath: path.join(__dirname, "__admin-ui"),
          extensions: [
            // TODO Add your plugin's UI here
          ],
          devMode: true
        })*/
      }),
    ],
    apiOptions: {
      shopApiPlayground: true,
      adminApiPlayground: true,
    },
  });
  const { server, adminClient, shopClient } = createTestEnvironment(devConfig);
  await server.init({
    initialData,
    productsCsvPath: path.join(__dirname, "../../test-utils/src/product-import.csv"),
  });

  const CreateReview = gql`
    mutation CreateReview(
      $prouctId: ID!
      $text: String!
      $rating: Int!
      $customerId: ID
    ) {
      createProductReview(
        prouctId: $prouctId
        text: $text
        rating: $rating
        customerId: $customerId
      ) {
        id
        text
        rating
      }
    }
  `;
  await shopClient.query(CreateReview, {
    prouctId: 'T_1',
    text: "Review 1",
    rating: 1,
  });

  await shopClient.query(CreateReview, {
    prouctId: 'T_1',
    text: "Review 2",
    rating: 2,
  });

  await shopClient.query(CreateReview, {
    prouctId: 'T_2',
    text: "Review 3",
    rating: 3,
  });

  Logger.debug('Created 3 reviews')

})();
