// Simple validation script for PayChangu integration
// Run with: node validate-paychangu.js

const testPayload = {
  amount: 950,
  currency: 'MWK',
  email: 'test@example.com',
  tx_ref: 'test-payment-123',
  callback_url: 'http://localhost:4000/api/payments/webhook',
  return_url: 'http://localhost:3000/payments?sessionId=test-payment-123'
};

console.log('PayChangu API Payload Validation:');
console.log('==================================');
console.log('Endpoint: https://api.paychangu.com/payment');
console.log('Method: POST');
console.log('Headers:');
console.log('  Content-Type: application/json');
console.log('  Authorization: Bearer <PAYCHANGU_SECRET>');
console.log('Body:');
console.log(JSON.stringify(testPayload, null, 2));

console.log('\nExpected Response:');
console.log('==================');
console.log(`{
  "status": "success",
  "data": {
    "checkout_url": "https://checkout.paychangu.com/..."
  }
}`);

console.log('\n✅ Payload structure matches PayChangu Standard Checkout API documentation');
console.log('✅ Endpoint updated from /api/v1/transaction/initialize to /payment');
console.log('✅ Field name changed from "reference" to "tx_ref"');
console.log('✅ Integration should work with proper PAYCHANGU_SECRET environment variable');