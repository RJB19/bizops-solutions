import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { formatPrice } from '../utils/formatPrice'
import { useAuth } from '../utils/AuthContext'; // Import useAuth

export default function StockInHistory() {
  const { user } = useAuth(); // Get user from context
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // State for filters
  const [productNameFilter, setProductNameFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // State for filter visibility
  const [isFilterVisible, setIsFilterVisible] = useState(false); // Initially hidden

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    console.log('StockInHistory: fetching batches for company_id:', user?.company_id);

    try {
      const { data: movements, error } = await supabase
        .from('stock_movements')
        .select(
          `
          batch_id,
          stock_batches (
            id,
            quantity,
            cost_price,
            received_at,
            products ( name, sku )
          )
        `
        )
        .eq('company_id', user?.company_id)
        .eq('movement_type', 'IN')
        .eq('reason', 'Stock In')
        .order('received_at', { foreignTable: 'stock_batches', ascending: false });

      if (error) {
        console.error('StockInHistory: Error fetching stock movements:', error.message);
        setLoading(false); // Ensure loading is turned off even on error
        return;
      }
      console.log('StockInHistory: Raw movements data:', movements);

      // Extract only the batch data from the movements
      const uniqueBatches = movements
        .filter(movement => movement.stock_batches !== null) // Ensure batch data exists
        .map(movement => movement.stock_batches)
        .sort((a, b) => new Date(b.received_at) - new Date(a.received_at));
      
      console.log('StockInHistory: Unique batches after processing:', uniqueBatches);
      setBatches(uniqueBatches || []);
    } catch (error) {
      console.error('StockInHistory: Error fetching stock batches (catch block):', error.message);
    } finally {
      setLoading(false);
    }
  }, [user?.company_id, setBatches, setLoading, supabase]);

  useEffect(() => {
    // Only fetch batches if user and company_id are available
    if (user?.company_id) {
      fetchBatches();
    } else {
      setLoading(false); // If no company_id, stop loading and show no data
      setBatches([]);
    }

    const subscription = supabase
      .channel('stock_in_history')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_movements' }, payload => {
        // Refetch only if the change is relevant to our filtered view
        if (payload.new?.movement_type === 'IN' && payload.new?.reason === 'Stock In' && payload.new?.company_id === user?.company_id) {
          fetchBatches();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchBatches, user ? user.company_id : undefined, supabase]);

  // Apply filters to the batches data
  const filteredBatches = batches.filter(batch => {
    const receivedDate = new Date(batch.received_at);

    // Product Name Filter
    const isProductNameMatch = productNameFilter
      ? batch.products?.name.toLowerCase().includes(productNameFilter.toLowerCase())
      : true;

    // Date Range Filter
    const isDateInRange = (() => {
      const itemDate = new Date(batch.received_at);

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

    return isProductNameMatch && isDateInRange;
  });

  // Pagination logic now uses filteredBatches
  const totalPages = Math.ceil(filteredBatches.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentBatches = filteredBatches.slice(startIndex, startIndex + itemsPerPage);

  // Function to reset to the first page when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // Function to clear all filters
  const clearFilters = () => {
    setProductNameFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    handleFilterChange(); // Also resets page
  };

  return (
    <div className="bg-white shadow rounded p-4">
      {/* Header and Filter Toggle Button */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">Purchase History (Stock In)</h2>
        <button
          onClick={() => setIsFilterVisible(!isFilterVisible)}
          className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          {isFilterVisible ? 'Hide Filters' : 'Filter'}
        </button>
      </div>

      {/* Filter Section - Conditionally rendered */}
      {isFilterVisible && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Product Name Filter */}
            <div className="flex flex-col">
              <label htmlFor="product-name-filter" className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input
                type="text"
                id="product-name-filter"
                value={productNameFilter}
                onChange={(e) => { setProductNameFilter(e.target.value); handleFilterChange(); }}
                placeholder="Filter by name..."
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {/* Start Date Filter */}
            <div className="flex flex-col">
              <label htmlFor="stock-start-date-filter" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                id="stock-start-date-filter"
                value={startDateFilter}
                onChange={(e) => { setStartDateFilter(e.target.value); handleFilterChange(); }}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {/* End Date Filter */}
            <div className="flex flex-col">
              <label htmlFor="stock-end-date-filter" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                id="stock-end-date-filter"
                value={endDateFilter}
                onChange={(e) => { setEndDateFilter(e.target.value); handleFilterChange(); }}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {/* Clear Filters Button */}
            <div className="flex flex-col justify-end">
              <label className="block text-sm font-medium text-gray-700 mb-1 invisible">Clear Filters</label> {/* Invisible label for alignment */}
              <button
                onClick={clearFilters}
                className="w-full px-3 py-2 bg-gray-200 text-gray-700 rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && <p>Loading...</p>}
      
      {!loading && filteredBatches.length === 0 && (
        <p className="text-gray-500">No stock entries found matching your criteria.</p>
      )}

      {!loading && filteredBatches.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 border text-left">Product Name</th>
                <th className="p-3 border text-left">SKU</th>
                <th className="p-3 border text-right">Quantity</th>
                <th className="p-3 border text-right">Item Cost</th>
                <th className="p-3 border text-right">Total Cost</th>
                <th className="p-3 border text-left">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {currentBatches.map(batch => (
                <tr key={batch.id} className="border-t">
                  <td className="p-3 border">{batch.products?.name}</td>
                  <td className="p-3 border">{batch.products?.sku}</td>
                  <td className="p-3 border text-right">{batch.quantity}</td>
                  <td className="p-3 border text-right">
                    {formatPrice(batch.cost_price)}
                  </td>
                  <td className="p-3 border text-right">
                    {formatPrice(batch.quantity * batch.cost_price)}
                  </td>
                  <td className="p-3 border">
                    {new Date(batch.received_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      )}
      
      {!loading && filteredBatches.length > 0 && totalPages > 1 && (
        <div className="flex flex-col md:flex-row justify-center items-center mt-4 space-y-2 md:space-y-0">
          <div className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </div>

          <div className="flex items-center space-x-2">
            <button
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              Prev
            </button>

            <div className="flex items-center space-x-1 text-sm">
              <label htmlFor="jump-to-page-stock">Go to page:</label>
              <input
                id="jump-to-page-stock"
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={e => {
                  let pageNum = parseInt(e.target.value, 10);
                  if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
                  if (pageNum > totalPages) pageNum = totalPages;
                  setCurrentPage(pageNum);
                }}
                className="w-16 border rounded p-1 text-center"
              />
            </div>

            <button
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}