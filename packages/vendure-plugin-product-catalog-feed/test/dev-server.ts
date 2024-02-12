import { Query } from "@nestjs/graphql";
import { gql } from "graphql-tag";
import { AdminUiPlugin } from "@vendure/admin-ui-plugin";
import { AssetServerPlugin } from "@vendure/asset-server-plugin";
import {
  DefaultLogger,
  DefaultSearchPlugin,
  LogLevel,
  Logger,
  mergeConfig,
} from "@vendure/core";
import {
  createTestEnvironment,
  registerInitializer,
  SqljsInitializer,
  testConfig,
} from "@vendure/testing";
import path from "path";
import { initialData } from "../../test-utils/src/initial-data";
import { ProductCatalogFeedPlugin, ProductCatalogFeedService } from "../src";
import { createSftpMockServer } from "@micham/sftp-mock-server";
import { compileUiExtensions } from "@vendure/ui-devkit/compiler";

require("dotenv").config();

const sftpConfig = {
  port: 9999,
  hostname: "127.0.0.1",
  user: "alice",
  password: "password",
};

(async () => {
  const mockServer = await createSftpMockServer({
    port: sftpConfig.port.toString(),
    hostname: sftpConfig.hostname,
    users: { [sftpConfig.user]: { password: sftpConfig.password } },
    debug: Logger.debug,
  });

  registerInitializer("sqljs", new SqljsInitializer("__data__"));
  const devConfig = mergeConfig(testConfig, {
    logger: new DefaultLogger({ level: LogLevel.Debug }),
    plugins: [
      AssetServerPlugin.init({
        assetUploadDir: path.join(__dirname, "__data__/assets"),
        route: "assets",
      }),
      ProductCatalogFeedPlugin.init({ assetUrlPrefix: 'http://localhost:3050/assets' }),
      DefaultSearchPlugin,
      AdminUiPlugin.init({
        port: 3002,
        route: "admin",
        app: compileUiExtensions({
          outputPath: path.join(__dirname, "../admin-ui"),
          extensions: [ProductCatalogFeedPlugin.ui],
          devMode: true
        }),
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
    productsCsvPath: path.join(
      __dirname,
      "../../test-utils/src/products-import.csv"
    ),
  });

  await adminClient.asSuperAdmin();

  const updateChannelMutation = gql`
    mutation UpdateChannel($input: UpdateChannelInput!) {
      updateChannel(input: $input) {
        ... on Channel {
          id
        }
      }
    }
  `;

  await adminClient.query(updateChannelMutation, {
    input: {
      id: "T_1",
      customFields: {
        productCatalogOutput: "sftp",
        productCatalogShopUrl: "https://www.shop.com",
        productCatalogSftpServer: sftpConfig.hostname,
        productCatalogSftpPort: sftpConfig.port,
        productCatalogSftpUser: sftpConfig.user,
        productCatalogSftpPassword: sftpConfig.password,
      },
    },
  });

  const updateMutation = gql`
    mutation {
      updateProduct(
        input: {
          id: "T_1"
          translations: [{ languageCode: en, name: "New name test" }]
        }
      ) {
        id
        name
      }
    }
  `;
  await adminClient.query(updateMutation);
  
  await server.app.get(ProductCatalogFeedService).buildAllFeeds()
})();
