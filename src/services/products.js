import { supabase } from './supabase';

export async function getProducts() {
  const { data: company_id, error: companyIdError } = await supabase.rpc('current_user_company_id');

  if (companyIdError) {
    console.error("Error fetching company_id for RLS in getProducts:", companyIdError);
    throw companyIdError;
  }
  if (!company_id) {
    throw new Error("current_user_company_id returned null. User might not be authenticated or profile not set.");
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('company_id', company_id) // Filter by company_id
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createProduct(product) {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProduct(id, updates) {
  const { data: company_id, error: companyIdError } = await supabase.rpc('current_user_company_id');
  if (companyIdError) {
    console.error("Error fetching company_id for RLS in updateProduct:", companyIdError);
    throw companyIdError;
  }
  if (!company_id) {
    throw new Error("current_user_company_id returned null. User might not be authenticated or profile not set.");
  }

  const attributeHistory = {};

  // First, fetch the current product data to compare for changes
  const { data: oldProduct, error: fetchError } = await supabase
    .from('products')
    .select('unit, low_stock_threshold')
    .eq('id', id)
    .eq('company_id', company_id) // Add company_id filter
    .single();

  if (fetchError) throw fetchError;

  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .eq('company_id', company_id) // Add company_id filter
    .select()
    .single()

  if (error) throw error

  // If unit has changed, prepare history data
  if (oldProduct.unit !== data.unit) {
    attributeHistory.old_unit = oldProduct.unit;
    attributeHistory.new_unit = data.unit;
  }
  // If low_stock_threshold has changed, prepare history data
  if (oldProduct.low_stock_threshold !== data.low_stock_threshold) {
    attributeHistory.old_threshold = oldProduct.low_stock_threshold;
    attributeHistory.new_threshold = data.low_stock_threshold;
  }

  return { success: true, attributeHistory };
}



export async function updateProductPrice(product, newPrice, forceUpdate = false) {
  const { data: company_id, error: companyIdError } = await supabase.rpc('current_user_company_id');
  if (companyIdError) {
    console.error("Error fetching company_id for RLS in updateProductPrice:", companyIdError);
    throw companyIdError;
  }
  if (!company_id) {
    throw new Error("current_user_company_id returned null. User might not be authenticated or profile not set.");
  }

  if (!forceUpdate) {
    // Validate new price against highest existing item cost
    const { data: maxCostData, error: maxCostError } = await supabase
      .from('stock_batches')
      .select('cost_price')
      .eq('product_id', product.id)
      .eq('company_id', company_id) // Add company_id filter
      .gt('remaining_quantity', 0) // <--- Only consider batches with remaining stock
      .order('cost_price', { ascending: false }) // Get highest cost first
      .limit(1)
      .single();

    if (maxCostError && maxCostError.code !== 'PGRST116') { // PGRST116 means "exact one row was not found"
      throw maxCostError; // Re-throw actual errors
    }

    if (maxCostData && newPrice < maxCostData.cost_price) {
      return {
        success: false,
        shouldConfirm: true,
        message: `New selling price (${newPrice.toFixed(2)}) is lower than the highest existing item cost (${maxCostData.cost_price.toFixed(2)}). If your selling price falls below any item cost in stock (batches - FIFO applied), you are certain to incur a loss (negative) when selling those units.
      
        If this is intentional, do you want to proceed anyway?`,
      };
    }
  }
  
  const priceHistory = {};

  // If price has changed, prepare history data
  if (product.selling_price !== newPrice) {
    priceHistory.old_price = product.selling_price;
    priceHistory.new_price = newPrice;
  }

  // Update product selling price
  const { error } = await supabase
    .from('products')
    .update({ selling_price: newPrice })
    .eq('id', product.id)
    .eq('company_id', company_id) // Add company_id filter

  if (error) throw error // Re-throw actual errors

  return { success: true, shouldConfirm: false, priceHistory };
}




// Consolidated function to log all product changes
export async function logProductChanges(productId, priceHistory, attributeHistory) {
  const payload = { product_id: productId };
  let hasChanges = false;

  // Add price changes if they exist
  if (priceHistory && (priceHistory.old_price !== undefined || priceHistory.new_price !== undefined)) {
    payload.old_price = priceHistory.old_price;
    payload.new_price = priceHistory.new_price;
    hasChanges = true;
  }

  // Add attribute changes if they exist
  if (attributeHistory) {
    if (attributeHistory.old_unit !== undefined || attributeHistory.new_unit !== undefined) {
      payload.old_unit = attributeHistory.old_unit;
      payload.new_unit = attributeHistory.new_unit;
      hasChanges = true;
    }
    if (attributeHistory.old_threshold !== undefined || attributeHistory.new_threshold !== undefined) {
      payload.old_threshold = attributeHistory.old_threshold;
      payload.new_threshold = attributeHistory.new_threshold;
      hasChanges = true;
    }
  }

  // Only insert if there are actual changes
  if (hasChanges) {
    const { data: company_id, error: companyIdError } = await supabase.rpc('current_user_company_id');

    if (companyIdError) {
      console.error("Error fetching company_id for RLS:", companyIdError);
      throw companyIdError;
    }
    if (!company_id) {
      throw new Error("current_user_company_id returned null. User might not be authenticated or profile not set.");
    }

    payload.company_id = company_id; // Add company_id to the payload

    const { error: historyError } = await supabase
      .from('product_price_history')
      .insert(payload);

    if (historyError) throw historyError;
  }
}

export async function archiveProduct(productId) {
  const { data: company_id, error: companyIdError } = await supabase.rpc('current_user_company_id');
  if (companyIdError) {
    console.error("Error fetching company_id for RLS in archiveProduct:", companyIdError);
    throw companyIdError;
  }
  if (!company_id) {
    throw new Error("current_user_company_id returned null. User might not be authenticated or profile not set.");
  }

  // Check stock
  const { data: stock } = await supabase
    .from('stock_batches')
    .select('remaining_quantity')
    .eq('product_id', productId)
    .eq('company_id', company_id); // Add company_id filter

  const totalStock = stock?.reduce(
    (sum, s) => sum + Number(s.remaining_quantity),
    0
  );

  if (totalStock > 0) {
    throw new Error('Cannot archive product with existing stock');
  }

  // Archive product by setting archived_at
  const { error } = await supabase
    .from('products')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', productId)
    .eq('company_id', company_id); // Add company_id filter

  if (error) throw error;
}

export async function unarchiveProduct(productId) {
  const { data: company_id, error: companyIdError } = await supabase.rpc('current_user_company_id');
  if (companyIdError) {
    console.error("Error fetching company_id for RLS in unarchiveProduct:", companyIdError);
    throw companyIdError;
  }
  if (!company_id) {
    throw new Error("current_user_company_id returned null. User might not be authenticated or profile not set.");
  }

  // Unarchive product by setting archived_at to null
  const { error } = await supabase
    .from('products')
    .update({ archived_at: null })
    .eq('id', productId)
    .eq('company_id', company_id); // Add company_id filter

  if (error) throw error;
}


export async function getUniqueCategories() {
  const { data: company_id, error: companyIdError } = await supabase.rpc('current_user_company_id');

  if (companyIdError) {
    console.error("Error fetching company_id for RLS in getUniqueCategories:", companyIdError);
    throw companyIdError;
  }
  if (!company_id) {
    throw new Error("current_user_company_id returned null. User might not be authenticated or profile not set.");
  }

  const { data, error } = await supabase
    .from('products')
    .select('category', { distinct: true })
    .eq('company_id', company_id);

  if (error) throw error;
  // Normalize categories: trim whitespace, convert to lowercase, and use a Set to ensure true uniqueness
  const normalizedCategories = Array.from(new Set(
    data
      .map(item => item.category?.trim().toLowerCase()) // Normalize and handle potential nulls
      .filter(Boolean) // Filter out nulls and empty strings after normalization
  ));
  return normalizedCategories;
}

export async function getSaleItems() {
  const { data: sales, error } = await supabase
    .from('sales')
    .select(
      `
      id, created_at,
      sale_items (
        id, product_id, quantity, selling_price, cost_price,
        products ( name, sku )
      )
    `
    )
    .is('cancelled_at', null) // Filter out cancelled sales
    .order('created_at', { ascending: false })

  if (error) throw error

  const saleItems = sales.flatMap(sale =>
    sale.sale_items.map(item => ({
      sale_id: sale.id, // Include sale_id here for linking with returns
      sale_item_id: item.id, // Include sale_item_id
      product_name: item.products.name,
      sku: item.products.sku,
      product_id: item.product_id, // Include product_id
      quantity: item.quantity,
      selling_price: item.selling_price,
      cost_price: item.cost_price,
      amount: item.quantity * item.selling_price,
      gross_profit: (item.quantity * item.selling_price) - (item.quantity * item.cost_price),
      date: sale.created_at
    }))
  )

  return saleItems
}

// New simplified function for debugging
export async function getGrossSaleItems() {
  const { data: company_id, error: companyIdError } = await supabase.rpc('current_user_company_id');
  if (companyIdError) {
    console.error("DEBUG: Error fetching company_id in getGrossSaleItems:", companyIdError);
    throw companyIdError;
  }
  if (!company_id) {
    console.error("DEBUG: company_id is null in getGrossSaleItems.");
    throw new Error("current_user_company_id returned null.");
  }
  console.log(`DEBUG: Fetching gross sales for company_id: ${company_id}`);

  const { data: salesData, error: salesError } = await supabase
    .from('sales')
    .select(`
      id, created_at,
      sale_items (
        id, product_id, quantity, selling_price, cost_price,
        products ( name, sku )
      )
    `)
    .is('cancelled_at', null)
    .eq('company_id', company_id);

  if (salesError) {
    console.error("DEBUG: Error fetching sales data in getGrossSaleItems:", salesError);
    throw salesError;
  }

  console.log(`DEBUG: Found ${salesData.length} gross sales records.`);

  const grossSaleItems = salesData.flatMap(sale =>
    sale.sale_items.map(item => ({
      sale_id: sale.id,
      sale_item_id: item.id,
      product_id: item.product_id,
      product_name: item.products.name,
      sku: item.products.sku,
      quantity: item.quantity,
      selling_price: item.selling_price,
      cost_price: item.cost_price,
      amount: item.quantity * item.selling_price,
      gross_profit: (item.quantity * item.selling_price) - (item.quantity * item.cost_price),
      date: sale.created_at,
    }))
  );

  console.log(`DEBUG: Total gross sale items flattened: ${grossSaleItems.length}`);
  return grossSaleItems;
}


// New function to get net sale items (subtracting returns)
export async function getNetSaleItems() {
  const { data: company_id, error: companyIdError } = await supabase.rpc('current_user_company_id');
  if (companyIdError) {
    console.error("Error fetching company_id for RLS in getNetSaleItems:", companyIdError);
    throw companyIdError;
  }
  if (!company_id) {
    throw new Error("current_user_company_id returned null. User might not be authenticated or profile not set.");
  }

  // 1. Fetch all original sales items (excluding cancelled sales)
  const { data: salesData, error: salesError } = await supabase
    .from('sales')
    .select(`
      id, created_at,
      sale_items (
        id, product_id, quantity, selling_price, cost_price,
        products ( name, sku )
      )
    `)
    .is('cancelled_at', null)
    .eq('company_id', company_id)
    .order('created_at', { ascending: false });

  if (salesError) {
    console.error("Error fetching sales data for net calculation:", salesError);
    throw salesError;
  }

  // Flatten the sales items and add sale_id and sale_date
  let netSaleItems = salesData.flatMap(sale =>
    sale.sale_items.map(item => ({
      sale_id: sale.id,
      sale_item_id: item.id,
      product_id: item.product_id,
      product_name: item.products.name,
      sku: item.products.sku,
      quantity: item.quantity,
      selling_price: item.selling_price,
      cost_price: item.cost_price, // This is now per-item average cost from DB
      amount: item.quantity * item.selling_price,
      gross_profit: (item.quantity * item.selling_price) - (item.quantity * item.cost_price),
      date: sale.created_at,
    }))
  );

  // LOG 1: Initial netSaleItems after flattening and initial gross_profit calculation
  console.log('--- getNetSaleItems: Initial netSaleItems (Gross) ---');
  netSaleItems.forEach(item => {
    console.log(`SaleID: ${item.sale_id}, Product: ${item.product_name}, Qty: ${item.quantity}, SP: ${item.selling_price}, CP: ${item.cost_price}, GP: ${item.gross_profit}`);
  });
  console.log('----------------------------------------------------');

  // 2. Fetch all relevant stock movements that represent returns
  const { data: returnMovements, error: movementsError } = await supabase
    .from('stock_movements')
    .select(`
      product_id, quantity, movement_type, reason, reference_id
    `)
    .eq('company_id', company_id)
    .eq('movement_type', 'IN')
    .eq('reason', 'RETURN'); // Filter for returned items

  if (movementsError) {
    console.error("Error fetching return movements:", movementsError);
    throw movementsError;
  }

  // Create a map for easy lookup of netSaleItems by sale_id-product_id for modifications
  const netSaleItemsMap = new Map(netSaleItems.map(item => [`${item.sale_id}-${item.product_id}`, item]));

  returnMovements.forEach(movement => {
    const key = `${movement.reference_id}-${movement.product_id}`;
    const saleItemToAdjust = netSaleItemsMap.get(key);

    if (saleItemToAdjust) {
      const returnedQty = movement.quantity;
      const originalQty = saleItemToAdjust.quantity;

      // Ensure we don't subtract more than was originally sold
      const actualQtyToSubtract = Math.min(originalQty, returnedQty);

      // LOG 2: Before Return Adjustment
      console.log(`--- Return Adj: Before --- SaleID: ${saleItemToAdjust.sale_id}, Product: ${saleItemToAdjust.product_name}, Qty: ${saleItemToAdjust.quantity}, GP: ${saleItemToAdjust.gross_profit}, Returned: ${returnedQty}`);


      saleItemToAdjust.quantity -= actualQtyToSubtract;
      saleItemToAdjust.amount = saleItemToAdjust.quantity * saleItemToAdjust.selling_price;
      saleItemToAdjust.gross_profit = (saleItemToAdjust.quantity * saleItemToAdjust.selling_price) - (saleItemToAdjust.quantity * saleItemToAdjust.cost_price);

      // If we subtracted all from this sale item, it means it's fully returned
      if (saleItemToAdjust.quantity <= 0) {
        saleItemToAdjust.quantity = 0; // Ensure no negative quantities
        saleItemToAdjust.amount = 0;
        saleItemToAdjust.gross_profit = 0;
      }
      // Update the map with the adjusted item
      netSaleItemsMap.set(key, saleItemToAdjust);

      // LOG 3: After Return Adjustment
      console.log(`--- Return Adj: After --- SaleID: ${saleItemToAdjust.sale_id}, Product: ${saleItemToAdjust.product_name}, Net Qty: ${saleItemToAdjust.quantity}, Net GP: ${saleItemToAdjust.gross_profit}`);
    }
  });

  // Filter out fully returned items (quantity 0) and return the result
  return Array.from(netSaleItemsMap.values()).filter(item => item.quantity > 0 || item.amount > 0 || item.gross_profit > 0);
}


export async function getStockInItems() {
  const { data: company_id, error: companyIdError } = await supabase.rpc('current_user_company_id');

  if (companyIdError) {
    console.error("Error fetching company_id for RLS in getStockInItems:", companyIdError);
    throw companyIdError;
  }
  if (!company_id) {
    throw new Error("current_user_company_id returned null. User might not be authenticated or profile not set.");
  }

  const { data: movements, error } = await supabase
    .from('stock_movements')
    .select(
      `
      batch_id,
      stock_batches (
        id,
        received_at,
        quantity,
        cost_price,
        products ( name, sku )
      )
      `
    )
    .eq('company_id', company_id)
    .eq('movement_type', 'IN')
    .eq('reason', 'Stock In')
    .order('received_at', { foreignTable: 'stock_batches', ascending: false });

  if (error) throw error;

  // Filter out movements where batch data is null (e.g., if a batch was deleted)
  const validMovements = movements.filter(movement => movement.stock_batches !== null); // Adjusted reference

  const stockInItems = validMovements.map(movement => ({
    product_name: movement.stock_batches.products.name, // Adjusted reference
    sku: movement.stock_batches.products.sku, // Adjusted reference
    quantity: movement.stock_batches.quantity, // Adjusted reference
    item_cost: movement.stock_batches.cost_price, // Adjusted reference
    total_cost: movement.stock_batches.quantity * movement.stock_batches.cost_price, // Adjusted reference
    date: movement.stock_batches.received_at, // Adjusted reference
  }));

  return stockInItems;
}