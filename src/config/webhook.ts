// Webhook Configuration
// Update this with your actual webhook URL
export const WEBHOOK_CONFIG = {
  // Replace with your webhook URL for wallet operations
  WALLET_OPERATIONS_WEBHOOK: "YOUR_WEBHOOK_URL_HERE",
  
  // Example webhook URLs (update these with your actual endpoints):
  // WALLET_OPERATIONS_WEBHOOK: "https://your-domain.com/api/webhooks/wallet",
  // WALLET_OPERATIONS_WEBHOOK: "https://hooks.zapier.com/hooks/catch/xxxxx/yyyyy",
  
  // Request timeout in milliseconds
  TIMEOUT: 10000
};

export default WEBHOOK_CONFIG;