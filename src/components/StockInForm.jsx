import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../utils/AuthContext';
import { useStockInForm } from '../utils/StockInFormContext'; // Import useStockInForm
import { getUniqueCategories } from '../services/products'; // Import getUniqueCategories

export default function StockInForm({ onSuccess }) { // Removed onClose prop
  const { user } = useAuth();
  const { stockInFormData, updateStockInFormField, resetStockInForm, closeStockInForm } = useStockInForm();
  const {
    productId,
    quantity,
    costPrice,
    searchTerm,
    displaySearchTerm,
    showDropdown,
    selectedProductSellingPrice,
    costPriceError,
    showPrepopulatedCostNote,
  } = stockInFormData;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false); // New state

  // New states for category filtering
  const [selectedCategory, setSelectedCategory] = useState(''); // Empty string means 'All Categories'
  const [uniqueCategories, setUniqueCategories] = useState([]);

  useEffect(() => {
    fetchProducts();
  }, []);

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
    const { data } = await supabase
      .from('products')
      .select('id, name, sku, selling_price, archived_at, category') // Include category
      .is('archived_at', null);
    const sortedProducts = (data || []).sort((a, b) => a.name.localeCompare(b.name));
    setProducts(sortedProducts);
  }

  const filteredProducts = products
    .filter(
      (p) =>
        (selectedCategory === '' || (p.category && p.category.trim().toLowerCase() === selectedCategory)) && // Category filter
        (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => a.name.localeCompare(b.name)); // Explicit sort after filtering

  async function handleSubmit(e) {
    e.preventDefault();

    if (!productId) {
      alert('Please select a product from the list.');
      return;
    }

    if (!window.confirm('Are you sure you want to add this stock?')) {
      return; // If user cancels, stop the function
    }
    if (costPriceError) {
      // Prevent submission if there's an error
      if (!confirm(costPriceError + ' Do you want to proceed anyway?')) {
        return;
      }
    }

    setLoading(true); // Start loading

    try {
      const { data: newBatch, error: batchError } = await supabase.from('stock_batches').insert({
        product_id: productId,
        quantity: Number(quantity),
        remaining_quantity: Number(quantity),
        cost_price: Number(costPrice),
        received_at: new Date(),
        company_id: user.company_id,
      }).select().single(); // Select the inserted row to get its ID

      if (batchError) {
        alert(batchError.message);
        setLoading(false);
        return;
      }

      // Log stock movement
      const { error: movementError } = await supabase.from('stock_movements').insert({
        product_id: productId, // Corrected to productId
        batch_id: newBatch.id, // Use the ID of the newly created batch
        quantity: Number(quantity),
        movement_type: 'IN',
        reason: 'Stock In', // Add the reason
        company_id: user.company_id,
        reference_id: null, // No specific reference for initial stock-in
      });

      if (movementError) {
        alert('Stock added, but failed to log movement. Please check logs.');
        // For now, we'll just alert and continue.
      }

      alert('Stock added successfully');

      if (typeof onSuccess === 'function') {
        onSuccess(productId);
      }
      
      resetStockInForm(); // Reset form using context
      closeStockInForm(); // Close form using context

    } catch (error) {
      console.error('Submission error:', error);
      alert('An unexpected error occurred during submission.');
    } finally {
      setLoading(false); // End loading
    }
  }

  const validateCostPrice = (price, sellingPrice) => {
    if (sellingPrice && Number(price) > sellingPrice) {
      updateStockInFormField('costPriceError', 'Cost price is greater than selling price.');
    } else {
      updateStockInFormField('costPriceError', '');
    }
  };

  const handleSelectProduct = async (product) => {
    updateStockInFormField('productId', product.id);
    updateStockInFormField('displaySearchTerm', `${product.name} (${product.sku})`);
    updateStockInFormField('searchTerm', '');
    updateStockInFormField('showDropdown', false);

    let latestSellingPrice = null;
    let latestCostPrice = '';

    // --- Fetch latest selling price ---
    const { data: sellingPriceData, error: sellingPriceError } = await supabase
      .from('products')
      .select('selling_price')
      .eq('id', product.id)
      .eq('company_id', user.company_id) // Add company_id filter
      .single();

    if (sellingPriceError) {
      console.error('Error fetching latest selling price:', sellingPriceError.message);
      updateStockInFormField('costPriceError', 'Could not fetch latest selling price. Please try again.');
    } else if (sellingPriceData) {
      latestSellingPrice = sellingPriceData.selling_price;
      updateStockInFormField('selectedProductSellingPrice', latestSellingPrice);
    } else {
      updateStockInFormField('costPriceError', 'Selling price not found for this product.');
    }

    // --- Fetch latest cost price ---
    const { data: costPriceData, error: costPriceErrorFetch } = await supabase
      .from('stock_batches')
      .select('cost_price')
      .eq('product_id', product.id)
      .eq('company_id', user.company_id) // Add company_id filter
      .order('received_at', { ascending: false })
      .limit(1)
      .single();

    if (costPriceErrorFetch && costPriceErrorFetch.code !== 'PGRST116') { // Ignore "exact one row was not found" errors
      console.error('Error fetching latest cost price:', costPriceErrorFetch.message);
    } else if (costPriceData) {
      latestCostPrice = costPriceData.cost_price;
    }

    updateStockInFormField('costPrice', latestCostPrice);
    updateStockInFormField('showPrepopulatedCostNote', latestCostPrice !== ''); // Show note if cost price is found

    // --- Validate with the new values ---
    validateCostPrice(latestCostPrice, latestSellingPrice);
  };
  
  const handleToggleDropdown = () => {
    if (!showDropdown && productId) { // If dropdown is closed and a product is selected
      updateStockInFormField('searchTerm', ''); // Clear filter to show all products
      updateStockInFormField('displaySearchTerm', ''); // Clear display to show placeholder and all options
      updateStockInFormField('productId', ''); // Also clear selected product so user can re-select
    } else if (!showDropdown && displaySearchTerm) { // If dropdown is closed, user typed but not selected
      updateStockInFormField('searchTerm', displaySearchTerm); // Use what's in display for filtering
    }
    updateStockInFormField('showDropdown', !showDropdown);
  }

  const handleInputChange = (e) => {
    const value = e.target.value;
    updateStockInFormField('displaySearchTerm', value);
    updateStockInFormField('searchTerm', value); // Use value for filtering
    updateStockInFormField('productId', ''); // Clear selected product when typing
    updateStockInFormField('showDropdown', true); // Always show dropdown when typing
    updateStockInFormField('selectedProductSellingPrice', null); // Clear selling price when product search changes
    updateStockInFormField('costPriceError', ''); // Clear any cost price error
    updateStockInFormField('showPrepopulatedCostNote', false); // Clear the note when product selection changes
  };

  const handleCostPriceChange = (e) => {
    const value = e.target.value;
    updateStockInFormField('costPrice', value);
    validateCostPrice(value, selectedProductSellingPrice);
    updateStockInFormField('showPrepopulatedCostNote', false); // Hide note when user starts typing
  };

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setSelectedCategory(newCategory);
    // Reset product selection when category changes
    updateStockInFormField('productId', '');
    updateStockInFormField('displaySearchTerm', '');
    updateStockInFormField('searchTerm', '');
    updateStockInFormField('selectedProductSellingPrice', null);
    updateStockInFormField('costPrice', '');
    updateStockInFormField('costPriceError', '');
    updateStockInFormField('showPrepopulatedCostNote', false);
    updateStockInFormField('showDropdown', false);
  };

  return (
    
    <form onSubmit={handleSubmit} className="space-y-3">
      <h2 className="text-lg font-semibold">Add Stock</h2>

      {/* Category Filter Dropdown */}
      <select
        className="w-full border p-2 rounded"
        value={selectedCategory}
        onChange={handleCategoryChange} // Use the new handler
      >
        <option value="">All Categories</option>
        {uniqueCategories.map(category => (
          <option key={category} value={category}>{category}</option>
        ))}
      </select>

      <div className="relative">
        <input
          type="text"
          placeholder="Search or Select Product"
          className="w-full border p-2 rounded pr-10" // Added pr-10 for button
          value={displaySearchTerm} // Use displaySearchTerm for input value
          onChange={handleInputChange}
          onFocus={() => {
            if (productId) { // If a product is already selected, clear searchTerm to show all options initially
              updateStockInFormField('searchTerm', '');
            } else if (displaySearchTerm) { // If user typed but not selected, set searchTerm to displaySearchTerm
              updateStockInFormField('searchTerm', displaySearchTerm);
            }
            updateStockInFormField('showDropdown', true);
          }}
          onBlur={() => setTimeout(() => updateStockInFormField('showDropdown', false), 100)} // Delay to allow click on items
          required
        />
        <button
          type="button"
          onClick={handleToggleDropdown}
          className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"
        >
          {showDropdown ? (
            // Up arrow
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            // Down arrow
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
                  {p.name} ({p.sku})
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {/* Warning for unselected product */}
      {!productId && displaySearchTerm && (
        <p className="text-sm text-red-500">Please select a product from the list.</p>
      )}

      {productId && !products.some(p => p.id === productId && displaySearchTerm === `${p.name} (${p.sku})`) && ( // Corrected warning logic
        <p className="text-sm text-orange-500">Selected product: {displaySearchTerm}. Ensure it matches a list item.</p>
      )}

      <input
        type="number"
        placeholder="Quantity"
        className="w-full border p-2 rounded"
        value={quantity}
        onChange={e => updateStockInFormField('quantity', e.target.value)}
        required
      />

      <input
        type="number"
        step="any"
        placeholder="Cost price per item"
        className="w-full border p-2 rounded"
        value={costPrice}
        onChange={handleCostPriceChange}
        required
      />
      {showPrepopulatedCostNote && (
        <p className="text-sm text-gray-500 mt-1">Pre-populated from last stock entry</p>
      )}
      {costPriceError && <p className="text-sm text-red-500">{costPriceError}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={closeStockInForm} className="px-4 py-2 border rounded">
          Close
        </button>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>
          {loading ? 'Adding Stock...' : 'Add Stock'}
        </button>
      </div>
    </form>
  )
}