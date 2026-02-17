import React, { useState, useEffect } from 'react';
import { getNetSaleItems, getStockInItems } from '../services/products'; // Use getNetSaleItems
import { formatPrice } from '../utils/formatPrice';

export default function DailyStockModal({ selectedDate, onClose }) {
  const [stockInDetails, setStockInDetails] = useState([]);
  const [saleDetails, setSaleDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalStockInCost, setTotalStockInCost] = useState(0);
  const [totalSalesAmount, setTotalSalesAmount] = useState(0);
  const [totalGrossProfit, setTotalGrossProfit] = useState(0);

  useEffect(() => {
    async function fetchDetails() {
      setLoading(true);
      console.log('DailyStockModal: Fetching details for', selectedDate); // Log start of fetch
      try {
        const allSaleItems = await getNetSaleItems();
        const allStockInItems = await getStockInItems();

        console.log('DailyStockModal: allSaleItems fetched', allSaleItems); // Log fetched sale items
        console.log('DailyStockModal: allStockInItems fetched', allStockInItems); // Log fetched stock-in items


        const selectedDateStr = `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`;
        console.log('DailyStockModal: selectedDateStr', selectedDateStr); // Log formatted date string

        // Filter sales for the selected date
        const filteredSales = allSaleItems.filter((item) => {
          const itemDate = new Date(item.date);
          const itemDateStr = `${itemDate.getFullYear()}-${(
            itemDate.getMonth() + 1
          )
            .toString()
            .padStart(2, '0')}-${itemDate
            .getDate()
            .toString()
            .padStart(2, '0')}`;
            return itemDateStr === selectedDateStr;
        });
        console.log('DailyStockModal: filteredSales', filteredSales); // Log filtered sales

        const aggregatedSales = filteredSales.reduce((acc, item) => {
          let product = acc.find((p) => p.product_name === item.product_name);
          if (product) {
            product.quantity += item.quantity;
            product.amount += item.amount;
            product.gross_profit += item.gross_profit;
          } else {
            acc.push({
              product_name: item.product_name,
              sku: item.sku,
              quantity: item.quantity,
              amount: item.amount,
              gross_profit: item.gross_profit,
            });
          }
          return acc;
        }, []);
        console.log('DailyStockModal: aggregatedSales', aggregatedSales); // Log aggregated sales

        setSaleDetails(aggregatedSales);
        setTotalSalesAmount(
          filteredSales.reduce((sum, item) => sum + item.amount, 0)
        );
        setTotalGrossProfit(
          filteredSales.reduce((sum, item) => sum + item.gross_profit, 0)
        );
        console.log('DailyStockModal: totalSalesAmount', totalSalesAmount); // Log total sales amount
        console.log('DailyStockModal: totalGrossProfit', totalGrossProfit); // Log total gross profit


        // Filter stock-in for the selected date
        const filteredStockIn = allStockInItems.filter((item) => {
          const itemDate = new Date(item.date);
          const itemDateStr = `${itemDate.getFullYear()}-${(
            itemDate.getMonth() + 1
          )
            .toString()
            .padStart(2, '0')}-${itemDate
            .getDate()
            .toString()
            .padStart(2, '0')}`;
          return itemDateStr === selectedDateStr;
        });
        console.log('DailyStockModal: filteredStockIn', filteredStockIn); // Log filtered stock-in

        const aggregatedStockIn = filteredStockIn.reduce((acc, item) => {
          let product = acc.find((p) => p.product_name === item.product_name);
          if (product) {
            product.quantity += item.quantity;
            product.total_cost += item.total_cost;
          } else {
            acc.push({
              product_name: item.product_name,
              sku: item.sku,
              quantity: item.quantity,
              item_cost: item.item_cost, // Ensure item_cost is available if needed
              total_cost: item.total_cost,
            });
          }
          return acc;
        }, []);
        console.log('DailyStockModal: aggregatedStockIn', aggregatedStockIn); // Log aggregated stock-in

        setStockInDetails(aggregatedStockIn);
        setTotalStockInCost(
          filteredStockIn.reduce((sum, item) => sum + item.total_cost, 0)
        );
        console.log('DailyStockModal: totalStockInCost', totalStockInCost); // Log total stock-in cost

      } catch (error) {
        console.error('DailyStockModal: Error fetching daily stock details:', error.message); // Log actual error
      } finally {
        setLoading(false);
        console.log('DailyStockModal: Finished fetching, loading set to false'); // Log end of fetch
      }
    }

    if (selectedDate) {
      fetchDetails();
    }
  }, [selectedDate]);

  if (!selectedDate) return null; // Don't render if no date is selected

  const formattedDate = selectedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative p-5 border w-[95vw] max-w-lg md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="text-2xl font-bold">Details for {formattedDate}</h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 text-3xl leading-none font-semibold"
          >
            &times;
          </button>
        </div>

        {loading ? (
          <p className="text-center p-4">Loading details...</p>
        ) : (
          <div className="space-y-6">
            {/* Stock In Section */}
            <div>
              <h4 className="text-xl font-semibold mb-2 text-black-700">
                Purchase (Stock In)
              </h4>
              {stockInDetails.length === 0 ? (
                <p>No stock-in recorded for this day.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border-collapse table-auto">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-2 border text-left">Product</th>
                        <th className="p-2 border text-left">SKU</th>
                        <th className="p-2 border text-right">Qty</th>
                        <th className="p-2 border text-right">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockInDetails.map(
                        (
                          item,
                          index 
                        ) => (
                          <tr key={index} className="border-t">
                            {' '}
                            <td className="p-2 border">{item.product_name}</td>
                            <td className="p-2 border">{item.sku || '-'}</td>
                            <td className="p-2 border text-right">
                              {item.quantity}
                            </td>
                            <td className="p-2 border text-right">
                              {formatPrice(item.total_cost)}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                    {stockInDetails.length > 0 && (
                      <tfoot>
                        <tr className="bg-gray-100 font-bold">
                          <td
                            colSpan="3"
                            className="p-2 border text-right"
                          >
                            Today's Total Purchase Price:
                          </td>{' '}
                          <td className="p-2 border text-right">
                            {formatPrice(totalStockInCost)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>

            {/* Sales (Stock Out) Section */}
            <div>
              <h4 className="text-xl font-semibold mb-2 text-green-700">
                Sales (Stock Out)
              </h4>
              {saleDetails.length === 0 ? (
                <p>No sales recorded for this day.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border-collapse table-auto">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-2 border text-left">Product</th>
                        <th className="p-2 border text-left">SKU</th>
                        <th className="p-2 border text-right">Qty</th>
                        <th className="p-2 border text-right">Total Sold</th>
                        <th className="p-2 border text-right">Gross Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saleDetails.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2 border">{item.product_name}</td>
                          <td className="p-2 border">{item.sku || '-'}</td>
                          <td className="p-2 border text-right">
                            {item.quantity}
                          </td>
                          <td className="p-2 border text-right">
                            {formatPrice(item.amount)}
                          </td>
                          <td className="p-2 border text-right">
                            {formatPrice(item.gross_profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {saleDetails.length > 0 && (
                      <tfoot>
                        <tr className="bg-gray-100 font-bold">
                          <td
                            colSpan="3"
                            className="p-2 border text-right"
                          >
                            Today's Total Sale:
                          </td>
                          <td className="p-2 border text-right">
                            {formatPrice(totalSalesAmount)}
                          </td>
                          <td></td>
                        </tr>
                        <tr className="bg-gray-100 font-bold">
                          <td
                            colSpan="3"
                            className="p-2 border text-right"
                          >
                            Today's Total Gross Profit:
                          </td>
                          <td></td>
                          <td className="p-2 border text-right">
                            {formatPrice(totalGrossProfit)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}