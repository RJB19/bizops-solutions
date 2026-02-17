import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../utils/AuthContext';
import { useStockAdjustmentForm } from '../utils/StockAdjustmentFormContext';
import { adjustStock, getLatestCostPrice } from '../services/stock';
import { formatPrice } from '../utils/formatPrice';

export default function StockAdjustmentForm({ onSuccess }) {
  const { user } = useAuth();
  const {
    adjustmentFormData,
    updateAdjustmentFormField,
    resetAdjustmentForm,
    closeAdjustmentForm,
    latestCost,
    setLatestCost,
  } = useStockAdjustmentForm();

  const {
    productId,
    quantity,
    adjustmentType,
    notes,
    displaySearchTerm,
    searchTerm,
    showDropdown,
    costPrice,
  } = adjustmentFormData;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Fetch all products for the combobox
  useEffect(() => {
    async function fetchProducts() {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, sku')
        .is('archived_at', null)
        .eq('company_id', user.company_id);

      if (productsError) {
        console.error("Error fetching products:", productsError);
        return;
      }

      const { data: stockData, error: stockError } = await supabase
        .from('stock_batches')
        .select('product_id, remaining_quantity')
        .eq('company_id', user.company_id);

      if (stockError) {
        console.error("Error fetching stock data:", stockError);
        return;
      }

      const stockMap = {};
      stockData?.forEach(row => {
        stockMap[row.product_id] = (stockMap[row.product_id] || 0) + row.remaining_quantity;
      });

      const productsWithStock = (productsData || []).map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        stock: stockMap[p.id] || 0,
      }));

      setProducts(productsWithStock.sort((a, b) => a.name.localeCompare(b.name)));
    }
    fetchProducts();
  }, [user.company_id]);

  // Product combobox filtering
  const filterProducts = (prods, term) => prods.filter(p =>
    p.name.toLowerCase().includes(term.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(term.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name));

  const mainFilteredProducts = filterProducts(products, searchTerm);



  useEffect(() => {
    // This effect runs when the adjustment type or the fetched latest cost changes
    if (
      adjustmentType === 'PHYSICAL_INCREASE' &&
      latestCost !== null &&
      costPrice !== latestCost
    ) {
      updateAdjustmentFormField('costPrice', latestCost);
    }
  }, [adjustmentType, latestCost, updateAdjustmentFormField, costPrice]);

  const handleMainProductSelect = async (product) => {
    updateAdjustmentFormField('productId', product.id);
    updateAdjustmentFormField('displaySearchTerm', `${product.name} (${product.sku})`);
    updateAdjustmentFormField('searchTerm', '');
    updateAdjustmentFormField('showDropdown', false);
    setValidationError('');

    // Fetch the latest cost for the selected product
    const cost = await getLatestCostPrice(product.id, user.company_id);
    setLatestCost(cost); // Store it in state

    // If the reason is already 'Physical Count - Increase', populate the field immediately
    if (adjustmentFormData.adjustmentType === 'PHYSICAL_INCREASE') {
      updateAdjustmentFormField('costPrice', cost || '');
    }
  };

  const handleMainProductToggleDropdown = () => {
    if (!showDropdown && productId) {
      updateAdjustmentFormField('searchTerm', '');
      updateAdjustmentFormField('displaySearchTerm', '');
      updateAdjustmentFormField('productId', '');
    } else if (displaySearchTerm) { // Removed !showDropdown from here
      updateAdjustmentFormField('searchTerm', displaySearchTerm);
    }
    updateAdjustmentFormField('showDropdown', prev => !prev);
  };

  const handleMainProductInputChange = (e) => {
    const value = e.target.value;
    updateAdjustmentFormField('displaySearchTerm', value);
    updateAdjustmentFormField('searchTerm', value);
    updateAdjustmentFormField('productId', '');
    updateAdjustmentFormField('showDropdown', true);
    setValidationError('');
  };

  const validateForm = () => {
    if (!productId) {
      setValidationError('Please select a product.');
      return false;
    }
    if (Number(quantity) <= 0) {
      setValidationError('Quantity must be greater than 0.');
      return false;
    }
    if (!adjustmentType) {
      setValidationError('Please select an adjustment type.');
      return false;
    }
    if (!notes || notes.trim() === '') {
      setValidationError('Please provide notes for the adjustment.');
      return false;
    }

    const selectedProduct = products.find(p => p.id === productId);
    if (!selectedProduct) {
      setValidationError('Selected product not found in inventory.');
      return false;
    }

    const isOutgoingMovement = ['DAMAGED', 'LOST', 'PHYSICAL_DECREASE'].includes(adjustmentType);
    if (isOutgoingMovement && Number(quantity) > selectedProduct.stock) {
      setValidationError(`Not enough stock (${selectedProduct.stock}) for this outgoing adjustment.`);
      return false;
    }

    const isCostPriceRequired = ['PHYSICAL_INCREASE'].includes(adjustmentType); // Removed 'RETURN'
    if (isCostPriceRequired && (Number(costPrice) <= 0 || isNaN(Number(costPrice)))) {
      setValidationError('Cost Price must be greater than 0 for this adjustment type.');
      return false;
    }

    setValidationError('');
    return true;
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    if (!window.confirm('Are you sure you want to submit this stock adjustment?')) {
      return; // If user cancels, stop the function
    }

    setLoading(true);

    let finalNotes = notes;
    let finalReferenceId = null;

    // Removed if (adjustmentType === 'RETURN') block

    try {
      const movementCategory = ['DAMAGED', 'LOST', 'PHYSICAL_DECREASE'].includes(adjustmentType) ? 'OUT' : 'IN';
      
      const result = await adjustStock({
        productId,
        quantity: Number(quantity),
        movementCategory,
        reason: adjustmentType,
        notes: finalNotes,
        costPrice: Number(costPrice),
        companyId: user.company_id,
        referenceId: finalReferenceId,
      });

      if (result.success) {
        alert('Stock adjustment submitted successfully!');
        onSuccess();
        closeAdjustmentForm();
      } else {
        throw new Error(result.error || 'Failed to process stock adjustment.');
      }

    } catch (error) {
      console.error('Stock adjustment error:', error);
      setValidationError(error.message || 'Failed to process stock adjustment.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow space-y-3">
      <h2 className="text-lg font-semibold">Stock Adjustment</h2>

      {/* Adjustment Type */}
      <select
        className="w-full border p-2 rounded"
        value={adjustmentType}
        onChange={e => {
          updateAdjustmentFormField('adjustmentType', e.target.value);
          // Clear costPrice if not needed for other types
          if (!['PHYSICAL_INCREASE'].includes(e.target.value)) { // Keep costPrice clearing conditional
            updateAdjustmentFormField('costPrice', '');
          }
          // Re-select original product if it was changed by return search (this logic is now simplified)
          const currentProductId = adjustmentFormData.productId;
          const productById = products.find(p => p.id === currentProductId);
          if (productById) {
            updateAdjustmentFormField('displaySearchTerm', `${productById.name} (${productById.sku})`);
            updateAdjustmentFormField('searchTerm', productById.name);
            updateAdjustmentFormField('showDropdown', false);
          } else {
            updateAdjustmentFormField('displaySearchTerm', '');
          }
        }}
        required
      >
        <option value="">Select Adjustment Type</option>
        <option value="DAMAGED">Damaged Item</option>
        <option value="LOST">Lost / Stolen</option>
        <option value="PHYSICAL_DECREASE">Physical Count - Decrease</option>
        <option value="PHYSICAL_INCREASE">Physical Count - Increase</option>
      </select>

      {/* Product Combobox */}
      <div className="relative">
          <input
            type="text"
            placeholder="Search or Select Product"
            className="w-full border p-2 rounded pr-10"
            value={displaySearchTerm}
            onChange={handleMainProductInputChange}
            onFocus={() => {
              if (productId) {
                updateAdjustmentFormField('searchTerm', '');
              } else if (displaySearchTerm) {
                updateAdjustmentFormField('searchTerm', displaySearchTerm);
              }
              updateAdjustmentFormField('showDropdown', true);
            }}
            onBlur={() => setTimeout(() => updateAdjustmentFormField('showDropdown', false), 100)}
            required
          />
          <button
            type="button"
            onClick={handleMainProductToggleDropdown}
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
              {mainFilteredProducts.length === 0 ? (
                <li className="p-2 text-gray-500">No products found.</li>
              ) : (
                mainFilteredProducts.map(p => (
                  <li
                    key={p.id}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onMouseDown={() => handleMainProductSelect(p)}
                  >
                    {p.name} ({p.sku}) (Stock: {p.stock})
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

      {/* Quantity */}
      <input
        type="number"
        step="1"
        placeholder="Quantity"
        className="w-full border p-2 rounded"
        value={quantity}
        onChange={e => updateAdjustmentFormField('quantity', e.target.value)}
        required
      />

      {/* Conditional Cost Price Input */}
      {['PHYSICAL_INCREASE'].includes(adjustmentType) && (
        <div>
          <input
            type="number"
            step="any"
            placeholder="Auto-populated Cost Price (editable)" // Changed placeholder
            className="w-full border p-2 rounded"
            value={costPrice}
            onChange={e => updateAdjustmentFormField('costPrice', e.target.value)}
            required // Required when adjustmentType is PHYSICAL_INCREASE
          />
          {latestCost !== null && ( // Show note only when a cost was actually fetched and auto-populated
            <p className="text-sm text-gray-500 mt-1">
              Auto-populated from last batch cost. You can edit if needed.
            </p>
          )}
        </div>
      )}

      {/* Notes */}
      <textarea
        placeholder="Notes (e.g., 'cracked casing', 'found 5 extra units during count')"
        className="w-full border p-2 rounded"
        rows="3"
        value={notes}
        onChange={e => updateAdjustmentFormField('notes', e.target.value)}
        required
      ></textarea>

      {validationError && (
        <p className="text-red-500 text-sm">{validationError}</p>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={closeAdjustmentForm} className="px-4 py-2 border rounded">
          Cancel
        </button>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}> {/* Removed return-specific disabled condition */}
          {loading ? 'Processing...' : 'Submit Adjustment'}
        </button>
      </div>
    </form>
  );
}