import React, { createContext, useContext, useState, useEffect } from 'react';

const SalesCartContext = createContext();

export const useSalesCart = () => {
  return useContext(SalesCartContext);
};

export const SalesCartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const storedCartItems = localStorage.getItem('salesCartItems');
      return storedCartItems ? JSON.parse(storedCartItems) : [];
    } catch (error) {
      console.error("Failed to parse cart items from localStorage", error);
      return [];
    }
  });
  const [isSaleFormOpen, setIsSaleFormOpen] = useState(() => {
    try {
      const storedFormState = localStorage.getItem('isSaleFormOpen');
      return storedFormState ? JSON.parse(storedFormState) : false;
    } catch (error) {
      console.error("Failed to parse sale form state from localStorage", error);
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('salesCartItems', JSON.stringify(cartItems));
    } catch (error) {
      console.error("Failed to save cart items to localStorage", error);
    }
  }, [cartItems]);

  useEffect(() => {
    try {
      localStorage.setItem('isSaleFormOpen', JSON.stringify(isSaleFormOpen));
    } catch (error) {
      console.error("Failed to save sale form state to localStorage", error);
    }
  }, [isSaleFormOpen]);

  const toggleSaleForm = () => {
    setIsSaleFormOpen(prev => !prev);
  };

  const openSaleForm = () => {
    setIsSaleFormOpen(true);
  };

  const closeSaleForm = () => {
    setIsSaleFormOpen(false);
    clearCart(); // Clear the cart when the form is closed
  };

  const addItemToCart = (product, quantity, sellingPrice) => {
    setCartItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(
        item => item.product.id === product.id
      );

      if (existingItemIndex > -1) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + quantity,
          selling_price: sellingPrice, // Update selling price to the current sellingPrice (can be adjusted)
          // original_selling_price should remain the same as when it was first added
        };
        return updatedItems;
      } else {
        return [...prevItems, { product, quantity, selling_price: sellingPrice, original_selling_price: product.selling_price }];
      }
    });
  };

  const updateItemQuantity = (productId, newQuantity) => {
    setCartItems(prevItems => {
      return prevItems
        .map(item =>
          item.product.id === productId ? { ...item, quantity: newQuantity } : item
        )
        .filter(item => item.quantity > 0); // Remove if quantity becomes 0 or less
    });
  };

  const removeItemFromCart = (productId) => {
    setCartItems(prevItems => prevItems.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const resetSalesCart = () => {
    setCartItems([]);
    setIsSaleFormOpen(false);
    localStorage.removeItem('salesCartItems'); // Also clear from local storage
    localStorage.removeItem('isSaleFormOpen'); // Also clear from local storage
  };

  const updateItemPrice = (productId, newSellingPrice) => {
    setCartItems(prevItems => {
      return prevItems.map(item =>
        item.product.id === productId
          ? { ...item, selling_price: newSellingPrice }
          : item
      );
    });
  };

  const value = {
    cartItems,
    addItemToCart,
    updateItemQuantity,
    removeItemFromCart,
    clearCart,
    isSaleFormOpen,
    toggleSaleForm,
    openSaleForm,
    closeSaleForm,
    resetSalesCart,
    updateItemPrice,
  };

  return (
    <SalesCartContext.Provider value={value}>{children}</SalesCartContext.Provider>
  );
};
