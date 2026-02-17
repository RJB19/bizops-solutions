import React, { useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useSalesCart } from './SalesCartContext';
import { useProductForm } from './ProductFormContext';
import { useStockInForm } from './StockInFormContext';
import { useStockAdjustmentForm } from './StockAdjustmentFormContext'; // Import new context

export default function AppContextResetter() {
  const { user } = useAuth();
  const { resetSalesCart } = useSalesCart();
  const { resetProductFormContext } = useProductForm();
  const { resetStockInFormContext } = useStockInForm();
  const { resetStockAdjustmentFormContext } = useStockAdjustmentForm(); // Get new reset function

  const prevCompanyIdRef = useRef(user?.company_id);

  useEffect(() => {
    // Only proceed if user and company_id are loaded, or if user is explicitly null (logged out)
    if (prevCompanyIdRef.current !== undefined) { // Ensures ref has been initialized
      // Check if user or company_id has changed
      if (prevCompanyIdRef.current !== user?.company_id) {
        console.log('User or company_id changed. Resetting form contexts.');
        resetSalesCart();
        resetProductFormContext();
        resetStockInFormContext();
        resetStockAdjustmentFormContext(); // Call new reset function
      }
    }
    prevCompanyIdRef.current = user?.company_id; // Update ref for next render
  }, [user, resetSalesCart, resetProductFormContext, resetStockInFormContext, resetStockAdjustmentFormContext]);

  return null; // This component doesn't render anything visible
}
