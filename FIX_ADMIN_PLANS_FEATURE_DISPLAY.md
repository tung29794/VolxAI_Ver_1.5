# Fix: AdminPlans Feature Display Issue

## Problem

When editing a subscription plan (gói dịch vụ) in the admin dashboard, the features were displaying as:
```
Feature #[object Object], Feature #[object Object], Feature #[object Object]...
```

Instead of showing the actual feature names like:
```
Feature 1 Name, Feature 2 Name, Feature 3 Name...
```

## Root Cause

The issue was in `client/components/admin/AdminPlans.tsx`:

1. **Line 639**: The code was calling `getSelectedFeatureNames(plan.features)` with Feature **objects**
2. **Feature objects** returned from the API have structure: `{ id, name, description, display_order, is_active }`
3. But `getSelectedFeatureNames()` expected an array of **IDs** (numbers): `[1, 2, 3]`
4. When the function tried to find features by ID from Feature objects, it failed and fell back to `Feature #${id}`
5. Since `id` was being treated as an object, it showed as `Feature #[object Object]`

The same issue occurred in the `handleEdit()` function when loading a plan to edit - it was filtering the features array for numbers only, but getting objects instead.

## Solution

### 1. Added New Function: `getFeatureNamesFromObjects()`
```typescript
const getFeatureNamesFromObjects = (featureObjects: any[]) => {
  // Handle both array of IDs and array of Feature objects
  if (!featureObjects || featureObjects.length === 0) return "";
  
  return featureObjects
    .map((item) => {
      // If item is an object with 'name' property, return the name
      if (typeof item === "object" && item?.name) {
        return item.name;
      }
      // If item is a number ID, find the feature by ID
      if (typeof item === "number") {
        return features.find((f) => f.id === item)?.name || `Feature #${item}`;
      }
      return "";
    })
    .filter(Boolean)
    .join(", ");
};
```

This function handles **both**:
- Array of Feature objects: `[{id: 1, name: "Feature 1"}, ...]`
- Array of IDs: `[1, 2, 3]`

### 2. Updated Feature Display
Changed line 650 from:
```typescript
{getSelectedFeatureNames(plan.features)}
```
To:
```typescript
{getFeatureNamesFromObjects(plan.features)}
```

### 3. Fixed handleEdit() Function
Updated to properly extract IDs from Feature objects:
```typescript
selectedIds = plan.features
  .map((item) => {
    if (typeof item === "number") return item;
    if (typeof item === "object" && item?.id) return item.id;  // Extract ID from object
    return null;
  })
  .filter((id): id is number => id !== null);
```

Now when editing a plan:
- Feature objects are properly converted to IDs
- The form correctly checks/unchecks the feature checkboxes
- User can see which features are assigned to the plan

## Testing

After deployment, test the fix:

1. **View Plan** - Go to Admin → Quản lý gói dịch vụ
   - Features should display with actual names, e.g., "Feature 1, Feature 2, Feature 3"
   - ❌ Should NOT show "Feature #[object Object]"

2. **Edit Plan** - Click "Sửa" button on any plan
   - Features should be properly selected in the form (checkboxes checked)
   - Features should display correctly in the plan list
   - Saving should work without errors

3. **Save Changes** - Make a change to features and click "Lưu"
   - Features should save correctly
   - After reload, should still display properly

## Files Changed

- `client/components/admin/AdminPlans.tsx`
  - Added `getFeatureNamesFromObjects()` function
  - Updated `handleEdit()` to extract IDs from Feature objects
  - Updated feature display to use new function

## Deployment

✅ Build: Success (1788 modules)
✅ Deploy: Success (8 files transferred)
✅ Git Commit: 52e9c31

## Deployment Status

**Before Fix**: 
- Features displayed as `Feature #[object Object]`
- Editing a plan didn't pre-select the correct features

**After Fix**: 
- Features display with proper names
- Editing pre-selects the correct features
- Saving works correctly
