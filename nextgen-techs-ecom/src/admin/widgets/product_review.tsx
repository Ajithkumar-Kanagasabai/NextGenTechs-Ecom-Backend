import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Container, Heading } from "@medusajs/ui";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Star, StarSolid } from "@medusajs/icons";
import { Badge } from "@medusajs/ui";
import { useNavigate } from "react-router";

type ReviewTypes = {
  totalRatings: number;
  averageRating: number;
  totalComments: number;
  reviews: {
    customerId: string;
    customerName: string;
    comment: string;
    rating: number;
    variant: {
      id: string;
      sku: string;
      title?: string;
      price?: number;
    };
  }[];
};

const ProductWidget = () => {
  const { id } = useParams();
  const isFetched = useRef(false); //  prevent double api calls

  const [productReviews, setProductReviews] = useState<ReviewTypes>({
    totalRatings: 0,
    averageRating: 0,
    totalComments: 0,
    reviews: [],
  });
  const [totalPages, setTotalPages] = useState<number>(1);
  const itemsPerPage = 1;
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);

  const navigate = useNavigate();

  const [showReviews, setShowReviews] = useState<boolean>(false);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const fetchAllReviews = async (productId: string, page: number) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/product/review-ratings/${productId}?offset=${
          (page - 1) * itemsPerPage
        }&limit=${itemsPerPage}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setProductReviews(data);
        const totalPageCount = Math.ceil(data.total / itemsPerPage);
        setTotalPages(totalPageCount);
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (!id) return; 

    const fetchReviews = async () => {
      try {
        await fetchAllReviews(id as string, currentPage);
      } catch (error) {
        console.error("Error fetching reviews:", error);
      }
    };

    if (!isFetched.current || currentPage) {
      isFetched.current = true;
      fetchReviews();
    }
  }, [id, currentPage]); 

  const handleClick = async (newPage: number) => {
    if (loading) return;
    setLoading(true);
    await handlePageChange(newPage);
    setLoading(false);
  };

  //render stars based on ratings

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const decimalPart = rating % 1;

    return (
      <div className="flex  gap-x-1">
        {[...Array(5)].map((_, index) => {
          if (index < fullStars) {
            return (
              <StarSolid key={index} color="#FDB813" className="w-6 h-6" />
            );
          } else if (index === fullStars && decimalPart > 0) {
            return (
              <div key={index} className="relative w-6 h-6 flex ">
                <Star color="#FDB813" className="absolute w-6 h-6" />
                {/* Partially Filled Star */}
                <div
                  className="absolute top-0 left-0 h-full overflow-hidden"
                  style={{ width: `${decimalPart * 100}%` }}
                >
                  <StarSolid color="#FDB813" className="w-6 h-6" />
                </div>
              </div>
            );
          } else {
            return <Star key={index} color="#FDB813" className="w-6 h-6" />;
          }
        })}
      </div>
    );
  };

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col justify-between px-6 py-4">
        <Heading level="h2">Review And Ratings</Heading>
        <div>
          <Heading level="h2" className="mt-6">
            Ratings(
            <span className="text-sm">{productReviews.totalRatings}</span>)
            <div className="flex gap-x-2 mt-4 ">
              {renderStars(productReviews.averageRating)}
            </div>
            <button
              className="text-blue-500 hover:underline font-medium mt-2"
              onClick={() => setShowReviews(!showReviews)}
            >
              Click here to view reviews
            </button>
          </Heading>
        </div>
      </div>

      {showReviews && (
        <div className="px-6 py-4">
          <Heading level="h2">
            User Reviews({productReviews.totalComments})
          </Heading>
          {productReviews.reviews.length > 0 ? (
            productReviews.reviews.map((review, index) => (
              <div key={index} className="border-b py-4 overflow-y-auto">
                <p className="font-medium">{review.customerName}</p>
                <div className="flex items-center relative gap-x-2 mt-1">
                  <p className="mt-1">{renderStars(review.rating)}</p>

                  {/* Badge now only references the current review's variant */}
                  <Badge
                    className="flex absolute top-0 right-[9rem] cursor-pointer"
                    size="xsmall"
                    onClick={() => navigate(`variants/${review?.variant?.id}`)}
                  >
                    {review?.variant?.sku || "Unknown"}
                  </Badge>
                </div>
                <p className="text-gray-700 mt-2">{review?.comment}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 mt-4">No reviews yet.</p>
          )}

          <div className=" mt-3 flex items-center justify-between gap-x-4 ml-auto mr-6 text-[14px] font-normal">
            <div>
              <span>
                {currentPage} of {totalPages} pages
              </span>
            </div>
            <div className=" flex justify-between">
              <button
                disabled={currentPage === 1 || loading}
                onClick={() => handleClick(currentPage - 1)}
                className={`px-3 py-1 rounded flex items-center gap-2 ${
                  currentPage === 1 || loading
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-black hover:bg-gray-200"
                }`}
              >
                {loading && currentPage !== totalPages && (
                  <span className="animate-spin h-4 w-4 border-2 border-t-transparent border-black rounded-full"></span>
                )}
                Prev
              </button>

              <button
                disabled={
                  currentPage === totalPages || loading || totalPages === 0
                }
                onClick={() => handleClick(currentPage + 1)}
                className={`px-3 py-1 rounded flex items-center gap-2 ${
                  currentPage === totalPages || loading || totalPages === 0
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-black hover:bg-gray-200"
                }`}
              >
                {loading && currentPage !== 1 && (
                  <span className="animate-spin h-4 w-4 border-2 border-t-transparent border-black rounded-full"></span>
                )}
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "product.details.side.before",
});

export default ProductWidget;
