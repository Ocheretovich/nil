// Function to process each receipt and return the error message (if any)
export function processReceipts(receipts) {
  for (let i = 0; i < receipts.length; i++) {
    const receipt = receipts[i];

    // If the transaction is not successful, return the error message or status
    if (!receipt.success || receipt.status !== 'Success') {
      const errorMessage = receipt.errorMessage || receipt.status;  // Return errorMessage or status
      return errorMessage;  // Exit the loop and return the first error message encountered
    }
  }

  // If all transactions are successful, return null
  return null;
}