import { useEffect, useState } from 'react';
import { getNetSaleItems } from '../services/products';
import { formatPrice } from '../utils/formatPrice';

export default function AllSales() {
  const [saleItems, setSaleItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // State for filters
  const [productNameFilter, setProductNameFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // State for filter visibility
  const [isFilterVisible, setIsFilterVisible] = useState(false); // Initially hidden

  async function fetchSaleItems() {
    setLoading(true);
    try {
      const items = await getNetSaleItems(); // Use getNetSaleItems()
      setSaleItems(items);
    } catch (error) {
      console.error('Error fetching sale items:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSaleItems();
  }, []);

  // Apply filters to the sale items data
  const filteredSaleItems = saleItems.filter(item => {
    const saleDate = new Date(item.date);

    // Product Name Filter
    const isProductNameMatch = productNameFilter
      ? item.product_name.toLowerCase().includes(productNameFilter.toLowerCase())
      : true;

    // Date Range Filter
    const isDateInRange = (() => {
      const itemDate = new Date(item.date);

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

  // Pagination logic now uses filteredSaleItems
  const totalPages = Math.ceil(filteredSaleItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredSaleItems.slice(startIndex, startIndex + itemsPerPage);

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
    <div className="bg-white p-6 rounded-lg shadow">

     <div className="flex justify-between items-center mb-3">
      <h2 className="text-lg font-semibold mb-3">Sales Hitory (Stock Out)</h2>

      {/* Filter Toggle Button */}
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
          {/* Adjusted grid to md:grid-cols-4 to ensure all elements are on one row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Product Name Filter */}
            <div className="flex flex-col">
              <label htmlFor="all-sales-product-name-filter" className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input
                type="text"
                id="all-sales-product-name-filter"
                value={productNameFilter}
                onChange={(e) => { setProductNameFilter(e.target.value); handleFilterChange(); }}
                placeholder="Filter by name..."
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {/* Start Date Filter */}
            <div className="flex flex-col">
              <label htmlFor="all-sales-start-date-filter" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                id="all-sales-start-date-filter"
                value={startDateFilter}
                onChange={(e) => { setStartDateFilter(e.target.value); handleFilterChange(); }}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {/* End Date Filter */}
            <div className="flex flex-col">
              <label htmlFor="all-sales-end-date-filter" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                id="all-sales-end-date-filter"
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

      {loading ? (
        <p>Loading...</p>
      ) : filteredSaleItems.length === 0 ? (
        <p className="text-gray-500">No sales found matching your criteria.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 border text-left">Product</th>
                  <th className="p-3 border text-left">SKU</th>
                  <th className="p-3 border text-right">Quantity</th>
                  <th className="p-3 border text-right">Selling Price</th>
                  <th className="p-3 border text-right">Total Sold Amount</th>
                  <th className="p-3 border text-right">Gross Profit</th>
                  <th className="p-3 border text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-3 border">{item.product_name}</td>
                    <td className="p-3 border">{item.sku}</td>
                    <td className="p-3 border text-right">{item.quantity}</td>
                    <td className="p-3 border text-right">{formatPrice(item.selling_price)}</td>
                    <td className="p-3 border text-right">{formatPrice(item.amount)}</td>
                    <td className="p-3 border text-right">{formatPrice(item.gross_profit)}</td>
                    <td className="p-3 border">{new Date(item.date).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && filteredSaleItems.length > 0 && totalPages > 1 && (
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
                  <label htmlFor="jump-to-page-all-sales">Go to page:</label>
                  <input
                    id="jump-to-page-all-sales"
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
        </>
      )}
    </div>
  );
}
