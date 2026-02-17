import { useState, useEffect, useRef } from 'react';
import { createProduct, getUniqueCategories } from '../services/products';
import { useAuth } from '../utils/AuthContext';
import { useProductForm } from '../utils/ProductFormContext'; // Import useProductForm

export default function ProductForm({ onSuccess }) { // Removed onClose prop
  const { user } = useAuth();
  const { productFormData, updateProductFormField, resetProductForm, closeProductForm } = useProductForm(); // Use context
  const [loading, setLoading] = useState(false); // New state
  const [allCategories, setAllCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryInputRef = useRef(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const categories = await getUniqueCategories();
        setAllCategories(categories);
        setFilteredCategories(categories);
      } catch (error) {
        console.error('Error fetching unique categories:', error);
      }
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    // Filter categories whenever the productFormData.category changes
    setFilteredCategories(
      allCategories.filter(category =>
        category.toLowerCase().includes(productFormData.category.toLowerCase())
      )
    );
  }, [productFormData.category, allCategories]);


  function handleChange(e) {
    const { name, value } = e.target;
    updateProductFormField(name, value); // Use context's update function
    if (name === 'category') {
      setShowCategoryDropdown(true); // Show dropdown when typing in category field
    }
  }

  function handleCategorySelect(category) {
    updateProductFormField('category', category);
    setShowCategoryDropdown(false);
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (categoryInputRef.current && !categoryInputRef.current.contains(event.target)) {
        setShowCategoryDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [categoryInputRef]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!window.confirm('Are you sure you want to save this product?')) {
      return; // If user cancels, stop the function
    }

    setLoading(true); // Start loading

    try {
      const data = await createProduct({
        ...productFormData, // Use productFormData from context
        selling_price: Number(productFormData.selling_price),
        low_stock_threshold: Number(productFormData.low_stock_threshold || 0), // Convert to Number, default to 0 if empty
        company_id: user.company_id,
      });
  
      resetProductForm(); // Reset form using context
      onSuccess(data.id); // Call onSuccess prop
      closeProductForm(); // Close form using context
    } catch (error) {
      console.error('Submission error:', error);
      alert('An unexpected error occurred during product creation.');
    } finally {
      setLoading(false); // End loading
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow space-y-3">
      <h2 className="text-lg font-semibold">Add New Product</h2>

      <input name="name" placeholder="Product name" className="w-full border rounded p-2" onChange={handleChange} value={productFormData.name} required />
      <input name="sku" placeholder="SKU" className="w-full border rounded p-2" onChange={handleChange} value={productFormData.sku} />
      <input name="unit" placeholder="Unit of measure (25kg, 1L, 500ml, bag, box, meter, and etc.. )" className="w-full border rounded p-2" onChange={handleChange} value={productFormData.unit} required />
      {/* <input name="unit_description" placeholder="Item description (25kg)" className="w-full border rounded p-2" onChange={handleChange} value={productFormData.unit_description} /> */}
      <input name="selling_price" type="number" step="any" placeholder="Selling price" className="w-full border rounded p-2" onChange={handleChange} value={productFormData.selling_price} required />
      <input name="low_stock_threshold" type="number" placeholder="Low stock alert threshold" className="w-full border rounded p-2" onChange={handleChange} value={productFormData.low_stock_threshold} required />

      {/* New Fields */}
      <div className="relative" ref={categoryInputRef}>
        <input
          name="category"
          placeholder="Category (e.g., Electrical, Plumbing)"
          className="w-full border rounded p-2"
          onChange={handleChange}
          value={productFormData.category}
          onFocus={() => setShowCategoryDropdown(true)}
          autoComplete="off" // Prevent browser's autocomplete
        />
        {showCategoryDropdown && filteredCategories.length > 0 && (
          <ul className="absolute z-10 bg-white border border-gray-300 w-full mt-1 rounded shadow-lg max-h-48 overflow-y-auto">
            {filteredCategories.map((category, index) => (
              <li
                key={index}
                className="p-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleCategorySelect(category)}
              >
                {category}
              </li>
            ))}
          </ul>
        )}
      </div>

      <input name="brand" placeholder="Brand (e.g., Bosch, Makita)" className="w-full border rounded p-2" onChange={handleChange} value={productFormData.brand} />
      <input name="model" placeholder="Model (e.g., ZM-100, Pro-Drill 500)" className="w-full border rounded p-2" onChange={handleChange} value={productFormData.model} />

      <div className="flex justify-end gap-2">
        <button type="button" onClick={closeProductForm} className="px-4 py-2 border rounded"> {/* Use context's close function */}
          Close
        </button>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>
          {loading ? 'Saving Product...' : 'Save Product'}
        </button>
      </div>
    </form>
  );
}