# Order Management System - Complete Testing Guide

## Fixed Issues Summary

### ✅ Issue 1: Order Status Update Not Working
**Root Cause:** API endpoint was using PATCH, but backend requires PUT
**Fix:** Changed `OrderServices.updateOrderStatus()` from `API.patch()` to `API.put()`
**File:** `src/services/OrderServices.jsx` (Line 35)

### ✅ Issue 2: Order Items Not Displaying
**Root Cause:** Response parsing didn't match new API format
**Fix:** Updated OrderDetails.jsx to correctly parse `{ status, summary, items: [] }` response
**File:** `src/pages/order/OrderDetails.jsx` (Lines 103-115)

### ✅ Issue 3: Order Creation with Items Not Working
**Root Cause:** Sending unnecessary `order_number` and `order_date` fields
**Fix:** Removed these fields from payload, sending only required fields
**File:** `src/pages/order/OrderForm.jsx`

### ✅ Issue 4: Error Messages Not Showing from API
**Root Cause:** Not extracting error messages from API response
**Fix:** Added `err.response?.data?.message` extraction in all error handlers
**File:** `src/pages/order/OrderDetails.jsx` and `src/pages/order/OrderForm.jsx`

---

## Complete API Flow Testing

### Step 1: Create Order with Items
```
Test: POST http://localhost/invoice-api/master/order/create-order.php

1. Navigate to Orders page (if exists) or click "Create Order"
2. Fill form:
   - Select Customer (e.g., Customer 1)
   - Select Store (e.g., Store 1)
   - Leave order_number empty (auto-generated)
   - Leave order_date empty (auto-set)

3. Add Items:
   - Click "Add Item"
   - Select Product (e.g., Product 1)
   - Enter Quantity: 2
   - Enter Unit Price: 50.00
   - Click "Add"
   - Total should calculate to 100.00

4. Add another item:
   - Click "Add Item"
   - Select Product (e.g., Product 2)
   - Enter Quantity: 3
   - Enter Unit Price: 50.00
   - Click "Add"
   - Total should now be 250.00

5. Submit Form:
   - Total should show 250.00
   - Click "Submit" or "Create Order"
   - Browser Developer Console should show:
     * "Submitting order payload: {...}"
     * "Order creation response: {status: 'success', order_id: 15, ...}"
   
✅ Expected Result: Success message "Order created successfully (ID: 15)"
✅ Should redirect to Orders list
```

### Step 2: View Order Details and Items
```
Test: GET http://localhost/invoice-api/master/order_items/get-order-items.php

1. From Orders list, click on the newly created order (or any existing order with items)

2. Verify Order Details Page Shows:
   - Order number and status header
   - Customer information (name, email, phone, address)
   - Order information (date, store, created by)
   
3. Verify Items Table Shows:
   - Product name (NOT just "Product #1")
   - Quantity
   - Unit Price
   - Total (quantity × unit_price)
   - Edit/Delete action icons
   
4. Check Browser Console:
   - Should show "Order Items Response: {...}"
   - Should show "Items parsed from response: [...]"
   - Should show item details with product names

✅ Expected Result: All items visible in table with calculations
✅ No "No items in this order" message if order has items
```

### Step 3: Update Order Status
```
Test: PUT http://localhost/invoice-api/master/order/update-order-status.php

1. In Order Details page, locate Status dropdown (in header)

2. Current Status: Pending (default)

3. Change Status:
   - Click dropdown
   - Select "Approved"
   - Browser Console should show:
     * "Updating status to: Approved"
     * "Status update response: {...}"

4. Verify Result:
   - Status changes in header
   - Success notification appears: "Status updated successfully"
   - Status is persisted (reload page should keep the status)

5. Test other statuses:
   - Try: "Completed", "Cancelled", "Back to Pending"
   - All should work without errors

✅ Expected Result: Status changes immediately and persists
✅ Success notifications appear for each change
✅ No "Error updating status" messages
```

### Step 4: Add Item to Existing Order
```
Test: POST http://localhost/invoice-api/master/order_items/create-order-item.php

1. In Order Details page, click "Add Item" button (below items table)

2. Add Item Dialog Opens:
   - Product dropdown shows available products
   - Quantity field (number input)
   - Unit Price field (number input)

3. Fill in new item:
   - Select Product
   - Enter Quantity: 1
   - Enter Unit Price: 100.00
   - Click "Add"

4. Verify:
   - Browser Console shows: "Creating new item for order: 15"
   - Response shows: "Item create response: {...}"
   - New item appears in table
   - Success notification: "Item added successfully"
   - Order total updates accordingly

✅ Expected Result: New item added to table, calculations update
```

### Step 5: Edit Item in Order
```
Test: POST http://localhost/invoice-api/master/order_items/update-order-items.php

1. In Order Details page, in items table, click Edit icon (pencil) on any item

2. Edit Item Dialog Opens:
   - Shows current product
   - Shows current quantity
   - Shows current unit price

3. Update Item:
   - Change Quantity: 5
   - Change Unit Price: 75.00
   - Click "Update"

4. Verify:
   - Browser Console shows: "Updating item: [order_item_id]"
   - Response shows: "Item update response: {...}"
   - Item row updates with new quantity and price
   - Success notification: "Item updated successfully"
   - Order total recalculates

✅ Expected Result: Item details update, total recalculates
```

