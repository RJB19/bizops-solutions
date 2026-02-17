import React, { createContext, useContext, useState, useEffect } from 'react';

const StockAdjustmentFormContext = createContext();

export const useStockAdjustmentForm = () => {
  return useContext(StockAdjustmentFormContext);
};

export const StockAdjustmentFormProvider = ({ children }) => {
  const [adjustmentFormData, setAdjustmentFormData] = useState(() => {
    const defaultFormData = {
      productId: '',
      quantity: '',
      adjustmentType: '',
      notes: '',
      displaySearchTerm: '',
      searchTerm: '',
      showDropdown: false,
      costPrice: '',
      customerName: '',
      originalSaleDate: '',
      originalSaleItemProductId: '',
      foundSalesItems: [],
      selectedSaleItemId: '',
    };
    try {
      const storedFormData = localStorage.getItem('stockAdjustmentFormData');
      return storedFormData ? { ...defaultFormData, ...JSON.parse(storedFormData) } : defaultFormData;
    } catch (error) {
      console.error("Failed to parse stock adjustment form data from localStorage", error);
      return defaultFormData;
    }
  });
  const [latestCost, setLatestCost] = useState(null);

  const [isAdjustmentFormOpen, setIsAdjustmentFormOpen] = useState(() => {
    try {
      const storedFormState = localStorage.getItem('isAdjustmentFormOpen');
      return storedFormState ? JSON.parse(storedFormState) : false;
    } catch (error) {
      console.error("Failed to parse stock adjustment form state from localStorage", error);
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('stockAdjustmentFormData', JSON.stringify(adjustmentFormData));
    } catch (error) {
      console.error("Failed to save stock adjustment form data to localStorage", error);
    }
  }, [adjustmentFormData]);

  useEffect(() => {
    try {
      localStorage.setItem('isAdjustmentFormOpen', JSON.stringify(isAdjustmentFormOpen));
    } catch (error) {
      console.error("Failed to save stock adjustment form state to localStorage", error);
    }
  }, [isAdjustmentFormOpen]);

  const openAdjustmentForm = () => setIsAdjustmentFormOpen(true);
  const closeAdjustmentForm = () => {
    setIsAdjustmentFormOpen(false);
    resetAdjustmentForm(); // Reset the form data when the form is closed
  };

  const updateAdjustmentFormField = (field, value) => {
    setAdjustmentFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetAdjustmentForm = () => {
    setAdjustmentFormData({
      productId: '',
      quantity: '',
      adjustmentType: '',
      notes: '',
      displaySearchTerm: '',
      searchTerm: '',
      showDropdown: false,
      costPrice: '', // New field for cost price
      customerName: '', // For return workflow
      originalSaleDate: '', // For return workflow search
      originalSaleItemProductId: '', // For return workflow search
      foundSalesItems: [], // Results of sale lookup
      selectedSaleItemId: '', // The specific sale_item being returned
    });
    setLatestCost(null);
  };

  const resetAdjustmentFormContext = () => {
    resetAdjustmentForm();
    closeAdjustmentForm();
    localStorage.removeItem('stockAdjustmentFormData');
    localStorage.removeItem('isAdjustmentFormOpen');
  }

  const value = {
    adjustmentFormData,
    updateAdjustmentFormField,
    resetAdjustmentForm,
    isAdjustmentFormOpen,
    openAdjustmentForm,
    closeAdjustmentForm,
    resetAdjustmentFormContext,
    latestCost,
    setLatestCost,
  };

  return (
    <StockAdjustmentFormContext.Provider value={value}>
      {children}
    </StockAdjustmentFormContext.Provider>
  );
};