import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './utils/AuthContext'; // Import AuthProvider
import { SalesCartProvider } from './utils/SalesCartContext'; // Import SalesCartProvider
import { ProductFormProvider } from './utils/ProductFormContext'; // Import ProductFormProvider
import { StockInFormProvider } from './utils/StockInFormContext'; // Import StockInFormProvider
import { StockAdjustmentFormProvider } from './utils/StockAdjustmentFormContext'; // Import StockAdjustmentFormProvider
import { BrowserRouter } from 'react-router-dom'; // Assuming you use react-router-dom for routing

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider> {/* Wrap your App with AuthProvider */}
        <SalesCartProvider> {/* Wrap your App with SalesCartProvider */}
          <ProductFormProvider> {/* Wrap your App with ProductFormProvider */}
            <StockInFormProvider> {/* Wrap your App with StockInFormProvider */}
              <StockAdjustmentFormProvider> {/* Wrap your App with StockAdjustmentFormProvider */}
                <App />
              </StockAdjustmentFormProvider>
            </StockInFormProvider>
          </ProductFormProvider>
        </SalesCartProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
