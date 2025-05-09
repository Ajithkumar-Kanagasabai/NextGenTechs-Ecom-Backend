import { defineRouteConfig } from "@medusajs/admin-sdk";
import { ServerStackSolid } from "@medusajs/icons";
import { Button, Container, Heading, toast } from "@medusajs/ui";
import { ChangeEvent, useState, useEffect } from "react";
import axios from "axios";
import LoadingComponent from "../../components/LoadingComponent";

export interface FormData {
  imageUrl: File | null;
  banner_title: string;
  offer_description: string;
  button_text: string;
}

type ProductBannerData = {
  id: string;
  product_banner_image: string;
  banner_title: string;
  offer_description: string;
  button_text: string;
};

const CustomPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [formFields, setFormFields] = useState<FormData[]>([
    {
      imageUrl: null,
      offer_description: "",
      button_text: "",
      banner_title: "",
    },
  ]);
  const [saveStatus, setSaveStatus] = useState<
    "Save" | "Saved" | "Save Changes"
  >("Save");
  const [priceLists, setPriceLists] = useState<string[]>([]);
  const [savedBannerData, setSavedBannerData] = useState<ProductBannerData[]>(
    []
  );
  const [isAddEnabled, setIsAddEnabled] = useState<boolean>(false);

  const [savedTitles, setSavedTitles] = useState<string[]>([]);

  const fetchProductBanner = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/product_banner`
      );

      if (response) {
        const banners = response.data.banners;

        setSavedBannerData(
          banners.map((banner: any) => ({
            id: banner.id,
            product_banner_image: banner.product_banner_image,
            banner_title: banner.banner_title,
            offer_description: banner.offer_description,
            button_text: banner.button_text,
          }))
        );

        const titles = banners.map((banner: any) =>
          banner.banner_title.toLowerCase()
        );
        setSavedTitles(titles);
      }
    } catch (err) {
      console.error("Error fetching product banners:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPriceLists = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/price-lists`
      );

      if (response) {
        let allTitles = response.data.price_lists.map(
          (item: any) => item.title
        );
        const filteredTitles = allTitles.filter(
          (title: any) => !savedTitles.includes(title.toLowerCase())
        );

        setPriceLists(filteredTitles); // Update state with filtered titles
      }
    } catch (err) {
      console.error("Error fetching price lists:", err);
    }
  };

  // Ensure fetchAllPriceLists runs only when savedTitles updates
  useEffect(() => {
    fetchAllPriceLists();
  }, [savedTitles]);

  useEffect(() => {
    fetchProductBanner(); // This sets savedTitles first
  }, []);

  const handleChange = (
    index: number,
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, files, type } = e.target as HTMLInputElement;
    const newFormFields = [...formFields];

    if (type === "file" && files) {
      const file = files[0];
      const maxSize = 5 * 1024 * 1024;

      if (!file.type.startsWith("image/")) {
        toast.error("Please upload only image files.");
        return;
      }

      if (file.size > maxSize) {
        toast.error(`File ${file.name} is too large. Maximum size is 5MB.`);
        return;
      }

      newFormFields[index].imageUrl = file;
    } else {
      newFormFields[index] = {
        ...newFormFields[index],
        [name]: value,
      };
    }

    setFormFields(newFormFields);
    setSaveStatus("Save Changes");
  };

  useEffect(() => {
    setIsAddEnabled(
      formFields.every(
        (field) =>
          field.imageUrl &&
          field.offer_description &&
          field.button_text &&
          field.banner_title !== null
      )
    );
  }, [formFields]);

  const handleRemoveImage = (index: number) => {
    const newFormFields = [...formFields];
    newFormFields[index].imageUrl = null;
    setFormFields(newFormFields);
  };

  const handleRemoveField = (index: number) => {
    const newFormFields = formFields.filter((_, i) => i !== index);
    setFormFields(newFormFields);
  };

  const handleAddMore = () => {
    if (formFields?.length < 3) {
      setFormFields([
        ...formFields,
        {
          imageUrl: null,
          offer_description: "",
          button_text: "",
          banner_title: "",
        },
      ]);
      setSaveStatus("Save Changes");
    } else {
      toast.error("You can only add up to 3 fields.");
    }
  };

  const handleSave = async () => {
    try {
      await Promise.all(
        formFields?.map(async (field) => {
          const formData = new FormData();

          if (field.imageUrl) {
            formData.append("productBannerImage", field.imageUrl);
          }
          formData.append("offer_description", field.offer_description);
          formData.append("button_text", field.button_text);
          formData.append("banner_title", field.banner_title);

          await axios.post(
            `${import.meta.env.VITE_API_URL}/admin/product_banner`,
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            }
          );
        })
      );

      toast.success("Product banner saved successfully");
      setSaveStatus("Saved");
      fetchProductBanner();
      setFormFields([
        {
          imageUrl: null,
          offer_description: "",
          button_text: "",
          banner_title: "",
        },
      ]);
    } catch (error) {
      toast.error("Error saving product banner");
    }
  };

  const handleDeleteSavedBanner = async (id: string) => {
    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_API_URL}/admin/product_banner/${id}`
      );

      if (response) {
        toast.success("product Banner deleted successfully");
        fetchProductBanner();
      }
    } catch (err: any) {
      toast.error("Error deleting product banner", err);
    }
  };

  return (
    <>
      {loading ? (
        <LoadingComponent />
      ) : (
        <Container>
          <Heading>Discount Banner</Heading>
          <form style={{ width: "50%" }}>
            {formFields?.map((field, index) => (
              <div key={index} className="mt-4">
                {/* Image Upload */}
                <Heading className="text-[14px] mb-2 mt-4">
                  Upload Banner ({index + 1})
                </Heading>
                <button
                  type="button"
                  className="bg-ui-bg-component border-ui-border-strong transition-fg group flex w-full flex-col items-center gap-y-2 rounded-lg border border-dashed p-8 hover:border-ui-border-interactive focus:border-ui-border-interactive focus:shadow-borders-focus outline-none focus:border-solid"
                  onClick={() =>
                    document.getElementById(`imageInput-${index}`)?.click()
                  }
                  disabled={!!field.imageUrl}
                >
                  <p className="font-normal font-sans txt-medium mt-3">
                    Upload image
                  </p>
                </button>
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  name="imageUrl"
                  id={`imageInput-${index}`}
                  onChange={(e) => handleChange(index, e)}
                />
                {field.imageUrl && (
                  <div className="mt-4 flex flex-col items-center">
                    <img
                      src={URL.createObjectURL(field.imageUrl)}
                      alt="thumbnail"
                      className="w-24 h-24 object-cover rounded"
                    />
                    <button
                      type="button"
                      className="text-red-500 mt-2"
                      onClick={() => handleRemoveImage(index)}
                    >
                      Remove
                    </button>
                  </div>
                )}
                <div className="mt-4">
                  <Heading className="text-[14px] mb-2 mt-4">
                    Banner Title ({index + 1})
                  </Heading>
                  <select
                    id={`banner_title-${index}`}
                    name="banner_title"
                    value={field.banner_title}
                    onChange={(e) => handleChange(index, e)}
                    className="mt-2 p-2 w-full border rounded"
                    disabled={priceLists.length === 0} // Disable dropdown if empty
                  >
                    {priceLists.length === 0 ? (
                      <option value="" disabled>
                        No titles available
                      </option>
                    ) : (
                      <>
                        <option value="" disabled>
                          Select a banner title
                        </option>
                        {priceLists.map((title, i) => (
                          <option key={i} value={title}>
                            {title}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                {/* Offer Description */}
                <div className="mt-4">
                  <Heading className="text-[14px] mb-2 mt-4">
                    Offer Description ({index + 1})
                  </Heading>
                  <input
                    type="text"
                    id={`description-${index}`}
                    name="offer_description"
                    value={field.offer_description}
                    onChange={(e) => handleChange(index, e)}
                    className="mt-2 p-2 w-full border rounded"
                  />
                </div>

                {/* Button Text */}
                <div className="mt-4">
                  <Heading className="text-[14px] mb-2 mt-4">
                    Button text ({index + 1})
                  </Heading>
                  <input
                    type="text"
                    id={`name-${index}`}
                    name="button_text"
                    value={field.button_text}
                    onChange={(e) => handleChange(index, e)}
                    className="mt-2 p-2 w-full border rounded"
                  />
                </div>

                {index !== 0 && (
                  <Button
                    type="button"
                    className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
                    onClick={() => handleRemoveField(index)}
                  >
                    Remove this banner
                  </Button>
                )}
              </div>
            ))}

            <button
              type="button"
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
              onClick={handleAddMore}
            >
              Add More
            </button>

            <button
              type="button"
              className={`mt-4 ml-2 px-4 py-2 rounded ${
                saveStatus === "Saved"
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-500"
              } text-white`}
              onClick={handleSave}
              disabled={!isAddEnabled || saveStatus === "Saved"}
            >
              {saveStatus}
            </button>
          </form>
          {/* Saved Banners Section */}
          {savedBannerData?.length > 0 && (
            <div className="my-6 flex items-center">
              <hr className="flex-grow border-gray-400" />
              <span className="px-4 text-gray-500 font-semibold">
                product Banners (Saved)
              </span>
              <hr className="flex-grow border-gray-400" />
            </div>
          )}

          {savedBannerData?.length > 0 &&
            savedBannerData?.map((banner, index) => (
              <div key={`saved-${index}`} className="mt-4">
                <div className="mt-4 flex flex-col items-center">
                  <img
                    src={banner.product_banner_image}
                    alt="Saved banner"
                    className="w-[95%] mx-auto h-[17rem] object-cover rounded"
                  />

                  <p className="font-normal text-sm mt-4 p-2 rounded text-center">
                    <span className="font-bold">Title ({index + 1}) : </span>
                    {banner.banner_title}
                  </p>
                  <p className="mt-4 font-normal text-sm  p-2 rounded text-center">
                    <span className="font-bold">
                      Offer Description ({index + 1}) :{" "}
                    </span>
                    {banner.offer_description}
                  </p>
                  <p className="font-normal text-sm mt-4 p-2 rounded text-center">
                    <span className="font-bold">
                      Button Text ({index + 1}) :{" "}
                    </span>
                    {banner.button_text}
                  </p>

                  <button
                    type="button"
                    className="text-red-500 mt-2 px-3 py-1 border border-red-500 rounded hover:bg-red-500 hover:text-white transition"
                    onClick={() => handleDeleteSavedBanner(banner.id)}
                  >
                    Delete
                  </button>
                </div>

                <div className="my-6 flex items-center">
                  <hr className="flex-grow border-gray-400" />
                  <hr className="flex-grow border-gray-400" />
                </div>
              </div>
            ))}
        </Container>
      )}
    </>
  );
};

export const config = defineRouteConfig({
  label: "Discount Banner",
  icon: ServerStackSolid,
  nested: "/products",
});

export default CustomPage;
