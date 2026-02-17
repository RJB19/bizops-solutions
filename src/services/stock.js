import { supabase } from './supabase';
import { calculateFifo } from '../utils/fifo'; // Assuming calculateFifo is appropriate for deductions

export async function adjustStock({
  productId,
  quantity,
  movementCategory, // 'IN' or 'OUT'
  reason, // Detailed reason like 'DAMAGED', 'PHYSICAL_INCREASE'
  notes,
  costPrice, // Only relevant for 'IN' movements
  companyId,
}) {
  if (!productId || !quantity || quantity <= 0 || !movementCategory || !reason || !companyId) {
    throw new Error('Missing required adjustment parameters.');
  }

  // Ensure quantity is a positive number
  const adjustedQuantity = Math.abs(Number(quantity));

  if (movementCategory === 'OUT') {
    // --- Handle OUT movements (Deduction from existing batches) ---
    // Fetch available stock batches
    const { data: batches, error: fetchBatchesError } = await supabase
      .from('stock_batches')
      .select('*')
      .eq('product_id', productId)
      .eq('company_id', companyId)
      .gt('remaining_quantity', 0)
      .order('received_at', { ascending: true }); // FIFO

    if (fetchBatchesError) throw fetchBatchesError;
    if (!batches || batches.length === 0) {
      throw new Error('No stock available for deduction.');
    }

    // Calculate stock deduction using FIFO logic
    const { updatedBatches } = calculateFifo(batches, adjustedQuantity);

    // Update stock_batches and log movements for each deducted batch
    for (const batch of updatedBatches) {
      // Only update batches that actually had stock deducted
      if (batch.original_quantity !== batch.remaining_quantity) {
        const deductedAmount = batch.original_quantity - batch.remaining_quantity;

        const { error: updateError } = await supabase
          .from('stock_batches')
          .update({ remaining_quantity: batch.remaining_quantity })
          .eq('id', batch.id)
          .eq('company_id', companyId);

        if (updateError) throw updateError;

        const { error: movementError } = await supabase.from('stock_movements').insert({
          product_id: productId,
          batch_id: batch.id,
          quantity: deductedAmount,
          movement_type: 'OUT',
          reason: reason,
          notes: notes,
          company_id: companyId,
        });

        if (movementError) {
          console.error('Error logging stock movement (OUT):', movementError.message);
          // Decide if this should throw or just log
        }
      }
    }
  } else if (movementCategory === 'IN') {
    // --- Handle IN movements (Adding to stock) ---
    // For simplicity, always create a new batch for 'IN' adjustments
    // In a more complex system, you might merge into existing batches or prompt for batch details.
    
    // Ensure costPrice is provided for 'IN' movements
    if (costPrice === undefined || costPrice === null || Number(costPrice) <= 0) {
      throw new Error('Cost Price is required and must be greater than 0 for incoming stock adjustments.');
    }

    const { data: newBatch, error: insertBatchError } = await supabase
      .from('stock_batches')
      .insert({
        product_id: productId,
        quantity: adjustedQuantity,
        remaining_quantity: adjustedQuantity,
        cost_price: Number(costPrice),
        received_at: new Date(), // Use current date for adjustment batches
        company_id: companyId,
        // You might want to add a flag or note for adjustment batches vs. regular inbound
      }).select().single();

    if (insertBatchError) throw insertBatchError;

    const { error: movementError } = await supabase.from('stock_movements').insert({
      product_id: productId,
      batch_id: newBatch.id,
      quantity: adjustedQuantity,
      movement_type: 'IN',
      reason: reason,
      notes: notes,
      company_id: companyId,
    });

    if (movementError) {
      console.error('Error logging stock movement (IN):', movementError.message);
      // Decide if this should throw or just log
    }
  } else {
    throw new Error('Invalid movement category.');
  }

  return { success: true };
}

export async function getLatestCostPrice(productId, companyId) {
  if (!productId || !companyId) {
    return null;
  }

  const { data, error } = await supabase
    .from('stock_batches')
    .select('cost_price')
    .eq('product_id', productId)
    .eq('company_id', companyId)
    .order('received_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // Ignore "exact one row was not found"
    console.error('Error fetching latest cost price:', error.message);
    return null;
  }

  return data?.cost_price || null;
}
