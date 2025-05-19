import { MedusaService } from "@medusajs/framework/utils";
import { Wishlist } from "./models/wishlist";
import { WishlistItem } from "./models/wishlist-item";
import { MedusaError } from "@medusajs/framework/utils";
import { MedusaContainer } from "@medusajs/framework";
import { QueryContext } from "@medusajs/framework/utils";

export default class WishlistModuleService extends MedusaService({
  Wishlist,
  WishlistItem,
}) {
  // delete wishlist item
  async deleteWishlistItem(
    container: MedusaContainer,
    wishlistItemId: string,
    customerId: string
  ): Promise<any> {
    // 1. Get the wishlist item
    const [wishlistItem] = await this.listWishlistItems({ id: wishlistItemId });

    if (!wishlistItem) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Wishlist item not found"
      );
    }

    // 2. Get the wishlist to verify customer ownership
    const [wishlist] = await this.listWishlists({
      id: wishlistItem.wishlist_id,
    });

    if (!wishlist) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Associated wishlist not found"
      );
    }

    if (wishlist.customer_id !== customerId) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "You do not have permission to delete this wishlist item"
      );
    }

    // 3. Delete the wishlist item
    await this.deleteWishlistItems({ id: wishlistItemId });

    // 4. Check if wishlist is now empty
    const remainingItems = await this.listWishlistItems({
      wishlist_id: wishlist.id,
    });
    if (remainingItems.length === 0) {
      await this.deleteWishlists({ id: wishlist.id });
    }

    // 5. Return deleted item
    return wishlistItem;
  }

  //get customer wishlists

  async getCustomerWishlists(
    customer_id: string,
    container: MedusaContainer,
    region_id: string,
    limit = 10,
    offset = 0,
    sort = "created_at:desc"
  ) {
    const query = container.resolve("query");

    const { data: customers } = await query.graph({
      entity: "customer",
      fields: ["id"],
      filters: { id: customer_id },
    });

    if (!customers.length) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Customer not found");
    }

    const wishlists = await this.listWishlists({ customer_id });
    if (!wishlists.length) return { wishlist: null, count: 0 };

    const wishlist = await this.retrieveWishlist(wishlists[0].id, {
      relations: ["items"],
    });

    const totalItems = wishlist.items.length;
    if (!totalItems) return { wishlist: { ...wishlist, items: [] }, count: 0 };

    const { data: regions } = await query.graph({
      entity: "region",
      fields: ["id", "currency_code"],
      filters: { id: region_id },
    });

    const region = regions?.[0];
    if (!region?.currency_code) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Invalid region or missing currency_code"
      );
    }

    // Sort wishlist items by their own created_at
    const [sortField, sortOrder] = sort.split(":"); // e.g., "created_at:desc"
    const sortedItems = [...wishlist.items].sort((a, b) => {
      const dateA = new Date(a[sortField]).getTime();
      const dateB = new Date(b[sortField]).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    // Paginate after sorting
    const paginatedItems = sortedItems.slice(offset, offset + limit);
    const product_ids = paginatedItems.map((item) => item.product_id);

    if (!paginatedItems.length) {
      return {
        wishlist: {
          ...wishlist,
          items: [],
        },
        count: totalItems,
      };
    }

    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "*",
        "variants.*",
        "variants.calculated_price.*",
        "images.*",
        "categories.*",
        "collection.*",
        "options.*",
        "tags.*",
      ],
      filters: {
        id: product_ids,
      },
      context: {
        variants: {
          calculated_price: QueryContext({
            region_id,
            currency_code: region.currency_code,
          }),
        },
      },
    });

    const enrichedItems = paginatedItems.map((item) => {
      const product = products.find((p) => p.id === item.product_id);
      return {
        ...item,
        product,
      };
    });

    return {
      wishlist: {
        ...wishlist,
        items: enrichedItems,
      },
      count: totalItems,
    };
  }

  //create customer wishlist

  async createCustomerWishlist(
    customer_id: string,
    container: MedusaContainer
  ) {
    const query = container.resolve("query");
    const { data: customers } = await query.graph({
      entity: "customer",
      fields: ["*"],
      filters: { id: customer_id },
    });
    if (!customers.length) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Customer not found");
    }

    // Check if wishlist already exists for this customer
    const existingWishlists = await this.listWishlists({ customer_id });
    if (existingWishlists.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Customer already has a wishlist"
      );
    }

    const wishlist = await this.createWishlists({ customer_id });
    return wishlist;
  }

  // create wishlistItem

  async createWishlistItem(
    customer_id: string,
    container: MedusaContainer,
    product_id: string
  ) {
    // Find the customer's wishlist
    const wishlists = await this.listWishlists({ customer_id });

    if (!wishlists.length) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "No wishlist found for customer"
      );
    }

    const wishlist = wishlists[0];

    //To check if a product_variant_id exists

    const query = container.resolve("query");
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "sales_channels.*"],
      filters: {
        id: product_id,
      },
    });

    if (!products.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Product not found. Please check if the provided product ID is correct."
      );
    }

    // Check for existing variant in wishlist items
    const existingItems = await this.listWishlistItems({
      wishlist_id: wishlist.id,
      product_id: product_id,
    });

    if (existingItems.length > 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "This product is already in the wishlist"
      );
    }

    // Create the wishlist item
    await this.createWishlistItems({
      wishlist_id: wishlist.id,
      product_id: product_id,
    });

    // Return updated wishlist
    const updatedWishlist = await this.retrieveWishlist(wishlist.id, {
      relations: ["items"],
    });

    return updatedWishlist;
  }
}
