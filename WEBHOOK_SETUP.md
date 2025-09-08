# Webhook Setup Instructions

## Setting Up Wallet Operations Webhook

To receive notifications for wallet deposits and withdrawals, follow these steps:

### 1. Update Webhook Configuration

Edit the file `src/config/webhook.ts` and replace `YOUR_WEBHOOK_URL_HERE` with your actual webhook URL:

```typescript
export const WEBHOOK_CONFIG = {
  // Replace with your webhook URL
  WALLET_OPERATIONS_WEBHOOK: "https://your-domain.com/api/webhooks/wallet",
  
  // Request timeout in milliseconds
  TIMEOUT: 10000
};
```

### 2. Webhook Data Format

When a user requests to add or withdraw funds, the following data will be sent to your webhook:

```json
{
  "ticket_id": "123e4567-e89b-12d3-a456-426614174000",
  "type": "fund_deposit", // or "fund_withdrawal"
  "user_info": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "amount": 50000,
  "currency": "INR",
  "priority": "medium", // "low", "medium", or "high"
  "description": "Optional user description",
  "current_balance": 25000,
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

### 3. Expected Webhook Response

Your webhook should respond with:
- **Status 200**: Request received successfully
- **Status 4xx/5xx**: Error (will be logged but won't fail the user operation)

### 4. Popular Webhook Services

You can use any of these services:

- **Zapier**: `https://hooks.zapier.com/hooks/catch/xxxxx/yyyyy`
- **Make (Integromat)**: `https://hook.eu1.make.com/xxxxx`
- **n8n**: `https://your-instance.n8n.cloud/webhook/xxxxx`
- **Custom API**: Your own server endpoint

### 5. Testing

After setting up your webhook URL:
1. Create a test property via admin panel
2. Try adding funds from the wallet
3. Check your webhook endpoint to confirm data is being received

### 6. Security Note

The webhook URL is configured in the frontend code. For production, consider:
- Using environment variables for sensitive URLs
- Adding authentication headers to webhook requests
- Validating webhook signatures

## Troubleshooting

- If webhook fails, the user operation will still complete successfully
- Check browser console for webhook error messages
- Verify your webhook URL is accessible and returns 200 status
- Test your webhook with tools like Postman or curl first