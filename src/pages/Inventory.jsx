import React, { useState } from 'react';
import StockAdjustmentForm from '../components/StockAdjustmentForm';
import StockMovementsLedger from '../components/StockMovementsLedger'; // Import the new ledger component
import { useStockAdjustmentForm } from '../utils/StockAdjustmentFormContext'; // Import context
import StockInHistory from '../components/StockInHistory';
import AllSales from '../components/AllSales';

export default function Inventory() {
  const { isAdjustmentFormOpen, openAdjustmentForm, closeAdjustmentForm, resetAdjustmentForm } = useStockAdjustmentForm();
  const [refreshLedgerKey, setRefreshLedgerKey] = useState(0); // Add refresh key state

  const handleAdjustmentSuccess = () => {
    // Increment the key to trigger a refresh in the ledger
    setRefreshLedgerKey(prevKey => prevKey + 1);
    
    // Close the form and reset it
    closeAdjustmentForm();
    resetAdjustmentForm();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 mt-5">
      {/* <h1 className="text-2xl font-bold text-center">Inventory Management</h1> */}

      <div className="bg-white rounded shadow p-4">
        <div className="flex justify-between items-center mb-4">
          {/* <h2 className="text-xl font-bold">Manual Adjustments</h2>
          {!isAdjustmentFormOpen && (
            <button
              onClick={openAdjustmentForm}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg"
            >
              New Adjustment
            </button>
          )}
        </div>
        
        {isAdjustmentFormOpen && (
          <StockAdjustmentForm onSuccess={handleAdjustmentSuccess} />
        )} */}
      </div>

              <h1 className="text-xl font-bold mb-4">Entire Stock Movements Ledger</h1>
                  {/* <h2 className="text-xl font-bold">Manual Adjustments</h2> */}
          {!isAdjustmentFormOpen && (
            <button
              onClick={openAdjustmentForm}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg"
            >
              Manual Adjustment
            </button>
          )}
{/* 
      <div className="bg-white rounded shadow p-4">

        </div> */}
        
        {isAdjustmentFormOpen && (
          <StockAdjustmentForm onSuccess={handleAdjustmentSuccess} />
        )}
        <StockMovementsLedger key={refreshLedgerKey} /> {/* Pass the key to the ledger */}
      </div>

            <div className="mt-6">
            <StockInHistory />
            </div>
      
            <div className="mt-6">
              <AllSales />
            </div>
    </div>
  );
}
