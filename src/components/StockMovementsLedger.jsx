import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../utils/AuthContext';
import { formatPrice } from '../utils/formatPrice'; // Assuming formatPrice utility exists
import { getUniqueCategories } from '../services/products';


export default function StockMovementsLedger() {
  const { user } = useAuth();
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [uniqueCategories, setUniqueCategories] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  useEffect(() => {
    async function fetchUniqueCategoriesList() {
      try {
        const categories = await getUniqueCategories();
        setUniqueCategories(categories);
      } catch (err) {
        console.error('Error fetching unique categories for filter:', err);
      }
    }
    fetchUniqueCategoriesList();
  }, []);

  useEffect(() => {
    async function fetchStockMovements() {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('stock_movements')
          .select(`
            id,
            product_id,
            products (name, sku, category),
            batch_id,
            stock_batches (cost_price),
            quantity,
            movement_type,
            reason,
            notes,
            reference_id,
            created_at
          `)
          .eq('company_id', user.company_id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setMovements(data || []);
      } catch (err) {
        console.error('Error fetching stock movements:', err.message);
        setError('Failed to fetch stock movements.');
      } finally {
        setLoading(false);
      }
    }

    if (user?.company_id) {
      fetchStockMovements();
    }
  }, [user?.company_id]);

  // Apply filters client-side
  const filteredMovements = movements.filter(movement => {
    const isSearchMatch = searchTerm
      ? (movement.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         movement.products?.sku?.toLowerCase().includes(searchTerm.toLowerCase()))
      : true;

    const isCategoryMatch = selectedCategory
      ? movement.products?.category?.trim().toLowerCase() === selectedCategory
      : true;

    const isDateInRange = (() => {
      const movementDate = new Date(movement.created_at);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (movementDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (movementDate > end) return false;
      }
      return true;
    })();

    return isSearchMatch && isCategoryMatch && isDateInRange;
  });
  
  const handleFilterChange = () => {
    setPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredMovements.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedMovements = filteredMovements.slice(startIndex, startIndex + pageSize);

  if (loading) return <p>Loading stock movements...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (movements.length === 0) return <p className="text-gray-500">No stock movements recorded.</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold"> </h2>
        <button
          onClick={() => setIsFilterVisible(!isFilterVisible)}
          className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 mt-5"
        >
          {isFilterVisible ? 'Hide Filters' : 'Filter'}
        </button>
      </div>

      {isFilterVisible && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col">
              <label htmlFor="product-name-filter" className="block text-sm font-medium text-gray-700 mb-1">Product Name/SKU</label>
              <input
                type="text"
                id="product-name-filter"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); handleFilterChange(); }}
                placeholder="Filter by name/sku..."
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                id="category-filter"
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); handleFilterChange(); }}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">All Categories</option>
                {uniqueCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label htmlFor="start-date-filter" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                id="start-date-filter"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); handleFilterChange(); }}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="end-date-filter" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                id="end-date-filter"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); handleFilterChange(); }}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div className="flex flex-col justify-end">
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

      {!loading && filteredMovements.length === 0 && (
        <p className="text-gray-500">No stock movements found matching your criteria.</p>
      )}

      {!loading && filteredMovements.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 border text-left">Date</th>
                <th className="p-3 border text-left">Product</th>
                <th className="p-3 border text-left">SKU</th>
                <th className="p-3 border text-right">Quantity</th>
                <th className="p-3 border text-center">Type</th>
                <th className="p-3 border text-left">Reason</th>
                <th className="p-3 border text-left">Notes</th>
                <th className="p-3 border text-right">Cost Price (Batch)</th>
                <th className="p-3 border text-left">Reference ID</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {paginatedMovements.map(movement => (
                <tr key={movement.id} className="border-t">
                  <td className="p-3 border">{new Date(movement.created_at).toLocaleString()}</td>
                  <td className="p-3 border">{movement.products?.name || 'N/A'}</td>
                  <td className="p-3 border">{movement.products?.sku || 'N/A'}</td>
                  <td className="p-3 border text-right">{movement.quantity}</td>
                  <td className={`p-3 border text-center font-bold ${
                    movement.movement_type === 'IN' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {movement.movement_type}
                  </td>
                  <td className="p-3 border">{movement.reason || 'N/A'}</td>
                  <td className="p-3 border">{movement.notes || 'N/A'}</td>
                  <td className="p-3 border text-right">{movement.stock_batches?.cost_price ? formatPrice(movement.stock_batches.cost_price) : 'N/A'}</td>
                  <td className="p-3 border font-mono text-xs">{movement.reference_id ? movement.reference_id.substring(0, 8) + '...' : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {!loading && filteredMovements.length > 0 && totalPages > 1 && (
        <div className="flex flex-col items-center mt-4">
          <div className="mb-2 text-sm text-gray-700">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <button
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Prev
            </button>
            <div className="flex items-center space-x-1 text-sm">
              <label htmlFor="jump-to-page-ledger">Go to page:</label>
              <input
                id="jump-to-page-ledger"
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
    </>
  );
}