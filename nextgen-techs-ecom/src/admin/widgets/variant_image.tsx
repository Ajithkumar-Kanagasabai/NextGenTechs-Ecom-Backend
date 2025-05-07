import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Button, Container, Heading, toast } from "@medusajs/ui";
import axios from "axios";
import { useParams } from "react-router-dom";

type ImageType = {
  file: File;
  preview: string;
  selected: boolean;
};

const VariantImage = () => {
  const [images, setImages] = useState<ImageType[]>([]);
  const [fetchedImages, setFetchedImages] = useState<ImageType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const imageRef = useRef<HTMLInputElement | null>(null);
  const { variant_id, id } = useParams();

  const fetchVariantImages = async () => {
    if (!id || !variant_id) return;

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/products/${id}/variants/${variant_id}`,
        {
          withCredentials: true,
        }
      );

      // Extract images from metadata
      const imageUrls = response.data.variant.metadata?.image_urls || [];

      // Convert URLs into objects while keeping previously selected state
      const fetched = imageUrls.map((url: string) => {
        const existingImage = fetchedImages.find((img) => img.preview === url);
        return {
          file: null, // No file needed for existing images
          preview: url,
          selected: existingImage ? existingImage.selected : false, // Preserve selected state
        };
      });

      // Preserve already fetched images that are not in the new fetched list
      setFetchedImages((prev) => {
        const preservedImages = prev.filter(
          (img) => !imageUrls.includes(img.preview)
        );
        return [...preservedImages, ...fetched];
      });
    } catch (error) {
      console.error("Error fetching variant images:", error);
      toast.error("Failed to load variant images.");
    }
  };

  useEffect(() => {
    fetchVariantImages();
  }, [id, variant_id]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const MAX_FILES = 10;
    const MAX_SIZE_MB = 5;

    if (!e.target.files) return;

    const newFiles: ImageType[] = [];

    for (const file of e.target.files) {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`File exceeds 5MB size limit.`);
        continue;
      }
      newFiles.push({
        file,
        preview: URL.createObjectURL(file),
        selected: false,
      });
    }

    setImages((prev) => {
      const totalImages = prev.length + newFiles.length;
      if (totalImages > MAX_FILES) {
        toast.error("Maximum 10 images allowed.");
        return [...prev, ...newFiles.slice(0, MAX_FILES - prev.length)];
      }
      return [...prev, ...newFiles];
    });

    // Reset input field to allow re-uploading the same file
    e.target.value = "";
  };

  const handleUpload = async () => {
    if (!id || !variant_id) {
      toast.error("Missing product or variant ID.");
      return;
    }
  
    setLoading(true);
    try {
      const formData = new FormData();
      images.forEach((image) => formData.append("files", image.file));
  
      // Upload new images
      const uploadResponse = await axios.post(
        `${import.meta.env.VITE_API_URL}/admin/uploads`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
  
      const newImageUrls: string[] = uploadResponse.data.files.map(
        (item: any) => item.url
      );
  
      // Fetch existing metadata
      const variantRes = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/products/${id}/variants/${variant_id}`,
        {
          withCredentials: true,
        }
      );
  
      const existingImageUrls: string[] =
        variantRes.data.variant.metadata?.image_urls || [];
  
      // Merge existing + new, filter out duplicates
      const mergedImageUrls = Array.from(
        new Set([...existingImageUrls, ...newImageUrls].filter(Boolean))
      );
  
      // Update metadata with merged list
      const updateResponse = await axios.post(
        `${import.meta.env.VITE_API_URL}/admin/products/${id}/variants/${variant_id}`,
        { metadata: { image_urls: mergedImageUrls } },
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        }
      );
  
      if (updateResponse) {
        toast.success("Images uploaded successfully.");
        setImages([]);
        await fetchVariantImages();
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload images.");
    } finally {
      setLoading(false);
    }
  };
  

  const deleteSelectedImages = () => {
    setImages((prev) => prev.filter((img) => !img.selected));
    setFetchedImages((prev) => prev.filter((img) => !img.selected));
  };

  const deleteSelected = async () => {
    if (!id || !variant_id) {
      toast.error("Missing product or variant ID.");
      return;
    }

    try {
      // Extract file keys from URLs (only for fetched images with valid URLs)
      const fileKeys = fetchedImages
      .filter((img) => img.selected && img.preview) // Only selected images
      .map((img) => {
        try {
          const url = new URL(img.preview);
          return url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
        } catch (e) {
          console.warn("Invalid URL in preview:", img.preview);
          return null;
        }
      })
      .filter((key): key is string => !!key); // Remove any null/invalid entries
    
      if (fileKeys.length > 0) {
        await axios.delete(`${import.meta.env.VITE_API_URL}/admin/delete-upload`, {
          data: { file_keys: fileKeys },
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Remove selected images from state
      deleteSelectedImages();

      // Update variant metadata with remaining fetched images
      await axios.post(
        `${import.meta.env.VITE_API_URL}/admin/products/${id}/variants/${variant_id}`,
        {
          metadata: {
            image_urls: fetchedImages
              .filter((img) => !img.selected)
              .map((img) => img.preview),
          },
        },
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        }
      );

      toast.success("Images deleted successfully.");
      await fetchVariantImages();
    } catch (error) {
      console.error("Error deleting images:", error);
      toast.error("Failed to delete images.");
    }
  };

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Media</Heading>
        <Button
          variant="secondary"
          onClick={deleteSelected}
          disabled={
            !images.some((img) => img.selected) &&
            !fetchedImages.some((img) => img.selected)
          }
        >
          Delete
        </Button>
      </div>

      <div className="p-6">
        <div className="mt-4 mb-4">
          <button
            type="button"
            className="bg-ui-bg-component border-ui-border-strong transition-fg group flex w-full flex-col items-center gap-y-2 rounded-lg border border-dashed p-8 hover:border-ui-border-interactive focus:border-ui-border-interactive focus:shadow-borders-focus outline-none focus:border-solid"
            onClick={() => imageRef?.current?.click()}
          >
            <div className="text-ui-fg-subtle group-disabled:text-ui-fg-disabled flex items-center gap-x-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={15}
                height={15}
                fill="none"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M13.056 9.944v1.334c0 .982-.796 1.778-1.778 1.778H3.722a1.777 1.777 0 0 1-1.778-1.778V9.944M4.389 5.5 7.5 8.611 10.611 5.5M7.5 8.611V1.944"
                />
              </svg>
              <p className="font-normal font-sans txt-medium mt-3">
                Upload images
              </p>
            </div>
            <p className="font-normal font-sans txt-compact-small text-ui-fg-muted group-disabled:text-ui-fg-disabled">
              Click to Upload Images.
            </p>
          </button>
          <input
            hidden
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/svg+xml"
            multiple
            name="imageUrls"
            ref={imageRef}
            onChange={handleFileChange}
          />
        </div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {/* Render fetchedImages first */}
          {fetchedImages.length > 0 &&
            fetchedImages.map((image, index) => (
              <div
                key={`fetched-${index}`}
                className={`relative border rounded-lg overflow-hidden w-30 h-24 cursor-pointer ${
                  image.selected ? "ring-2 ring-blue-500" : ""
                }`}
                onClick={() =>
                  setFetchedImages((prev) =>
                    prev.map((img, i) => ({
                      ...img,
                      selected: i === index ? !img.selected : img.selected,
                    }))
                  )
                }
              >
                <img
                  src={image.preview}
                  alt={`Fetched image ${index + 1}`}
                  className="w-full h-full object-cover object-center rounded-lg"
                />
              </div>
            ))}

          {/* Render newly uploaded images */}
          {images.length > 0 &&
            images.map((image, index) => (
              <div
                key={`uploaded-${index}`}
                className={`relative border rounded-lg overflow-hidden w-30  h-24 cursor-pointer ${
                  image.selected ? "ring-2 ring-blue-500" : ""
                }`}
                onClick={() =>
                  setImages((prev) =>
                    prev.map((img, i) => ({
                      ...img,
                      selected: i === index ? !img.selected : img.selected,
                    }))
                  )
                }
              >
                <img
                  src={image.preview}
                  alt={`Product image ${index + 1}`}
                  className="w-full h-full object-cover object-center rounded-lg"
                />
              </div>
            ))}
        </div>
        <div className="mt-4">
          <Button
            variant="primary"
            className={images.length === 0 ? "cursor-not-allowed" : ""}
            onClick={handleUpload}
            isLoading={loading}
            disabled={images.length === 0}
          >
            {images.length > 0
              ? "Save Changes"
              : fetchedImages.length > 0
              ? "Saved"
              : "Save"}
          </Button>
        </div>
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "product_variant.details.after",
});

export default VariantImage;
