# Deployment Notes

## Important: .htaccess Protection

When deploying the frontend, **DO NOT use `--delete` flag with rsync**, as it will delete the `.htaccess` file which is critical for SPA routing.

### ❌ Wrong:
```bash
rsync -avz -e "ssh -p 2210" dist/spa/ jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/public_html/ --delete
```

### ✅ Correct:
```bash
rsync -avz -e "ssh -p 2210" dist/spa/ jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/public_html/
```

If you accidentally delete it, re-deploy the .htaccess file:
```bash
rsync -avz -e "ssh -p 2210" public_html/.htaccess jybcaorr@ghf57-22175.azdigihost.com:/home/jybcaorr/public_html/
```

## Price Formatting

Price formatting uses a regex pattern to ensure proper Vietnamese number format:
- `1500000` → `1.500.000₫`
- `150000` → `150.000₫`

This is implemented in:
- `client/pages/Upgrade.tsx` - `formatPrice()` function
- `client/components/PaymentModal.tsx` - `formatPrice()` function

## Billing Period Handling

When a user selects "Hàng năm" (Annual), the payment modal receives:
1. Correct annual price from database
2. Billing period parameter sent to API
3. Displayed billing period in payment modal

This ensures annual payments show the correct amount, not monthly price.

## Last Updated
December 29, 2025 - Fixed price formatting and billing period handling