### Step 6: Delete Item from Order
```
Test: DELETE http://localhost/invoice-api/master/order_items/delete-order-items.php

1. In Order Details page, in items table, click Delete icon (trash) on any item

2. Confirmation Dialog Appears:
   - Asks to confirm deletion

3. Confirm Deletion:
   - Click "Yes" or "Confirm"

4. Verify:
   - Browser Console shows: "Deleting item: [order_item_id]"
   - Response shows: "Item delete response: {...}"
   - Item row disappears from table
   - Success notification: "Item deleted successfully"
   - Order total updates

✅ Expected Result: Item removed from table, calculations update
✅ If last item, should show "No items in this order" message
```

---

## Browser Console Expected Output

During testing, you should see these console logs:

```javascript
// Order Creation
"Submitting order payload: {customer_id: 1, user_id: 1, store_id: 1, total_amount: 250, items: Array(2)}"
"Order creation response: {status: 'success', order_id: 15, items_created: 2, inserted_product_ids: [1, 2]}"

// Order Details Loading
"Order Items Response: {status: 'success', summary: {order_id: 15, item_count: 2, grand_total: 250}, items: Array(2)}"
"Items parsed from response: [{order_item_id: 23, product_id: 1, quantity: 2, unit_price: 50, total_price: 100, ...}]"

// Status Update
"Updating status to: Approved"
"Status update response: {status: 'success', message: 'Order status updated successfully', order_id: 15, new_status: 'Approved'}"

// Item Operations
"Creating new item for order: 15"
"Item create response: {status: 'success', ...}"
"Updating item: 23"
"Item update response: {status: 'success', ...}"
"Deleting item: 23"
"Item delete response: {status: 'success', ...}"
```

---

## Error Scenarios to Test

### Test Error: Missing Required Fields
```
1. Try to create order without selecting customer
   → Expected: "Please fill all required fields (Customer and Store)"

2. Try to create order without adding items
   → Expected: "Please add at least one item"

3. Try to add item without filling all fields
   → Expected: "Please fill all fields"
```

### Test Error: API Failures
```
1. If server not running:
   → Expected: Network error in console, error message to user

2. If authentication fails:
   → Expected: Redirect to login page

3. If product doesn't exist:
   → Expected: Product dropdown won't show it or error from API
```

---

## Success Criteria Checklist

- [ ] Order creation succeeds with items in one request
- [ ] Items display correctly in Order Details page
- [ ] Order status updates work (PUT method)
- [ ] Can add new items to existing orders
- [ ] Can edit items in orders
- [ ] Can delete items from orders
- [ ] All error messages are clear and helpful
- [ ] Console shows proper debugging information
- [ ] Page doesn't show "No items" when items exist
- [ ] Totals calculate correctly
- [ ] All notifications appear appropriately
- [ ] Page doesn't crash on any operation

---

## Debugging Commands

If you encounter issues, copy-paste these in browser console to debug:

```javascript
// Check current auth
console.log("Token:", localStorage.getItem("token")?.substring(0, 20) + "...");

// Check order details state
console.log("Order Details - Check Network tab for API responses");

// Check API response directly
fetch('http://localhost/invoice-api/master/order_items/get-order-items.php?order_id=15', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
}).then(r => r.json()).then(d => console.log("Items API:", d));

// Check status update payload
console.log("Status Update Payload: {order_id: 15, status: 'Approved'}");
```

---

## Common Issues & Solutions

### Issue: "No items in this order" shown but items exist
**Solution:**
1. Check browser console for "Order Items Response"
2. Verify response has `items` array
3. Refresh page and try again
4. Check Network tab to see actual API response

### Issue: Status update shows error
**Solution:**
1. Verify: Method should be PUT (not PATCH)
2. Check Network tab in DevTools
3. See error message from API
4. Verify order_id and status values are correct

### Issue: Product names show as "Product #1" instead of actual name
**Solution:**
1. Check if products are loading correctly
2. Open Network tab, check products API response
3. Verify product_id in item matches products list
4. Clear browser cache and refresh

### Issue: Order creation fails with error message from API
**Solution:**
1. Check browser console for "Order creation response"
2. Verify all items have: product_id, quantity, unit_price
3. Verify customer_id and store_id exist in database
4. Check Network tab for full error response

---

## Performance Notes

- Order creation with multiple items should complete in < 2 seconds
- Item operations should complete in < 1 second
- Items list should load with order details (fetched in parallel)
- No unnecessary re-renders should occur

---

## Final Verification

Before considering the system production-ready:

1. ✅ All 6 testing steps completed successfully
2. ✅ No JavaScript errors in console
3. ✅ All CRUD operations work for order items
4. ✅ Status updates persist in database
5. ✅ Error messages are helpful and clear
6. ✅ Page layout remains consistent across all operations
7. ✅ Performance is acceptable (< 2s for operations)
