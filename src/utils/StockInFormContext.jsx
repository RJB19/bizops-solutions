import React, { createContext, useContext, useState, useEffect } from 'react';

const StockInFormContext = createContext();

export const useStockInForm = () => {
  return useContext(StockInFormContext);
};

export const StockInFormProvider = ({ children }) => {
  const [stockInFormData, setStockInFormData] = useState(() => {
    try {
      const storedFormData = localStorage.getItem('stockInFormData');
      return storedFormData ? JSON.parse(storedFormData) : {
        productId: '',
        quantity: '',
        costPrice: '',
        searchTerm: '',
        displaySearchTerm: '',
        showDropdown: false,
        selectedProductSellingPrice: null,
        costPriceError: '',
        showPrepopulatedCostNote: false,
      };
    } catch (error) {
      console.error("Failed to parse stock in form data from localStorage", error);
      return {
        productId: '',
        quantity: '',
        costPrice: '',
        searchTerm: '',
        displaySearchTerm: '',
        showDropdown: false,
        selectedProductSellingPrice: null,
        costPriceError: '',
        showPrepopulatedCostNote: false,
      };
    }
  });

  const [isStockInFormOpen, setIsStockInFormOpen] = useState(() => {
    try {
      const storedFormState = localStorage.getItem('isStockInFormOpen');
      return storedFormState ? JSON.parse(storedFormState) : false;
    } catch (error) {
      console.error("Failed to parse stock in form state from localStorage", error);
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('stockInFormData', JSON.stringify(stockInFormData));
    } catch (error) {
      console.error("Failed to save stock in form data to localStorage", error);
    }
  }, [stockInFormData]);

  useEffect(() => {
    try {
      localStorage.setItem('isStockInFormOpen', JSON.stringify(isStockInFormOpen));
    } catch (error) {
      console.error("Failed to save stock in form state to localStorage", error);
    }
  }, [isStockInFormOpen]);

  const openStockInForm = () => setIsStockInFormOpen(true);
  const closeStockInForm = () => {
    setIsStockInFormOpen(false);
    resetStockInForm(); // Reset the form data when the form is closed
  };

  const updateStockInFormField = (field, value) => {
    setStockInFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetStockInForm = () => {
    setStockInFormData({
      productId: '',
      quantity: '',
      costPrice: '',
      searchTerm: '',
      displaySearchTerm: '',
      showDropdown: false,
      selectedProductSellingPrice: null,
      costPriceError: '',
      showPrepopulatedCostNote: false,
    });
  };

  const resetStockInFormContext = () => {
    resetStockInForm();
    setIsStockInFormOpen(false);
    localStorage.removeItem('stockInFormData'); // Also clear from local storage
    localStorage.removeItem('isStockInFormOpen'); // Also clear from local storage
  };

  const value = {
    stockInFormData,
    updateStockInFormField,
    resetStockInForm,
    isStockInFormOpen,
    openStockInForm,
    closeStockInForm,
    resetStockInFormContext, // Expose reset function
  };

  return (
    <StockInFormContext.Provider value={value}>
      {children}
    </StockInFormContext.Provider>
  );
};