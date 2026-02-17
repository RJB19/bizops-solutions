// src/components/ReceiptModal.jsx
import React from 'react';
import { Modal, Input, Button, Form } from 'antd'; 
import { PrinterOutlined } from '@ant-design/icons';
import { formatPrice } from '../utils/formatPrice';

// Function to generate the HTML receipt content
const generateReceiptHTML = (sale, customerName, cashierName) => {
    if (!sale) return '';

    let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt - ${sale.display_id}</title>
            <style>
                body { font-family: 'Arial', sans-serif; margin: 0; padding: 10px; font-size: 10px; }
                .receipt-container { max-width: 80mm; margin: 0; padding: 5px; border: 1px solid #ccc; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                .receipt-header { text-align: center; margin-bottom: 10px; }
                .receipt-header h1 { margin: 0; font-size: 1.2em; }
                .receipt-details, .receipt-items, .receipt-footer { margin-bottom: 10px; }
                .receipt-details div, .receipt-items div { display: flex; justify-content: space-between; margin-bottom: 3px; }
                .receipt-items table { width: 100%; border-collapse: collapse; }
                .receipt-items th, .receipt-items td { padding: 4px; text-align: left; border-bottom: 1px solid #ddd; }
                .receipt-items th { background-color: #f0f0f0; }
                .receipt-items td.align-right { text-align: right; }
                .receipt-items td.align-center { text-align: center; }
                .receipt-footer { border-top: 1px dashed #ccc; padding-top: 5px; }
                .receipt-footer div { font-weight: bold; display: flex; justify-content: space-between; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .bold { font-weight: bold; }
                .small-text { font-size: 0.7em; color: #555; }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <div class="receipt-header">
                    <h1>Valecor Agri Trading</h1>
                    <p class="small-text">OLD SAN ROQUE (POB.) 4418, PILI, CAMARINES SUR</p>
                    <p class="small-text">NON-VAT Reg. TIN: 414-981-374-00000</p>
                </div>
                
                <div class="receipt-details">
                    <div><span>Delivery Receipt:</span> <span class="bold">${sale.display_id}</span></div>
                    <div><span>Date:</span> <span class="bold">${new Date(sale.created_at).toLocaleDateString()}</span></div>
                    <div><span>Delivered to:</span> <span class="bold">${customerName || 'N/A'}</span></div>
                    <div><span>Address :</span> <span class="bold">${cashierName || 'N/A'}</span></div>
                </div>

                <div class="receipt-items">
                    <table>
                        <thead>
                            <tr>
                                <th style="text-align: left;">Item</th>
                                <th style="text-align: center;">Qty</th>
                                <th style="text-align: right;">Price</th>
                                <th style="text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sale.sale_items.map(item => `
                                <tr>
                                    <td>${item.products.name}</td>
                                    <td class="align-center">${item.quantity}</td>
                                    <td class="align-right">${item.selling_price.toFixed(2)}</td>
                                    <td class="align-right bold">${formatPrice(item.quantity * item.selling_price)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="receipt-footer">
                    <div><span>Subtotal:</span> <span class="bold text-right">${formatPrice(sale.total_amount)}</span></div>
                    <div><span>Tax (0%):</span> <span class="bold text-right">${formatPrice(0)}</span></div>
                    <div><span>Discount:</span> <span class="bold text-right">${formatPrice(0)}</span></div>
                    <div><span>Total Amount:</span> <span class="bold text-right">${formatPrice(sale.total_amount)}</span></div>
                </div>

                <div class="receipt-footer" style="margin-top: 10px;">
                    <div><span>Amount Paid:</span> <span class="bold text-right">${formatPrice(sale.total_amount)}</span></div>
                    <div><span>Change Due:</span> <span class="bold text-right">${formatPrice(0)}</span></div>
                </div>
                
                <div class="receipt-footer" style="text-align: center; margin-top: 30px;">
                    <p>Thank you for your purchase!</p>
                    <p class="small-text">Valecor - Your Partner in Your Business</p>
                </div>
            </div>
        </body>
        </html>
    `;
    return htmlContent;
};

// Component for the Receipt Modal
const ReceiptModal = ({ open, onClose, saleData }) => {
    const [form] = Form.useForm();

    const onFinishPrintReceipt = (values) => {
        if (!saleData) return;

        const { customerName, cashierName } = values;
        const htmlReceipt = generateReceiptHTML(saleData, customerName, cashierName);
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(htmlReceipt);
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };

    if (!saleData) return null;

    return (
        <Modal
            centered
            open={open}
            onCancel={onClose}
            title={<div className="flex items-center gap-2 text-lg font-semibold">Receipt Details</div>}
            footer={[
                <Button key="back" onClick={onClose}>
                    Close
                </Button>,
                <Button
                    key="print"
                    type="primary"
                    onClick={() => form.submit()}
                    icon={<PrinterOutlined />}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    Print Receipt
                </Button>
            ]}
            width={700} 
        >
            <Form
                form={form}
                layout="vertical"
                name="receipt_form"
                onFinish={onFinishPrintReceipt}
                initialValues={{ customerName: '', cashierName: '' }}
            >
                <div className="receipt-modal-content p-4">
                    <div className="text-center mb-4 pb-3 border-b border-dashed border-gray-400">
                        <h1 className="text-2xl font-bold text-gray-800 mb-1">Valecor Agri Trading</h1>
                        <p className="text-xs text-gray-600">OLD SAN ROQUE (POB.) 4418, PILI, CAMARINES SUR</p>
                        <p className="text-xs text-gray-600">NON-VAT Reg. TIN: 414-981-374-00000</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <Form.Item
                            label="Delivered to: "
                            name="customerName"
                            rules={[{ required: true, message: 'Please enter customer name!' }]}
                        >
                            <Input
                                placeholder="Enter Customer Name"
                            />
                        </Form.Item>
                        <Form.Item
                            label="Address: "
                            name="cashierName"
                            rules={[{ message: 'Enter address' }]}
                        >
                            <Input
                                placeholder="Enter Address"
                            />
                        </Form.Item>
                    </div>

                    <div className="mb-4 pb-3 border-b border-dashed border-gray-400">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Delivery Receipt:</span>
                            <span className="font-medium text-gray-800">{saleData.display_id}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Date:</span>
                            <span className="font-medium text-gray-800">{new Date(saleData.created_at).toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="mb-4 pb-3 border-b border-dashed border-gray-400">
                        <table className="w-full text-sm">
                            <thead>
                                <tr>
                                    <th className="py-2 text-left text-gray-600">Item</th>
                                    <th className="py-2 text-center text-gray-600">Qty</th>
                                    <th className="py-2 text-right text-gray-600">Price</th>
                                    <th className="py-2 text-right text-gray-600">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {saleData.sale_items.map((item, index) => (
                                    <tr key={index}>
                                        <td className="py-2">{item.products.name}</td>
                                        <td className="py-2 text-center">{item.quantity}</td>
                                        <td className="py-2 text-right">{item.selling_price.toFixed(2)}</td>
                                        <td className="py-2 text-right font-semibold">{formatPrice(item.quantity * item.selling_price)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="pb-3 border-b border-dashed border-gray-400">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-medium text-gray-800">{formatPrice(saleData.total_amount)}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Tax (0%):</span>
                            <span className="font-medium text-gray-800">{formatPrice(0)}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Discount:</span>
                            <span className="font-medium text-gray-800">{formatPrice(0)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg mb-1">
                            <span>Total Amount:</span>
                            <span className="text-gray-800">{formatPrice(saleData.total_amount)}</span>
                        </div>
                    </div>

                    <div className="pb-3 border-b border-dashed border-gray-400">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Amount Paid:</span>
                            <span className="font-medium text-gray-800">{formatPrice(saleData.total_amount)}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Change Due:</span>
                            <span className="font-medium text-gray-800">{formatPrice(0)}</span>
                        </div>
                    </div>
                    
                    <div className="text-center mt-6">
                        <p className="font-medium text-gray-700">Thank you for your purchase!</p>
                        <p className="text-xs text-gray-500 mt-1">Valecor - Your Partner in Your Business</p>
                    </div>
                </div>
            </Form>
        </Modal>
    );
};

export default ReceiptModal;