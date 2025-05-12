import { MedusaService } from "@medusajs/framework/utils";
import SpecialOffer from "./models/special_offers_banner";

type specialOfferBannerTypes = {
  offer_banner_image: string | null;
  offer_description: string;
  offer_title: string;
};

class SpecialOfferBannerModuleService extends MedusaService({
  SpecialOffer,
}) {
  async createSpecialOfferBanner(input: specialOfferBannerTypes) {
  const {
    offer_banner_image,
    offer_description,
    offer_title
  } = input;

  const newSpecialOfferBanner = await this.createSpecialOffers({
    offer_banner_image: offer_banner_image ?? undefined,
    offer_description,
    offer_title,
  });

  return newSpecialOfferBanner;
}


  async getAllBanners() {
    try {
      const offer_banners = await this.listSpecialOffers({});

      return offer_banners;
    } catch (error) {
      console.error("Error fetching offer banners:", error);
      throw new Error("Could not fetch banners");
    }
  }

  async deleteBanner(id: string) {
    try {
      await this.deleteSpecialOffers({ id });
      return true;
    } catch (error) {
      console.error("Error deleting offer banner:", error);
      throw new Error("Could not delete offer banner");
    }
  }
}

export default SpecialOfferBannerModuleService;
