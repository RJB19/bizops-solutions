import { useEffect, useState, useRef } from 'react'
import { supabase } from '../services/supabase'
import ProductForm from '../components/ProductForm'
import EditProductForm from '../components/EditProductForm'
import {
  archiveProduct,
  unarchiveProduct,
  updateProductPrice,
  updateProduct,
  logProductChanges,
  getUniqueCategories, // Import the new function
} from '../services/products'
import PriceHistoryModal from '../components/PriceHistoryModal'
import { formatPrice } from '../utils/formatPrice'
import StockInForm from '../components/StockInForm'
import { useAuth } from '../utils/AuthContext';
import { useProductForm } from '../utils/ProductFormContext'; // Import useProductForm
import { useStockInForm } from '../utils/StockInFormContext'; // Import useStockInForm

export default function Products() {
  const { user } = useAuth(); // Get user from AuthContext
  const { isProductFormOpen, openProductForm, closeProductForm, resetProductForm } = useProductForm(); // Use product form context
  const { isStockInFormOpen, openStockInForm, closeStockInForm, resetStockInForm } = useStockInForm(); // Use stock in form context
  const [allProducts, setAllProducts] = useState([]); // Store all fetched products before filtering
  const [activeProducts, setActiveProducts] = useState([]) // These are the filtered active products
  // const [categorizedProducts, setCategorizedProducts] = useState({}) // Removed categorizedProducts state
  const [archivedProducts, setArchivedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingProduct, setEditingProduct] = useState(null)
  const [editingProductId, setEditingProductId] = useState(null)
  const [tempPrice, setTempPrice] = useState('')
  const [tempUnit, setTempUnit] = useState('')
  const [tempThreshold, setTempThreshold] = useState('')
  const [savingPrice, setSavingPrice] = useState(false); // New state
  const [search, setSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 200
  const [showPriceHistory, setShowPriceHistory] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState([])
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const [highlightedThreshold, setHighlightedThreshold] = useState({ productId: null, timer: null });
  const [highlightedUnit, setHighlightedUnit] = useState({ productId: null, timer: null });
  const [highlightedPrice, setHighlightedPrice] = useState({ productId: null, timer: null });
  const [highlightedRow, setHighlightedRow] = useState({ productId: null, timer: null });
  const [highlightedStock, setHighlightedStock] = useState({ productId: null, timer: null });

  // New state for category filtering
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

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProductDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownRef])

  async function fetchProducts() {
    setLoading(true)
    const { data: productsData, error } = await supabase
      .from('products')
      .select('id, name, sku, unit, selling_price, low_stock_threshold, archived_at, category, brand, model')

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    const { data: stockData } = await supabase
      .from('stock_batches')
      .select('product_id, remaining_quantity, cost_price, received_at')
      .order('received_at', { ascending: false }); // Latest batches first

    const stockMap = {};
    const latestCostMap = {};

    stockData?.forEach(row => {
      // Aggregate total stock
      stockMap[row.product_id] =
        (stockMap[row.product_id] || 0) + Number(row.remaining_quantity);

      // Store the latest cost for each product
      if (!latestCostMap[row.product_id]) {
        latestCostMap[row.product_id] = row.cost_price;
      }
    });

    const merged = productsData.map(p => ({
      ...p,
      total_stock: stockMap[p.id] || 0,
      current_cost: latestCostMap[p.id] || 0, // Assign 0 if no stock history
    }));

    setAllProducts(merged); // Store all products
    setArchivedProducts(merged.filter(p => p.archived_at));
    setLoading(false)
  }

  useEffect(() => {
    // Apply filters whenever allProducts or filter criteria change
    const filteredAndSorted = allProducts.filter(p => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.brand || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.model || '').toLowerCase().includes(search.toLowerCase());

      const matchLowStock =
        !lowStockOnly || p.total_stock <= p.low_stock_threshold;
      const matchProduct =
        selectedProducts.length === 0 || selectedProducts.includes(p.id);
      
      const matchCategory =
        selectedCategory === '' || (p.category && p.category.trim().toLowerCase() === selectedCategory);

      return matchSearch && matchLowStock && matchProduct && matchCategory && !p.archived_at;
    }).sort((a, b) => a.name.localeCompare(b.name));

    setActiveProducts(filteredAndSorted); // Update active products based on filters
    setPage(1); // Reset to first page on filter change

  }, [allProducts, search, lowStockOnly, selectedProducts, selectedCategory]); // Add selectedCategory as a dependency


  const handleProductSelection = productId => {
    setSelectedProducts(prevSelected =>
      prevSelected.includes(productId)
        ? prevSelected.filter(id => id !== productId)
        : [...prevSelected, productId]
    )
  }

  // The filteredProducts and pagination logic now applies to activeProducts
  const totalPages = Math.ceil(activeProducts.length / pageSize);
  const startIndex = (page - 1) * pageSize
  const paginatedProducts = activeProducts.slice(
    startIndex,
    startIndex + pageSize
  )

  const handleProductFormSuccess = (newProductId) => {
    fetchProducts();
    closeProductForm();
    resetProductForm();
    if (highlightedRow.timer) {
      clearTimeout(highlightedRow.timer);
    }
    const timer = setTimeout(() => {
      setHighlightedRow({ productId: null, timer: null });
    }, 180000); // 3 minutes
    setHighlightedRow({ productId: newProductId, timer });
  };

  const handleStockInFormSuccess = (updatedProductId) => {
    fetchProducts();
    closeStockInForm();
    resetStockInForm();
    if (highlightedStock.timer) {
      clearTimeout(highlightedStock.timer);
    }
    const timer = setTimeout(() => {
      setHighlightedStock({ productId: null, timer: null });
    }, 180000); // 3 minutes
    setHighlightedStock({ productId: updatedProductId, timer });
  };

  const clearFilters = () => {
    setSearch('');
    setLowStockOnly(false);
    setSelectedProducts([]);
    setSelectedCategory('');
  };

  const showClearButton = search !== '' || lowStockOnly || selectedProducts.length > 0 || selectedCategory !== '';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 mt-5">
      {/* Forms */}
      <div className="flex flex-row justify-center gap-4 mb-8"> {/* Added justify-center */}
        {!isStockInFormOpen && !isProductFormOpen && ( /* Added !isProductFormOpen condition */
          <div> {/* Removed justify-center */}
            <button
              onClick={openStockInForm}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg"
            >
              Add Stock
            </button>
          </div>
        )}
        {isStockInFormOpen && (
          <div className="bg-white rounded shadow p-4"> {/* Removed mb-4 */}
            <StockInForm
              onSuccess={handleStockInFormSuccess}
            />
          </div>
        )}

        {!isProductFormOpen && !isStockInFormOpen && ( /* Added !isStockInFormOpen condition */
          <div> {/* Removed justify-center */}
            <button
              onClick={openProductForm}
              className="px-3 py-1 bg-green-600 text-white rounded-lg"
            >
              Add New Product
            </button>
          </div>
        )}
        {isProductFormOpen && (
          <div className="bg-white rounded shadow p-4"> {/* Removed mb-4 */}
            <ProductForm
              onSuccess={handleProductFormSuccess}
            />
          </div>
        )}
      </div>

      <h2 className="text-2xl font-bold">Active Products</h2>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-4 items-center">
        <input
          type="text"
          placeholder="Search name or SKU, Category, Brand, Model"
          className="border p-2 rounded w-full md:w-1/3"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* New Category Filter Dropdown */}
        <select
          className="border p-2 rounded w-full md:w-1/3"
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {uniqueCategories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>

        <div className="relative w-full md:w-1/3" ref={dropdownRef}>
          <button
            onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
            className="border p-2 rounded w-full text-left"
          >
            {selectedProducts.length > 0
              ? `${selectedProducts.length} products selected`
              : 'Filter by Product'}
          </button>
          {isProductDropdownOpen && (
            <div
              className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1"
              style={{ backgroundColor: 'white' }}
            >
              <div className="max-h-48 overflow-y-auto">
                {activeProducts.map(p => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-100"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(p.id)}
                      onChange={() => handleProductSelection(p.id)}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
              <div className="p-2 border-t flex justify-end gap-2">
                <button
                  onClick={() => setSelectedProducts([])}
                  className="text-sm text-gray-600 hover:underline"
                >
                  Clear
                </button>
                <button
                  onClick={() => setIsProductDropdownOpen(false)}
                  className="text-sm bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={e => setLowStockOnly(e.target.checked)}
          />
          Low stock only
        </label>
        {showClearButton && (
          <button
            onClick={clearFilters}
            className="px-3 py-1 bg-gray-300 text-gray-800 rounded-lg whitespace-nowrap"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Product List */}
      <div className="bg-white rounded shadow p-4">
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2 text-left">Product</th>
                  <th className="border p-2">SKU</th>
                  <th className="border p-2">Unit</th>
                  <th className="border p-2">Category</th>
                  <th className="border p-2">Brand</th>
                  <th className="border p-2">Model</th>
                  <th className="border p-2">Selling Price</th>
                  <th className="border p-2">Current Cost</th>
                  <th className="border p-2">Stock</th>
                  <th className="border p-2">Threshold</th>
                  <th className="border p-2">Status</th>
                  <th className="border p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.length > 0 ? (
                  paginatedProducts.map(p => (
                    <tr key={p.id} className={`${highlightedRow.productId === p.id ? 'bg-green-200 transition-colors duration-1000' : ''}`}>
                      <td className="border p-2">{p.name}</td>
                      <td className="border p-2 text-center">{p.sku || '-'}</td>
                      <td className="border p-2 text-center">{p.unit || '-'}</td>
                      <td className="border p-2 text-center">{p.category || '-'}</td>
                      <td className="border p-2 text-center">{p.brand || '-'}</td>
                      <td className="border p-2 text-center">{p.model || '-'}</td>
                      <td className={`border p-2 text-right ${highlightedPrice.productId === p.id ? 'bg-green-200 transition-colors duration-1000' : ''}`}>
                        {editingProductId === p.id ? (
                          <input
                            type="number"
                            className="border rounded px-2 py-1 w-24 text-right"
                            value={tempPrice}
                            onChange={e => setTempPrice(e.target.value)}
                          />
                        ) : (
                          formatPrice(p.selling_price)
                        )}
                      </td>
                      <td className="border p-2 text-right">{formatPrice(p.current_cost)}</td>
                      <td className={`border p-2 text-center ${highlightedStock.productId === p.id ? 'bg-blue-200 transition-colors duration-1000' : ''}`}>{p.total_stock}</td>
                      <td className={`border p-2 text-center ${highlightedThreshold.productId === p.id ? 'bg-yellow-200 transition-colors duration-1000' : ''}`}>
                        {editingProductId === p.id ? (
                          <input
                            type="number"
                            className="border rounded px-2 py-1 w-24 text-center"
                            value={tempThreshold}
                            onChange={e => setTempThreshold(e.target.value)}
                          />
                        ) : (
                          p.low_stock_threshold
                        )}
                      </td>
                      <td className="border p-2 text-center">
                        {p.total_stock === 0 ? (
                          <span style={{ color: 'red' }}>Zero Stock</span>
                        ) : p.total_stock <= p.low_stock_threshold ? (
                          <span style={{ color: 'orange' }}>Low Stock</span>
                        ) : (
                          <span>In Stock</span>
                        )}
                      </td>
                      <td className="border p-2 text-center">
                        {user?.role === 'admin' ? (
                          editingProductId === p.id ? (
                            <>
                              <button
                                className="text-green-600 mr-2"
                                onClick={async () => {
                                  setSavingPrice(true); // Start saving
                                  try {
                                    const priceUpdateResult = await updateProductPrice(p, Number(tempPrice));
                                              
                                    let finalPriceUpdateResult = priceUpdateResult;
                                    if (priceUpdateResult.shouldConfirm) {
                                      if (window.confirm(priceUpdateResult.message)) {
                                        finalPriceUpdateResult = await updateProductPrice(p, Number(tempPrice), true); // Force update
                                      } else {
                                        // If user cancels confirmation, stay in edit mode
                                        return;
                                      }
                                    }
                                              
                                    if (finalPriceUpdateResult.success) {
                                      const productUpdateResult = await updateProduct(p.id, { unit: tempUnit, low_stock_threshold: Number(tempThreshold) });
                                              
                                      if (productUpdateResult.success) {
                                        // Log all changes at once
                                        await logProductChanges(p.id, finalPriceUpdateResult.priceHistory, productUpdateResult.attributeHistory);
                                              
                                        setEditingProductId(null);
                                        fetchProducts();
                                              
                                        // Highlight logic for Unit
                                        if (p.unit !== tempUnit) {
                                          if (highlightedUnit.timer) {
                                            clearTimeout(highlightedUnit.timer);
                                          }
                                          const unitTimer = setTimeout(() => {
                                            setHighlightedUnit({ productId: null, timer: null });
                                          }, 180000); // 3 minutes
                                          setHighlightedUnit({ productId: p.id, timer: unitTimer });
                                        }
                                              
                                        // Highlight logic for Stock Threshold
                                        if (p.low_stock_threshold !== Number(tempThreshold)) {
                                          if (highlightedThreshold.timer) {
                                            clearTimeout(highlightedThreshold.timer);
                                          }
                                          const thresholdTimer = setTimeout(() => {
                                            setHighlightedThreshold({ productId: null, timer: null });
                                          }, 180000); // 3 minutes
                                          setHighlightedThreshold({ productId: p.id, timer: thresholdTimer });
                                        }
                                              
                                        // Highlight logic for Selling Price
                                        if (p.selling_price !== Number(tempPrice)) {
                                          if (highlightedPrice.timer) {
                                            clearTimeout(highlightedPrice.timer);
                                          }
                                          const priceTimer = setTimeout(() => {
                                            setHighlightedPrice({ productId: null, timer: null });
                                          }, 180000); // 3 minutes
                                          setHighlightedPrice({ productId: p.id, timer: priceTimer });
                                        }
                                      } else {
                                        alert('Failed to update product attributes.');
                                      }
                                    } else {
                                      alert('Failed to update selling price.');
                                    }                                  } catch (err) {
                                    alert(err.message);
                                    // Stay in edit mode if an error occurs
                                  } finally {
                                    setSavingPrice(false); // End saving
                                  }
                                }}
                                disabled={savingPrice}
                              >
                                {savingPrice ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                className="text-gray-600"
                                onClick={() => setEditingProductId(null)}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              className="text-blue-600 hover:underline"
                              onClick={() => {
                                setEditingProductId(p.id)
                                setTempPrice(p.selling_price)
                                setTempUnit(p.unit)
                                setTempThreshold(p.low_stock_threshold)
                              }}
                            >
                              Edit
                            </button>
                          )
                        ) : null}
                        {user?.role === 'admin' && p.total_stock === 0 && (
                          <button
                            onClick={async () => {
                              if (
                                !confirm(
                                  `Archive "${p.name}"? It will be hidden from the main list.`
                                )
                              )
                                return
                              try {
                                await archiveProduct(p.id)
                                fetchProducts()
                              } catch (err) {
                                alert(err.message)
                              }
                            }}
                            className="text-red-600 hover:underline ml-2"
                          >
                            Archive
                          </button>
                        )}
                        <button
                          onClick={() => setShowPriceHistory(p.id)}
                          className="text-gray-600 hover:underline ml-2"
                        >
                          History
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="12" className="text-center p-4">No products found for the selected filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination & Modals */}
      {totalPages > 1 && (
        <div className="flex flex-col md:flex-row justify-between items-center mt-4 space-y-2 md:space-y-0">
          {/* Page Info */}
          <div className="text-sm text-gray-700">
            Page {page} of {totalPages}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center space-x-2">
            <button
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Prev
            </button>

            {/* Jump to Page Input */}
            <div className="flex items-center space-x-1 text-sm">
              <label htmlFor="jump-to-page-products">Go to page:</label>
              <input
                id="jump-to-page-products"
                type="number"
                min="1"
                max={totalPages}
                value={page}
                onChange={e => {
                  let pageNum = parseInt(e.target.value, 10);
                  if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
                  if (pageNum > totalPages) pageNum = totalPages;
                  setPage(pageNum);
                }}
                className="w-16 border rounded p-1 text-center"
              />
            </div>

            <button
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
      {showPriceHistory && (
        <PriceHistoryModal
          productId={showPriceHistory}
          onClose={() => setShowPriceHistory(null)}
        />
      )}
      {editingProduct && (
        <EditProductForm
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={fetchProducts}
        />
      )}

      {/* Archived Products Section */}
      {archivedProducts.length > 0 && user?.role === 'admin' && ( // Only show archived section to admin
        <div className="mt-8">
          <label className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={e => setShowArchived(e.target.checked)}
            />
            Show Archived Products ({archivedProducts.length})
          </label>
          {showArchived && (
            <div className="bg-white rounded shadow p-4">
              <h2 className="text-xl font-bold mb-4">Archived Products</h2>
              <div className="overflow-x-auto">
                <table className="w-full border border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border p-2 text-left">Product</th>
                      <th className="border p-2">SKU</th>
                      <th className="border p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedProducts.map(p => (
                      <tr key={p.id}>
                        <td className="border p-2">{p.name}</td>
                        <td className="border p-2 text-center">
                          {p.sku || '-'}
                        </td>
                        <td className="border p-2 text-center">
                          <button
                            onClick={async () => {
                              await unarchiveProduct(p.id)
                              fetchProducts()
                            }}
                            className="text-green-600 hover:underline"
                          >
                            Unarchive
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
