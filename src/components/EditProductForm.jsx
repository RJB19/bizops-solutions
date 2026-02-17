import { useState } from 'react'
import { updateProduct } from '../services/products'

export default function EditProductForm({ product, onClose, onSaved }) {
  const [price, setPrice] = useState(product.selling_price)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    try {
      await updateProduct(product.id, {
        selling_price: Number(price),
      })

      onSaved()
      onClose()
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded shadow p-6 w-full max-w-sm space-y-4"
      >
        <h2 className="text-lg font-semibold">Edit Selling Price</h2>

        <p className="text-sm text-gray-600">{product.name}</p>

        <input
          type="number"
          step="0.01"
          className="w-full border rounded p-2"
          value={price}
          onChange={e => setPrice(e.target.value)}
          required
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}