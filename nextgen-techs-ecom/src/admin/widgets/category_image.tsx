import { defineWidgetConfig } from "@medusajs/admin-sdk";
import {
  IconButton,
  toast,
  Tooltip,
  TooltipProvider,
  Select,
} from "@medusajs/ui";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Button } from "@medusajs/ui";
import { useParams } from "react-router-dom";
import { Plus, XMark } from "@medusajs/icons";
import { usePrompt } from "@medusajs/ui";

type FormData = {
  imageUrl: File | null;
};

const CreateWidget = () => {
  const { id } = useParams();
  const paramsId = id ?? "";

  const [categories, setCategories] = useState<any>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false); // Track if save is successful
  const [formFields, setFormFields] = useState<FormData[]>([
    {
      imageUrl: null,
    },
  ]);

  const dialog = usePrompt();

  const fetchCategoryById = async (categoryId: string) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/product-categories/${categoryId}`
      );

      if (response) {
        setCategories(response.data.product_category);
        // Check if metadata already exists and set isSaved accordingly
        if (response.data.product_category.metadata?.type) {
          setIsSaved(true);
          setSelectedCollection(response.data.product_category.metadata.type);
        }
      }
    } catch (error: any) {
      toast.error("Error fetching category:", error);
    }
  };

  const fetchCollections = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/collections`
      );
      if (response) {
        setCollections(response.data.collections);
      }
    } catch (error: any) {
      toast.error("Error fetching collections:", error);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCategoryById(id);
    }
    fetchCollections();
  }, [id]);

  const handleSave = async (categoryId: string) => {
    try {
      setLoading(true);

      // Find the selected collection object
      const selectedCollectionObj = collections.find(
        (collection) => collection.id === selectedCollection
      );

      if (!selectedCollectionObj) {
        toast.error("Select a collection.");
        return;
      }

      // Save metadata (collection name as "type" and user ID)
      const metadataPayload: {
        metadata: {
          type: any;
          image_url?: string; // Add optional image_url property
        };
      } = {
        metadata: {
          type: selectedCollectionObj.title, // Save collection name as "type"
        },
      };

      // If an image is uploaded, include it in the payload
      if (previewImage) {
        const formData = new FormData();
        formData.append("files", formFields[0].imageUrl as File);

        const uploadResponse = await axios.post(
          `${import.meta.env.VITE_API_URL}/admin/uploads/category/image`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );

        if (uploadResponse) {
          metadataPayload.metadata.image_url = uploadResponse.data.url;
        }
      }

      // Save metadata to the category
      const saveResponse = await axios.post(
        `${
          import.meta.env.VITE_API_URL
        }/admin/product-categories/${categoryId}`,
        metadataPayload
      );

      if (saveResponse) {
        setFormFields([]);
        setPreviewImage(null);
        fetchCategoryById(categoryId);
        setIsSaved(true); // Set isSaved to true after successful save
        toast.success("Details saved successfully");
      }
    } catch (error: any) {
      toast.error("Error saving details:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const removeImageFromDB = async (categoryId: string) => {
    try {
      setLoading(true);

      const currentCategoryResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/product-categories/${categoryId}`
      );

      const currentMetadata =
      currentCategoryResponse.data.product_category.metadata || {};
      const imageUrl = currentMetadata.image_url;

      if (imageUrl) {
        // Extract S3 key from full URL
        const key = new URL(imageUrl).pathname.slice(1);   
        if (key) {
          await axios.delete(
            `${import.meta.env.VITE_API_URL}/admin/uploads/category/image`,
            {
              params: { key },
            }
          );
        }
      }

      // Remove image_url from metadata
      const updatedMetadata = {
        ...currentMetadata,
        image_url: null,
      };

      await axios.post(
        `${
          import.meta.env.VITE_API_URL
        }/admin/product-categories/${categoryId}`,
        { metadata: updatedMetadata }
      );

      fetchCategoryById(categoryId);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setPreviewImage(null);
      setFormFields(() => [{ imageUrl: null }]);
      setIsSaved(false);
      toast.success("Image removed successfully");
    } catch (error) {
      console.error("Error removing image:", error);
      toast.error("Failed to remove image");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload only image files.");
      return;
    }

    // Check file size
    if (file.size > maxSize) {
      toast.error(`File ${file.name} is too large. Maximum size is 5MB.`);
      return;
    }

    // Update the preview image and form fields
    setPreviewImage(URL.createObjectURL(file));
    setFormFields(() => [{ imageUrl: file }]);
    setIsSaved(false); // Reset isSaved when a new image is uploaded
  };

  const deleteEntity = async (categoryId: string) => {
    const userHasConfirmed = await dialog({
      title: "Please confirm",
      description: "Are you sure you want to delete this?",
    });
    if (userHasConfirmed) {
      await removeImageFromDB(categoryId);
    }
  };

  const handleRemoveImage = async () => {
    if (previewImage) {
      setPreviewImage(null);
      setFormFields(() => [{ imageUrl: null }]);
      setIsSaved(false);
  
      //  Reset the input so selecting the same file works again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } else if (categories?.metadata?.image_url) {
      deleteEntity(categories.id);
    }
  };
  

  return (
    <TooltipProvider>
      <div className="shadow-elevation-card-rest bg-ui-bg-base w-full rounded-lg">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="font-sans font-medium h2-core">Category Image</h2>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-4 px-6 py-4">
          <Tooltip
            content={`${loading ? "Please wait.." : "Click here to Upload"}`}
          >
            <div
              className={`shadow-elevation-card-rest hover:shadow-elevation-card-hover group relative aspect-square size-full  overflow-hidden rounded-[8px] border border-transparent hover:border-blue-500 hover:border-dotted transition-all ${
                loading ? "cursor-not-allowed" : "cursor-pointer"
              }`}
              onClick={() => document.getElementById(`imageInput`)?.click()}
            >
              <p className="flex justify-center items-center bg-ui-bg-base text-sm font-medium p-6 w-full h-full">
                <span className="flex justify-center items-center text-center text-sm">
                  <Plus />
                </span>
              </p>
            </div>
          </Tooltip>

          <input
            hidden
            type="file"
            accept="image/*"
            name="imageUrl"
            id="imageInput"
            onChange={handleImageChange}
            disabled={loading}
            ref={fileInputRef}
          />

          {(previewImage || categories?.metadata?.image_url) && (
            <div
              key="image-preview"
              className="shadow-elevation-card-rest hover:shadow-elevation-card-hover group relative aspect-square size-full cursor-pointer overflow-hidden rounded-[8px]"
            >
              <div className="transition-fg invisible absolute right-2 top-2 opacity-0 group-hover:visible group-hover:opacity-100">
                <Tooltip
                  content={`${previewImage ? "Remove" : "Delete"}`}
                  onClick={handleRemoveImage}
                >
                  <IconButton
                    variant="transparent"
                    className="hover:bg-gray-500 text-white bg-gray-500 hover:text-white"
                    size="2xsmall"
                  >
                    <XMark />
                  </IconButton>
                </Tooltip>
              </div>

              {/* Render Image */}
              <img
                src={previewImage || categories?.metadata?.image_url}
                className="size-full object-cover"
                alt="thumbnail"
              />
            </div>
          )}
        </div>

        {/* Collection Dropdown */}
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="font-sans font-medium h2-core">Select a collection</h2>
        </div>
        <div className="px-6">
          <Select
            value={selectedCollection}
            onValueChange={(value) => {
              setSelectedCollection(value);
              setIsSaved(false); // Reset isSaved when collection is changed
            }}
          >
            <Select.Trigger>
              <Select.Value placeholder="Select a collection">
                {selectedCollection
                  ? collections.find(
                      (collection) => collection.id === selectedCollection
                    )?.title
                  : "Select a collection"}
              </Select.Value>
            </Select.Trigger>
            <Select.Content>
              {collections.map((collection) => (
                <Select.Item key={collection.id} value={collection.id}>
                  {collection.title}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>

        {/* Display Saved Collection Name */}
        {isSaved && categories?.metadata?.type && (
          <div className="px-6 py-4">
            <h2 className="font-sans font-medium h2-core text-ui-fg-subtle">
              Saved Collection : {categories.metadata.type}
            </h2>
          </div>
        )}

        {/* Save Button */}
        <div className="gap-4 px-6 py-4">
          <Button
            disabled={
              loading || !selectedCollection || isSaved || !previewImage
            } // Disable if already saved
            className="px-4"
            type="button"
            onClick={() => handleSave(paramsId)}
          >
            {isSaved ? "Saved" : "Save Details"}{" "}
            {/* Change button text based on isSaved */}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
};

export const config = defineWidgetConfig({
  zone: "product_category.details.before",
});

export default CreateWidget;
