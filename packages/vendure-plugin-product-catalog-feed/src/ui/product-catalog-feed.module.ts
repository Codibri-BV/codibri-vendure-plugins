import { NgModule } from "@angular/core";
import { addActionBarItem, SharedModule } from "@vendure/admin-ui/core";
import gql from "graphql-tag";
import { firstValueFrom } from "rxjs";

@NgModule({
  imports: [SharedModule],
  providers: [
    addActionBarItem({
      id: "productCatalogButton",
      label: "Rebuild product catalog",
      locationId: "product-list",
      onClick: async (_event, context) => {
        try {
          await firstValueFrom(
            context.dataService.mutate(gql`
              mutation RebuildProductCatalog {
                rebuildProductCatalog {
                  id
                  state
                }
              }
            `)
          );
          context.notificationService.success("Rebuilding product catalog");
        } catch (error) {
          context.notificationService.error("Error rebuilding catalog");
        }
      },
      requiresPermission: "ProductCatalogFeedRebuild",
      buttonState: (context) => {
        return context.dataService
          .query<{
            activeChannel: { customFields: { productCatalogOutput: string } };
          }>(
            gql`
              query {
                activeChannel {
                  customFields {
                    productCatalogOutput
                  }
                }
              }
            `
          )
          .mapSingle((data) => {
            return {
              disabled: false,
              visible:
                data.activeChannel.customFields.productCatalogOutput !=
                "disabled",
            };
          });
      },
    }),
  ],
})
export class ProductCatalogFeedModule {}
