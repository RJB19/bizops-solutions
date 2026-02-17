import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import SaleForm from '../components/SaleForm'
import { formatPrice } from '../utils/formatPrice'
import { useAuth } from '../utils/AuthContext'; // Import useAuth
import { useSalesCart } from '../utils/SalesCartContext'; // Import useSalesCart
import ReceiptModal from '../components/ReceiptModal'; // Import the new ReceiptModal component
import { getNetSaleItems } from '../services/products'; // Import getNetSaleItems

export default function Sales() {
  const { user } = useAuth(); // Get user from AuthContext
  const { isSaleFormOpen, toggleSaleForm, closeSaleForm, openSaleForm, cartItems } = useSalesCart(); // Use sales cart context
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false); // State for Receipt Modal
  const [selectedSale, setSelectedSale] = useState(null); // To hold the sale data for the receipt

  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 10

  // State for filters
  const [idFilter, setIdFilter] = useState('');
  const [productNameFilter, setProductNameFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // State for filter visibility
  const [isFilterVisible, setIsFilterVisible] = useState(false); // Initially hidden

  useEffect(() => {
    fetchSales()
  }, [])

  async function fetchSales() {
    setLoading(true)

    // Fetch net sale items
    const netSaleItems = await getNetSaleItems();

    // Transform flat netSaleItems into grouped sales structure for this component
    const groupedSalesMap = new Map();

    // Iterate over netSaleItems to group them by sale_id
    netSaleItems.forEach(item => {
      if (!groupedSalesMap.has(item.sale_id)) {
        groupedSalesMap.set(item.sale_id, {
          id: item.sale_id,
          // Placeholder for display_id - this would ideally come from the sales table directly
          // For now, let's use a truncated version of sale_id or a unique counter
          display_id: item.sale_id.substring(0, 8), 
          created_at: item.date,
          total_amount: 0, // Will sum up later
          cancelled_at: null, // getNetSaleItems already filters out cancelled sales
          sale_items: [],
        });
      }
      const sale = groupedSalesMap.get(item.sale_id);
      sale.sale_items.push({
        id: item.sale_item_id,
        product_id: item.product_id,
        quantity: item.quantity,
        selling_price: item.selling_price,
        products: { name: item.product_name, sku: item.sku }
      });
      sale.total_amount += item.amount; // Sum the net amount for the sale
    });
    
    // Convert map to array and sort by created_at
    const finalSales = Array.from(groupedSalesMap.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setSales(finalSales);
    setPage(1) // Reset to first page when new data is fetched
    setLoading(false)
  }

  async function cancelSale(sale) {
    if (sale.cancelled_at) return

    if (!confirm('Cancel this sale and restore stock?')) return

    // We need original sale items from the database, not net sale items.
    // Fetch raw sale items for this specific sale.
    const { data: items, error: saleItemsError } = await supabase
      .from('sale_items')
      .select('id, product_id, quantity, selling_price, cost_price')
      .eq('sale_id', sale.id);

    if (saleItemsError) {
      alert(saleItemsError.message);
      return;
    }
    if (items.length === 0) {
      alert('No items found for this sale to cancel.');
      return;
    }

    // Restore stock by creating new batches for each item
    for (const item of items) {
      // Create a new stock_batches entry for the restored item
      const { data: newBatch, error: newBatchError } = await supabase
        .from('stock_batches')
        .insert({
          product_id: item.product_id,
          quantity: item.quantity,
          remaining_quantity: item.quantity,
          cost_price: item.cost_price, // Use the average cost from the sale_item
          received_at: new Date(), // Date of restoration
          company_id: user.company_id,
        })
        .select()
        .single();

      if (newBatchError) {
        console.error('Error creating new batch for cancelled sale:', newBatchError.message);
        throw newBatchError; // Propagate error
      }

      // Log stock movement for restoration (pointing to the new batch)
      const { error: movementError } = await supabase.from('stock_movements').insert({
        product_id: item.product_id,
        batch_id: newBatch.id, // Reference the newly created batch
        quantity: item.quantity,
        movement_type: 'IN', // Stock is coming back IN
        reason: 'Cancelled Sale', // Add the reason
        reference_id: sale.id, // Reference the cancelled sale
        company_id: user.company_id,
      });

      if (movementError) {
        console.error('Error logging stock movement for cancelled sale:', movementError.message);
        // Decide on error handling: alert, log, or throw
      }
    }

    // Mark sale as cancelled
    const { error: cancelError } = await supabase
      .from('sales')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('id', sale.id)

    if (cancelError) {
      alert(cancelError.message)
      return
    }

    fetchSales()
  }

  // Helper function to check if sale is within 24 hours
  const isWithinOneWeek = (createdAt) => {
    const now = new Date();
    const saleDate = new Date(createdAt);
    const diffInMilliseconds = now - saleDate;
    const diffInHours = diffInMilliseconds / (1000 * 60 * 60);
    return diffInHours < 168;
  };

  // Apply filters to the sales data
  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.created_at);
    const isIdMatch = idFilter ? sale.display_id.includes(idFilter) : true;
    const isProductNameMatch = productNameFilter
      ? sale.sale_items.some(item =>
          item.products.name.toLowerCase().includes(productNameFilter.toLowerCase())
        )
      : true;
    
    // Date filtering: ensure both start and end dates are valid and comparison is made
    const isDateInRange = (() => {
      const itemDate = new Date(sale.created_at);

      if (startDateFilter) {
        const start = new Date(startDateFilter);
        start.setHours(0, 0, 0, 0);
        if (itemDate < start) {
          return false;
        }
      }

      if (endDateFilter) {
        const end = new Date(endDateFilter);
        end.setHours(23, 59, 59, 999);
        if (itemDate > end) {
          return false;
        }
      }

      return true;
    })();

    return isIdMatch && isProductNameMatch && isDateInRange;
  });

  // Pagination logic now uses filteredSales
  const totalPages = Math.ceil(filteredSales.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedSales = filteredSales.slice(startIndex, startIndex + pageSize);

  const handleFilterChange = () => {
    setPage(1); // Reset to first page when filters change
  };

  // Function to clear all filters
  const clearFilters = () => {
    setIdFilter('');
    setProductNameFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    handleFilterChange(); // Also resets page
  };

  // Function to open the receipt modal
  const handleViewReceipt = (sale) => {
    setSelectedSale(sale);
    setIsReceiptModalOpen(true);
  };

  // Function to close the receipt modal
  const handleCloseReceiptModal = () => {
    setIsReceiptModalOpen(false);
    setSelectedSale(null);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* <h1 className="text-2xl font-bold text-center">Sales</h1> */}

      {!isSaleFormOpen && (
        <div className="flex justify-center">
          <button
            onClick={openSaleForm}
            className="px-3 py-1 bg-blue-600 text-white rounded-lg mt-5"
          >
            Record Sale
          </button>
        </div>
      )}

      {isSaleFormOpen && (
        <SaleForm
          onClose={closeSaleForm} // Use closeSaleForm from context
          onSaved={fetchSales}
        />
      )}

      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">Filter Sales</h3>
            <button
              onClick={() => setIsFilterVisible(!isFilterVisible)}
              className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              {isFilterVisible ? 'Hide Filters' : 'Filter'}
            </button>
        </div>

        {isFilterVisible && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ID Filter */}
                <div className="flex flex-col">
                    <label htmlFor="id-filter" className="block text-sm font-medium text-gray-700 mb-1">Filter by ID</label>
                    <input
                    type="text"
                    id="id-filter"
                    value={idFilter}
                    onChange={(e) => { setIdFilter(e.target.value); handleFilterChange(); }}
                    placeholder="Enter Sale ID..."
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>

                {/* Product Name Filter */}
                <div className="flex flex-col">
                    <label htmlFor="product-name-filter" className="block text-sm font-medium text-gray-700 mb-1">Filter by Product Name</label>
                    <input
                    type="text"
                    id="product-name-filter"
                    value={productNameFilter}
                    onChange={(e) => { setProductNameFilter(e.target.value); handleFilterChange(); }}
                    placeholder="Enter Product Name..."
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>

                {/* Start Date Filter */}
                <div className="flex flex-col">
                    <label htmlFor="start-date-filter" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                    type="date"
                    id="start-date-filter"
                    value={startDateFilter}
                    onChange={(e) => { setStartDateFilter(e.target.value); handleFilterChange(); }}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>

                {/* End Date Filter */}
                <div className="flex flex-col">
                    <label htmlFor="end-date-filter" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                    type="date"
                    id="end-date-filter"
                    value={endDateFilter}
                    onChange={(e) => { setEndDateFilter(e.target.value); handleFilterChange(); }}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>
              </div>

              {/* Clear Filters Button */}
              <div className="flex justify-end">
                  <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
                  >
                  Clear Filters
                  </button>
              </div>
            </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 border text-left">ID</th>
              <th className="p-3 border">Items</th>
              <th className="p-3 border text-right">Total</th>
              <th className="p-3 border">Date</th>
              <th className="p-3 border">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="p-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : filteredSales.length === 0 ? ( // Use filteredSales.length to check if any sales match criteria
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  No sales found matching your criteria.
                </td>
              </tr>
            ) : (
              paginatedSales.map(sale => {
                const isCancelled = !!sale.cancelled_at;
                const canCancel = !isCancelled && isWithinOneWeek(sale.created_at);

                return (
                  <tr
                    key={sale.id}
                    className={`border-t align-top ${
                      isCancelled
                        ? 'opacity-50 bg-red-50 line-through'
                        : ''
                    }`}
                  >
                    <td className="p-3 border font-mono">
                      {sale.display_id}
                      {isCancelled && (
                        <div className="text-xs text-red-600 font-bold">
                          CANCELLED
                        </div>
                      )}
                    </td>

                    <td className="p-3 border space-y-1">
                      {sale.sale_items.map(item => (
                        <div
                          key={item.id}
                          className="flex justify-between gap-4"
                        >
                          <div>
                            <div className="font-medium">
                              {item.products.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              SKU: {item.products.sku || '-'}
                            </div>
                            <div className="text-xs">
                              {item.quantity} × ₱
                              {item.selling_price.toFixed(2)}
                            </div>
                          </div>

                          <div className="font-semibold">
                            {formatPrice(
                              item.quantity * item.selling_price
                            )}
                          </div>
                        </div>
                      ))}
                    </td>

                    <td className="p-3 border text-right font-bold">
                      {formatPrice(sale.total_amount)}
                    </td>

                    <td className="p-3 border text-sm">
                      {new Date(sale.created_at).toLocaleString()}
                    </td>

                    <td className="p-3 border">
                      {/* Cancel Button */}
                      {user?.role === 'admin' && canCancel && (
                        <button
                          onClick={() => cancelSale(sale)}
                          className={`mr-2 hover:underline ${!canCancel ? 'text-gray-400 cursor-not-allowed' : 'text-red-600'}`}
                        >
                          [Cancel/Return]
                        </button>
                      )}
                      {/* View Receipt Button */}
                      {/*
                      <button
                        onClick={() => handleViewReceipt(sale)}
                        className={`hover:underline ${
                          isCancelled
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-blue-600'
                        }`}
                        disabled={isCancelled}
                      >
                        Receipt
                      </button>
                      */}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex flex-col items-center mt-4">
          <div className="mb-2">
            Page {page} of {totalPages}
          </div>

          <div className="flex items-center space-x-2">
              <button
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                disabled={page === 1 || filteredSales.length === 0} // Disable if no sales or on first page
                onClick={() => setPage(p => p - 1)}
              >
                Prev
              </button>

              {/* Jump to Page Input */}
              <div className="flex items-center space-x-1 text-sm">
                <label htmlFor="jump-to-page-sales">Go to page:</label>
                <input
                  id="jump-to-page-sales"
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
                disabled={page === totalPages || filteredSales.length === 0} // Disable if no sales or on last page
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
        </div>
      )}

      {/* Render Receipt Modal */}
      <ReceiptModal
        open={isReceiptModalOpen}
        onClose={handleCloseReceiptModal}
        saleData={selectedSale}
      />
    </div>
  )
}