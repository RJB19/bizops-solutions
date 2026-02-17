import React, { createContext, useContext, useState, useEffect } from 'react';

const ProductFormContext = createContext();

export const useProductForm = () => {
  return useContext(ProductFormContext);
};

export const ProductFormProvider = ({ children }) => {
  const [productFormData, setProductFormData] = useState(() => {
    try {
      const storedFormData = localStorage.getItem('productFormData');
      return storedFormData ? JSON.parse(storedFormData) : {
        name: '',
        sku: '',
        unit: '',
        unit_description: '',
        selling_price: '',
        low_stock_threshold: '',
        category: '',
        brand: '',
        model: '',
      };
    } catch (error) {
      console.error("Failed to parse product form data from localStorage", error);
      return {
        name: '',
        sku: '',
        unit: '',
        unit_description: '',
        selling_price: '',
        low_stock_threshold: '',
        category: '',
        brand: '',
        model: '',
      };
    }
  });

  const [isProductFormOpen, setIsProductFormOpen] = useState(() => {
    try {
      const storedFormState = localStorage.getItem('isProductFormOpen');
      return storedFormState ? JSON.parse(storedFormState) : false;
    } catch (error) {
      console.error("Failed to parse product form state from localStorage", error);
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('productFormData', JSON.stringify(productFormData));
    } catch (error) {
      console.error("Failed to save product form data to localStorage", error);
    }
  }, [productFormData]);

  useEffect(() => {
    try {
      localStorage.setItem('isProductFormOpen', JSON.stringify(isProductFormOpen));
    } catch (error) {
      console.error("Failed to save product form state to localStorage", error);
    }
  }, [isProductFormOpen]);

  const openProductForm = () => setIsProductFormOpen(true);
  const closeProductForm = () => {
    setIsProductFormOpen(false);
    resetProductForm(); // Reset the form data when the form is closed
  };

  const updateProductFormField = (name, value) => {
    setProductFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetProductForm = () => {
    setProductFormData({
      name: '',
      sku: '',
      unit: '',
      unit_description: '',
      selling_price: '',
      low_stock_threshold: '',
      category: '',
      brand: '',
      model: '',
    });
  };

  const resetProductFormContext = () => {
    resetProductForm();
    setIsProductFormOpen(false);
    localStorage.removeItem('productFormData'); // Also clear from local storage
    localStorage.removeItem('isProductFormOpen'); // Also clear from local storage
  };

  const value = {
    productFormData,
    updateProductFormField,
    resetProductForm,
    isProductFormOpen,
    openProductForm,
    closeProductForm,
    resetProductFormContext, // Expose reset function
  };

  return (
    <ProductFormContext.Provider value={value}>
      {children}
    </ProductFormContext.Provider>
  );
};
