export function calculateFifo(batches, quantity) {
  let costOfGoodsSold = 0;
  let remainingQuantity = quantity;
  const updatedBatches = JSON.parse(JSON.stringify(batches));

  // Add original_quantity to each batch before modification
  for (const batch of updatedBatches) {
    batch.original_quantity = batch.remaining_quantity;
  }

  for (const batch of updatedBatches) {
    if (remainingQuantity <= 0) {
      break;
    }

    const quantityToTake = Math.min(batch.remaining_quantity, remainingQuantity);

    costOfGoodsSold += quantityToTake * batch.cost_price;
    batch.remaining_quantity -= quantityToTake;
    remainingQuantity -= quantityToTake;
  }

  if (remainingQuantity > 0) {
      throw new Error("Not enough stock to fulfill the order.");
    }

  return { costOfGoodsSold, updatedBatches };
}
