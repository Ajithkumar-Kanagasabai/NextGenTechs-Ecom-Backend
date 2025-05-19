import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import axios from "axios"
import { Input, Button } from "@medusajs/ui"
import { defineWidgetConfig } from "@medusajs/admin-sdk"

const EstimatedDeliveryWidget = () => {
  const { id } = useParams()
  const productId = id ?? ""

  const [estimatedDelivery, setEstimatedDelivery] = useState("")
  const [originalDelivery, setOriginalDelivery] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/admin/products/${productId}`,
          { withCredentials: true }
        )
        const delivery = response.data?.product?.metadata?.estimated_delivery || ""
        setEstimatedDelivery(delivery)
        setOriginalDelivery(delivery)
      } catch (err) {
        console.error("Failed to fetch product:", err)
      } finally {
        setIsLoading(false)
      }
    }

    if (productId) {
      fetchProduct()
    }
  }, [productId])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/admin/products/${productId}`,
        { metadata: { estimated_delivery: estimatedDelivery } },
        { withCredentials: true }
      )
      setOriginalDelivery(estimatedDelivery)
      setIsEditing(false)
    } catch (err) {
      console.error("Failed to save estimated delivery:", err)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="p-4 bg-white rounded-xl border shadow-sm">
      <h2 className="text-lg font-medium mb-4">Estimated Delivery</h2>
      {!isEditing ? (
        <div className="flex items-center justify-between">
          <span>{originalDelivery || "Not set"}</span>
          <Button variant="secondary" size="base" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Input
            placeholder="e.g., 2–5 business days"
            value={estimatedDelivery}
            onChange={(e) => setEstimatedDelivery(e.target.value)}
          />
          <div className="flex gap-2">
            <Button isLoading={isSaving} onClick={handleSave}>
              Save
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setEstimatedDelivery(originalDelivery)
                setIsEditing(false)
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.before",
})

export default EstimatedDeliveryWidget