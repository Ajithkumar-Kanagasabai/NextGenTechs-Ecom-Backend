import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text } from "@medusajs/ui"
import { useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import axios from "axios"

type WishlistResponse = {
  count: number
  message: string
  product_id: string
}

const ProductWidget = () => {
  const { id: productId } = useParams()
  const [data, setData] = useState<WishlistResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWishlistData = async () => {
      if (!productId) return

      try {
        setIsLoading(true)
        const res = await axios.get<WishlistResponse>(
          `${import.meta.env.VITE_API_URL}/admin/product/wishlists/${productId}`
        )
        setData(res.data)
      } catch (err: any) {
        console.error("Failed to fetch wishlist count", err)
        setError("Failed to fetch wishlist count.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchWishlistData()
  }, [productId])

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Wishlist</Heading>
      </div>
      <Text className="px-6 py-4">
        {isLoading && "Loading..."}
        {!isLoading && error && <span className="text-red-500">{error}</span>}
        {!isLoading && data && data.message}
      </Text>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.before",
})

export default ProductWidget
