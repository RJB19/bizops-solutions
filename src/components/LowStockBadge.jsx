export default function LowStockBadge({ stock, threshold }) {
  if (stock === 0) {
    return (
      <span className="bg-red-100 text-gray-700 px-2 py-1 rounded text-sm">
        Zero Stock
      </span>
    )
  }

  if (stock <= threshold) {
    return (
      <span className="bg-gray-100 text-red-700 px-2 py-1 rounded text-sm">
        Low Stock
      </span>
    )
  }

  return (
    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">
      In Stock
    </span>
  )
}