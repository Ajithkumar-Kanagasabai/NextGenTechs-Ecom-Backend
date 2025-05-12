import { defineRouteConfig } from "@medusajs/admin-sdk";
import { ServerStackSolid } from "@medusajs/icons";
import { Container, Heading, toast } from "@medusajs/ui";
import { ChangeEvent, useState, useEffect } from "react";
import axios from "axios";
import LoadingComponent from "../../components/LoadingComponent";

export interface FormData {
  imageUrl: File | null;
  selectedCategory: string;
  offer_description: string;
  button_text: string;
  type: string;
}

type CategoryBannerData = {
  id: string;
  category_image: string;
  category_id: string;
  category_name: string;
  offer_description: string;
  button_text: string;
  type?: string;
};

const CustomPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [formFields, setFormFields] = useState<FormData[]>([
    {
      imageUrl: null,
      selectedCategory: "",
      offer_description: "",
      button_text: "",
      type: "",
    },
  ]);
  const [saveStatus, setSaveStatus] = useState<
    "Save" | "Saved" | "Save Changes"
  >("Save");

  const [savedBannerData, setSavedBannerData] = useState<CategoryBannerData[]>(
    []
  );

  const [isAddEnabled, setIsAddEnabled] = useState<boolean>(false);

  const fetchCategoryBanner = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/category_banner?type=All`
      );
      if (response) {
        // Only run this after categories are available
        if (categories.length === 0) {
          return;
        }

        const banners = response.data.banners;

        const categoriesData = banners.map((banner: any) => {
          const category = categories.find(
            (cat) => cat.id === banner?.category_id
          );

          return {
            id: banner.id,
            category_image: banner.category_image,
            category_id: banner.category_id,
            category_name: category ? category.name : "Unknown",
            offer_description: banner.offer_description,
            button_text: banner.button_text,
            type: banner.type,
          };
        });

        setSavedBannerData(categoriesData);
      }
    } catch (err) {
      console.error("Error fetching category banners:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (categories.length > 0) {
      fetchCategoryBanner();
    }
  }, [categories]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/product-categories`
      );
      setCategories(response.data.product_categories);
    } catch (error) {
      toast.error("Error fetching categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
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

      newFormFields[index].imageUrl = file; // ✅ Correctly assigns File
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
          field.selectedCategory &&
          field.offer_description &&
          field.button_text &&
          field.type
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
          selectedCategory: "",
          offer_description: "",
          button_text: "",
          type: "",
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
        formFields.map(async (field) => {
          const formData = new FormData();

          if (field.imageUrl) {
            formData.append("categoryBannerImage", field.imageUrl);
          }
          formData.append("categoryId", field.selectedCategory);
          formData.append("offer_description", field.offer_description);
          formData.append("button_text", field.button_text);
          formData.append("type", field.type);
          formData.append(
            "category_name",
            categories.find((cat) => cat.id === field.selectedCategory)?.name ||
              ""
          );

          await axios.post(
            `${import.meta.env.VITE_API_URL}/admin/category_banner`,
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            }
          );
        })
      );

      toast.success("Categories saved successfully");
      setSaveStatus("Saved");
      fetchCategoryBanner();
      setFormFields([
        {
          imageUrl: null,
          selectedCategory: "",
          offer_description: "",
          button_text: "",
          type: "",
        },
      ]);
    } catch (error) {
      toast.error("Error saving categories");
    }
  };

  const handleDeleteSavedBanner = async (id: string) => {
    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_API_URL}/admin/category_banner/${id}`
      );

      if (response) {
        toast.success("Category Banner deleted successfully");
        fetchCategoryBanner();
      }
    } catch (err: any) {
      toast.error("Error deleting category banner", err);
    }
  };

  return (
    <>
      {loading ? (
        <LoadingComponent />
      ) : (
        <Container>
          <Heading>Category Banner</Heading>
          <form style={{ width: "50%" }}>
            {formFields.map((field, index) => (
              <div key={index} className="mt-4">
                {index === 0 && (
                  <div className="my-6 flex items-center">
                    <hr className="flex-grow border-gray-400" />
                    <span className="px-4 text-gray-500 font-semibold">
                      First Banner
                    </span>
                    <hr className="flex-grow border-gray-400" />
                  </div>
                )}

                {index === 1 && (
                  <div className="my-6 flex items-center">
                    <hr className="flex-grow border-gray-400" />
                    <span className="px-4 text-gray-500 font-semibold">
                      Second Banner
                    </span>
                    <hr className="flex-grow border-gray-400" />
                  </div>
                )}

                {index === 2 && (
                  <div className="my-6 flex items-center">
                    <hr className="flex-grow border-gray-400" />
                    <span className="px-4 text-gray-500 font-semibold">
                      Third Banner
                    </span>
                    <hr className="flex-grow border-gray-400" />
                  </div>
                )}
                <Heading className="text-[14px] mb-2 mt-4">
                  Upload Banner ({index + 1})
                </Heading>
                <button
                  type="button"
                  className="bg-ui-bg-component border-ui-border-strong transition-fg group flex w-full flex-col items-center gap-y-2 rounded-lg border border-dashed p-8 hover:border-ui-border-interactive focus:border-ui-border-interactive focus:shadow-borders-focus outline-none focus:border-solid"
                  onClick={() =>
                    document.getElementById(`imageInput-${index}`)?.click()
                  } // <-- Updated reference
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
                  id={`imageInput-${index}`} // <-- Unique ID for each set
                  onChange={(e) => handleChange(index, e)}
                />
                {/* Image preview directly below the upload button */}
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
                  <label
                    htmlFor={`category-${index}`}
                    className="font-normal text-sm"
                  >
                    Select Category ({index + 1})
                  </label>
                  <select
                    id={`category-${index}`}
                    name="selectedCategory"
                    value={field.selectedCategory}
                    onChange={(e) => handleChange(index, e)}
                    className="mt-2 p-2 w-full border rounded"
                  >
                    <option value="">--Select Category--</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-4">
                  <label
                    htmlFor={`description-${index}`}
                    className="font-normal text-sm"
                  >
                    Offer Description ({index + 1})
                  </label>
                  <input
                    type="text"
                    id={`description-${index}`}
                    name="offer_description" // Updated name
                    value={field.offer_description}
                    onChange={(e) => handleChange(index, e)}
                    className="mt-2 p-2 w-full border rounded"
                  />
                </div>

                <div className="mt-4">
                  <label
                    htmlFor={`type-${index}`}
                    className="font-normal text-sm"
                  >
                    Type ({index + 1})
                  </label>
                  <select
                    id={`type-${index}`}
                    name="type"
                    value={field.type}
                    onChange={(e) => handleChange(index, e)}
                    className="mt-2 p-2 w-full border rounded"
                  >
                    <option value="">--Select Type--</option>
                    <option value="Ecom">Ecom</option>
                    <option value="Food">Food</option>
                  </select>
                </div>

                <div className="mt-4">
                  <label
                    htmlFor={`name-${index}`}
                    className="font-normal text-sm"
                  >
                    Button text ({index + 1})
                  </label>
                  <input
                    type="text"
                    id={`name-${index}`}
                    name="button_text" // Updated name
                    value={field.button_text}
                    onChange={(e) => handleChange(index, e)}
                    className="mt-2 p-2 w-full border rounded"
                  />
                </div>
                {index !== 0 && (
                  <button
                    type="button"
                    className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
                    onClick={() => handleRemoveField(index)}
                  >
                    Remove this field
                  </button>
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

            {/* Show saved banners first */}
            {savedBannerData.length > 0 && (
              <div className="my-6 flex items-center">
                <hr className="flex-grow border-gray-400" />
                <span className="px-4 text-gray-500 font-semibold">
                  Category Banners (Saved)
                </span>
                <hr className="flex-grow border-gray-400" />
              </div>
            )}
            {savedBannerData.length > 0 &&
              savedBannerData.map((banner, index) => (
                <div key={`saved-${index}`} className="mt-4">
                  <div className="mt-4">
                    <p className="font-normal text-sm  p-2 rounded text-center ">
                      <span className="font-bold">Type ({index + 1}) : </span>
                      {banner.type}
                    </p>
                  </div>

                  <div className="mt-4">
                    <p className="font-normal text-sm  p-2 rounded text-center ">
                      <span className="font-bold">
                        Category Name ({index + 1}) :{" "}
                      </span>
                      {banner.category_name}
                    </p>
                  </div>

                  {/* Show saved image */}
                  <div className="mt-4 flex flex-col items-center">
                    <img
                      src={banner.category_image}
                      alt="Saved Category"
                      className="w-[95%] mx-auto h-[17rem] object-cover rounded"
                    />

                    <p className="font-normal text-sm mt-4 p-2 rounded text-center ">
                      <span className="font-bold">
                        Offer Description ({index + 1}) :{" "}
                      </span>
                      {banner.offer_description}
                    </p>

                    <p className="font-normal mt-4 text-sm p-2 rounded text-center ">
                      <span className="font-bold">
                        Button Text ({index + 1}) :{" "}
                      </span>
                      {banner.button_text}
                    </p>

                    {/* Delete Button */}

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
          </form>
        </Container>
      )}
    </>
  );
};

export const config = defineRouteConfig({
  label: "Category Banner",
  icon: ServerStackSolid,
  nested: "/products",
});

export default CustomPage;
