const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const receiptsDir = path.join(__dirname, '../../storage/receipts');

const ensureReceiptDir = () => {
  if (!fs.existsSync(receiptsDir)) {
    fs.mkdirSync(receiptsDir, { recursive: true });
  }
};

const generateReceipt = async ({ paymentId, receiptNumber, tenantName, propertyName, amount, paymentMethod, transactionId, paidAt }) => {
  ensureReceiptDir();

  const fileName = `receipt-${paymentId}-${Date.now()}.pdf`;
  const absolutePath = path.join(receiptsDir, fileName);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(absolutePath);

    doc.pipe(stream);

    doc.fontSize(22).text('RentFlow TZ Payment Receipt', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Receipt No: ${receiptNumber}`);
    doc.text(`Payment ID: ${paymentId}`);
    doc.text(`Tenant: ${tenantName || '-'}`);
    doc.text(`Property: ${propertyName || '-'}`);
    doc.text(`Amount: TZS ${Number(amount).toLocaleString()}`);
    doc.text(`Method: ${paymentMethod}`);
    doc.text(`Transaction ID: ${transactionId || '-'}`);
    doc.text(`Paid At: ${new Date(paidAt).toLocaleString()}`);
    doc.moveDown();
    doc.text('Status: SUCCESS', { underline: true });

    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return {
    absolutePath,
    publicPath: `/receipts/${fileName}`,
  };
};

module.exports = {
  generateReceipt,
};
