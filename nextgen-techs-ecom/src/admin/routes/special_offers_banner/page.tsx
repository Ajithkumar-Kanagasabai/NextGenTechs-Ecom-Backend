import { defineRouteConfig } from "@medusajs/admin-sdk";
import { ServerStackSolid } from "@medusajs/icons";
import { Button, Container, Heading, toast } from "@medusajs/ui";
import { ChangeEvent, useState, useEffect } from "react";
import axios from "axios";
import LoadingComponent from "../../components/LoadingComponent";

export interface FormData {
  imageUrl: File | null;
  offer_title: string;
  offer_description: string;
}

type SpecialOfferBannerData = {
  id: string;
  offer_banner_image: string;
  offer_title: string;
  offer_description: string;
};

const CustomPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [formFields, setFormFields] = useState<FormData[]>([
    {
      imageUrl: null,
      offer_description: "",
      offer_title: "Special offer", // Set default value
    },
  ]);
  const [saveStatus, setSaveStatus] = useState<
    "Save" | "Saved" | "Save Changes"
  >("Save");
  const [savedBannerData, setSavedBannerData] = useState<
    SpecialOfferBannerData[]
  >([]);
  const [isAddEnabled, setIsAddEnabled] = useState<boolean>(false);
  const [isSaveDisabled, setIsSaveDisabled] = useState<boolean>(false); 

  const fetchOfferBanner = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/special_offers_banner`
      );
      if (response) {
        const banners = response.data.banners;
        setSavedBannerData(
          banners?.map((banner: any) => ({
            id: banner.id,
            offer_banner_image: banner.offer_banner_image,
            offer_title: banner.offer_title,
            offer_description: banner.offer_description,
          }))
        );

        // Disable save button if there is already one or more entries
        if (banners.length >= 1) {
          setIsSaveDisabled(true);
        } else {
          setIsSaveDisabled(false);
        }
      }
    } catch (err) {
      console.error("Error fetching product banners:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfferBanner();
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
    } else if (name !== "offer_title") {
      // Prevent changes to offer_title
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
          field.offer_title !== null
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
    if (formFields.length < 3) {
      setFormFields([
        ...formFields,
        {
          imageUrl: null,
          offer_description: "",
          offer_title: "Special offer", // Set default value
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
            formData.append("specialOfferBannerImage", field.imageUrl);
          }
          formData.append("offer_description", field.offer_description);
          formData.append("offer_title", "Special offer"); // Always send "Special offer"

          await axios.post(
            `${import.meta.env.VITE_API_URL}/admin/special_offers_banner`,
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            }
          );
        })
      );

      toast.success("Special offers saved successfully");
      setSaveStatus("Saved");
      fetchOfferBanner();
      setFormFields([
        {
          imageUrl: null,
          offer_description: "",
          offer_title: "Special offer", // Reset to default value
        },
      ]);
    } catch (error) {
      toast.error("Error saving special offers");
    }
  };

  const handleDeleteSavedBanner = async (id: string) => {
    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_API_URL}/admin/special_offers_banner/${id}`
      );

      if (response) {
        toast.success("Offer Banner deleted successfully");
        fetchOfferBanner();
        window.location.reload();
      }
    } catch (err: any) {
      toast.error("Error deleting offer banner", err);
    }
  };

  return (
    <>
      {loading ? (
        <LoadingComponent />
      ) : (
        <Container>
          <Heading>Special Offers Banner</Heading>
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
                    Offer Title ({index + 1})
                  </Heading>
                  <input
                    type="text"
                    id={`offer_title-${index}`}
                    name="offer_title"
                    value="Special offer" // Always display "Special offer"
                    disabled // Disable the input field
                    className="mt-2 p-2 w-full border rounded"
                  />
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

                {index !== 0 && (
                  <Button
                    type="button"
                    className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
                    onClick={() => handleRemoveField(index)}
                  >
                    Remove this field
                  </Button>
                )}
              </div>
            ))}

            <button
              type="button"
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hidden"
              onClick={handleAddMore}
            >
              Add More
            </button>

            <button
              type="button"
              className={`mt-4 ml-0 px-4 py-2 rounded ${
                saveStatus === "Saved" || isSaveDisabled
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-500"
              } text-white`}
              onClick={handleSave}
              disabled={
                !isAddEnabled || saveStatus === "Saved" || isSaveDisabled
              } // Disable if save is disabled
            >
              {saveStatus}
            </button>
          </form>
          {/* Saved Banners Section */}
          {savedBannerData.length > 0 && (
            <div className="my-6 flex items-center">
              <hr className="flex-grow border-gray-400" />
              <span className="px-4 text-gray-500 font-semibold">
                Offer Banners (Saved)
              </span>
              <hr className="flex-grow border-gray-400" />
            </div>
          )}

          {savedBannerData.length > 0 &&
            savedBannerData?.map((banner, index) => (
              <div key={`saved-${index}`} className="mt-4">
                <div className="mt-4 flex flex-col items-center">
                  <img
                    src={banner.offer_banner_image}
                    alt="Saved banner"
                    className="w-[95%] mx-auto h-[17rem] object-cover rounded"
                  />

                  <p className="font-normal text-sm mt-4 p-2 rounded text-center">
                    <span className="font-bold">
                      Offer Title ({index + 1}) :{" "}
                    </span>
                    {banner.offer_title}
                  </p>
                  <p className="mt-4 font-normal text-sm  p-2 rounded text-center">
                    <span className="font-bold">
                      Offer Description ({index + 1}) :{" "}
                    </span>
                    {banner.offer_description}
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
  label: "Special Offers Banner",
  icon: ServerStackSolid,
  nested: "/products",
});

export default CustomPage;
