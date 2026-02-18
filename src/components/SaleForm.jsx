import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { formatPrice } from '../utils/formatPrice'
import { calculateFifo } from '../utils/fifo'
import { useAuth } from '../utils/AuthContext';
import { useSalesCart } from '../utils/SalesCartContext';
import { getUniqueCategories } from '../services/products'; // Import getUniqueCategories

function AdjustPriceModal({ item, onClose, onAdjust }) {
  const [newPrice, setNewPrice] = useState(item.selling_price); // Use selling_price from item
  const [discount, setDiscount] = useState('0');

  useEffect(() => {
    // Initialize newPrice and discount when item changes
    setNewPrice(item.selling_price);
    if (item.original_selling_price > 0) {
      const discountPercent = ((item.original_selling_price - item.selling_price) / item.original_selling_price) * 100;
      setDiscount(discountPercent.toFixed(2));
    } else {
      setDiscount('0');
    }
  }, [item]);


  const handlePriceChange = (e) => {
    setNewPrice(e.target.value);
  };

  const handleDiscountChange = (e) => {
    setDiscount(e.target.value);
  };

  const handlePriceBlur = () => {
    const price = parseFloat(newPrice);
    if (!isNaN(price) && item.original_selling_price > 0) {
      const discountPercent = ((item.original_selling_price - price) / item.original_selling_price) * 100;
      setDiscount(discountPercent.toFixed(2));
    }
  };

  const handleDiscountBlur = () => {
    const discountPercent = parseFloat(discount);
    if (!isNaN(discountPercent)) {
      const discountedPrice = item.original_selling_price * (1 - discountPercent / 100);
      setNewPrice(discountedPrice.toFixed(2));
    }
  };

  const handleApply = () => {
    onAdjust(item.product.id, parseFloat(newPrice)); // Pass product.id and newPrice
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl space-y-4 w-full max-w-md">
        <h2 className="text-xl font-bold">Adjust Price for {item.product.name}</h2>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Original Price: {formatPrice(item.original_selling_price)}</label>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">New Selling Price</label>
            <input
              type="number"
              value={newPrice}
              onChange={handlePriceChange}
              onBlur={handlePriceBlur}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Discount (%)</label>
            <input
              type="number"
              value={discount}
              onChange={handleDiscountChange}
              onBlur={handleDiscountBlur}
              className="w-full border p-2 rounded"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}


export default function SaleForm({ onSaved }) {
  const { user } = useAuth();
  const { cartItems, addItemToCart, updateItemQuantity, removeItemFromCart, clearCart, closeSaleForm, updateItemPrice } = useSalesCart();
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('') // Renamed from selectedProductId
  const [quantity, setQuantity] = useState('')
  const [loading, setLoading] = useState(false)

  // Combobox specific states
  const [searchTerm, setSearchTerm] = useState('');
  const [displaySearchTerm, setDisplaySearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [adjustPriceModal, setAdjustPriceModal] = useState({ open: false, item: null });

  // New states for category filtering
  const [selectedCategory, setSelectedCategory] = useState(''); // Empty string means 'All Categories'
  const [uniqueCategories, setUniqueCategories] = useState([]);


  useEffect(() => {
    fetchProducts()
  }, [])

  // Fetch unique categories on mount
  useEffect(() => {
    async function fetchUniqueCategories() {
      try {
        const categories = await getUniqueCategories();
        setUniqueCategories(categories);
      } catch (error) {
        console.error('Error fetching unique categories for filter:', error);
      }
    }
    fetchUniqueCategories();
  }, []);

  async function fetchProducts() {
    const { data: productsData } = await supabase
      .from('products')
      .select('id, name, selling_price, sku, archived_at, category') // Added category
      .is('archived_at', null) // Filter out archived products

    const { data: stockData } = await supabase
      .from('stock_batches')
      .select('product_id, remaining_quantity')

    const stockMap = {}
    stockData?.forEach(row => {
      stockMap[row.product_id] =
        (stockMap[row.product_id] || 0) + row.remaining_quantity
    })

    setProducts(
      productsData
        .map(p => ({ ...p, stock: stockMap[p.id] || 0 }))
        .filter(p => p.stock > 0) // Keep existing stock filter
    )
  }

  // Combobox helper functions
  const filteredProducts = products
    .filter(p =>
      (selectedCategory === '' || (p.category && p.category.trim().toLowerCase() === selectedCategory)) && // Category filter
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => a.name.localeCompare(b.name)); // Explicit sort after filtering

  const handleSelectProduct = (product) => {
    setProductId(product.id);
    setDisplaySearchTerm(`${product.name} (${product.sku})`);
    setSearchTerm('');
    setShowDropdown(false);
  };
  
  const handleToggleDropdown = () => {
    if (!showDropdown && productId) {
      setSearchTerm('');
      setDisplaySearchTerm('');
      setProductId('');
    } else if (!showDropdown && displaySearchTerm) {
      setSearchTerm(displaySearchTerm);
    }
    setShowDropdown(prev => !prev);
  }

  const handleInputChange = (e) => {
    const value = e.target.value;
    setDisplaySearchTerm(value);
    setSearchTerm(value);
    setProductId('');
    setShowDropdown(true);
  };



  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setSelectedCategory(newCategory);
    // Reset product selection when category changes
    setProductId('');
    setDisplaySearchTerm('');
    setSearchTerm('');
    setShowDropdown(false);
  };


  function handleAddToCart() {
    const qty = Number(quantity)
    if (!qty || qty <= 0) {
      alert('Quantity must be greater than 0')
      return
    }

    const product = products.find(p => p.id === productId)
    if (!product) return

    const existingItemInCart = cartItems.find(item => item.product.id === product.id);

    if (existingItemInCart?.cancelled) {
        alert('This item was cancelled and cannot be re-added.');
        return;
    }

    const alreadyInCartQty = existingItemInCart ? existingItemInCart.quantity : 0;

    if (alreadyInCartQty + qty > product.stock) {
      alert(`Only ${product.stock} items available in stock for ${product.name}`);
      return;
    }

    addItemToCart(product, qty, product.selling_price);
    setQuantity('');
    setProductId('');
    setDisplaySearchTerm('');
  }

  const total = cartItems
    .filter(i => !i.cancelled)
    .reduce((sum, i) => sum + i.quantity * i.selling_price, 0)
  
  const handleOpenAdjustPrice = (item) => {
    setAdjustPriceModal({ open: true, item });
  }

  const handleAdjustPrice = (productIdToAdjust, newPrice) => {
    // Find the item in the cartItems and update its selling_price
    const itemToUpdate = cartItems.find(item => item.product.id === productIdToAdjust);
    if (itemToUpdate) {
      // Update the item in the cart using the context's updateItemPrice function
      updateItemPrice(productIdToAdjust, newPrice);
    }
  };
  
  async function confirmSale() {
    const activeItems = cartItems.filter(i => !i.cancelled)

    if (activeItems.length === 0) {
      alert('Add at least one item to cart')
      return
    }

    if (!window.confirm('Are you sure you want to save this sale?')) {
      return; // If user cancels, stop the function
    }

    setLoading(true)

    try {
      // Final stock check
      for (const item of activeItems) {
        const { data: stockData } = await supabase
          .from('stock_batches')
          .select('remaining_quantity')
          .eq('product_id', item.product.id)
          .eq('company_id', user.company_id) // Add company_id filter
          .then(({ data, error }) => {
            if (error) throw error;
            return { data };
          });


        const totalStock = stockData.reduce(
          (sum, b) => sum + b.remaining_quantity,
          0
        )

        if (item.quantity > totalStock) {
          alert(`Not enough stock for ${item.product.name}`)
          setLoading(false)
          return
        }
      }

      // Create sale
      const { data: sale, error } = await supabase
        .from('sales')
        .insert({ total_amount: total, company_id: user.company_id })
        .select()
        .single()

      if (error) throw error

      // Save items + deduct stock
      for (const item of activeItems) {
        const { data: batches } = await supabase
          .from('stock_batches')
          .select('*')
          .eq('product_id', item.product.id)
          .eq('company_id', user.company_id) // Add company_id filter
          .gt('remaining_quantity', 0)
          .order('received_at', { ascending: true })

        const { costOfGoodsSold, updatedBatches } = calculateFifo(
          batches,
          item.quantity
        );

        await supabase.from('sale_items').insert({
          sale_id: sale.id,
          product_id: item.product.id,
          quantity: item.quantity,
          selling_price: item.selling_price,
          original_product_price: item.original_selling_price, // Add this line
          cost_price: costOfGoodsSold / item.quantity, // Store the average cost per item
        });

        // Identify which batches were used and if it was a multi-batch transaction
        const usedBatches = updatedBatches.filter(b => b.original_quantity > b.remaining_quantity);
        const isMultiBatch = usedBatches.length > 1;
        let batchCounter = 0;

        for (const batch of usedBatches) {
          batchCounter++;
          const deductedAmount = batch.original_quantity - batch.remaining_quantity;

          const { error: updateError } = await supabase
            .from('stock_batches')
            .update({ remaining_quantity: batch.remaining_quantity })
            .eq('id', batch.id)
            .eq('company_id', user.company_id);

          if (updateError) throw updateError;

          // Create a note if it's a multi-batch sale
          const movementNote = isMultiBatch 
            ? `Part ${batchCounter} of ${usedBatches.length} from multi-batch sale.` 
            : null;

          // Log stock movement for this deduction
          const { error: movementError } = await supabase.from('stock_movements').insert({
            product_id: item.product.id,
            batch_id: batch.id,
            quantity: deductedAmount,
            movement_type: 'OUT',
            reason: 'Sale',
            notes: movementNote, // Add the note here
            reference_id: sale.id,
            company_id: user.company_id,
          });

          if (movementError) {
            console.error('Error logging stock movement for sale:', movementError.message);
          }
        }
      }

      clearCart(); // Clear the cart after successful sale
      onSaved();
      closeSaleForm(); // Close the form using context function
    } catch (err) {
      alert(err.message || 'Failed to save sale')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow space-y-4">
      <h2 className="text-xl font-bold">Record Sale</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        {/* Category Filter Dropdown */}
        <select
          className="w-full border p-2 rounded"
          value={selectedCategory}
          onChange={handleCategoryChange}
        >
          <option value="">All Categories</option>
          {uniqueCategories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>

        {/* Product Combobox */}
        <div className="relative col-span-1">
          <input
            type="text"
            placeholder="Search or Select Product"
            className="w-full border p-2 rounded pr-10"
            value={displaySearchTerm}
            onChange={handleInputChange}
            onFocus={() => {
              if (productId) {
                setSearchTerm('');
              } else if (displaySearchTerm) {
                setSearchTerm(displaySearchTerm);
              }
              setShowDropdown(true);
            }}
            onBlur={() => setTimeout(() => setShowDropdown(false), 100)}
            required
          />
          <button
            type="button"
            onClick={handleToggleDropdown}
            className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"
          >
            {showDropdown ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {showDropdown && (
            <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <li className="p-2 text-gray-500">No products found.</li>
              ) : (
                filteredProducts.map(p => (
                  <li
                    key={p.id}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onMouseDown={() => handleSelectProduct(p)}
                  >
                    {p.name} ({p.sku}) (Stock: {p.stock})
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        {/* Quantity Input (remains) */}
        <input
          type="number"
          step="any"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          className="border p-2 rounded"
          placeholder="Quantity"
        />

        {/* Add Button (remains) */}
        <button
          onClick={handleAddToCart}
          className="bg-blue-600 text-white rounded px-4 py-2"
          disabled={!productId || !quantity || loading}
        >
          Add
        </button>
      </div>

      {/* Warning for unselected product */}
      {!productId && displaySearchTerm && (
        <p className="text-sm text-red-500">Please select a product from the list.</p>
      )}

      {productId && !products.some(p => p.id === productId && displaySearchTerm === `${p.name} (${p.sku})`) && (
        <p className="text-sm text-orange-500">Selected product: {displaySearchTerm}. Ensure it matches a list item.</p>
      )}

      <div>
        {cartItems.length === 0 ? (
          <p className="text-gray-500">No items added</p>
        ) : (
          cartItems.map(item => {
            const isCancelled = item.cancelled

            return (
              <div
                key={item.product.id} // Use item.product.id as key
                className={`flex justify-between items-center border-b py-2 ${
                  isCancelled ? 'opacity-50' : ''
                }`}
              >
                <div className={`${isCancelled ? 'line-through' : ''}`}>
                  <div className="font-medium">
                    {item.product.name}
                    {isCancelled && (
                      <span className="ml-2 text-xs text-red-600 font-semibold">
                        (Cancelled)
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                  {item.quantity} × {formatPrice(item.selling_price)}
                    {item.selling_price !== item.original_selling_price && (
                      <span className="ml-2 text-xs text-blue-600">
                        (Original: {formatPrice(item.original_selling_price)})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">

                {isCancelled ? (
                  <button
                    onClick={() =>
                      updateItemQuantity(item.product.id, item.quantity) // Re-add item with same quantity
                    }
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Undo
                  </button>
                ) : (
                  <>
                  <button
                    onClick={() => handleOpenAdjustPrice(item)}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Adjust Price (discount or mark up)
                  </button>
                  <button
                    onClick={() =>
                      removeItemFromCart(item.product.id) // Remove item from cart
                    }
                    className="text-red-600 hover:underline text-sm"
                  >
                    Remove
                  </button>
                  </>
                )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="text-right font-bold">
        Total: {formatPrice(total)}
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={closeSaleForm} className="px-4 py-2 border rounded">
          Close
        </button>

        <button
          onClick={confirmSale}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Saving Sale...' : 'Save Sale'}
        </button>
      </div>
      {adjustPriceModal.open && (
        <AdjustPriceModal
          item={adjustPriceModal.item}
          onClose={() => setAdjustPriceModal({ open: false, item: null })}
          onAdjust={handleAdjustPrice}
        />
      )}
    </div>
  )
}
