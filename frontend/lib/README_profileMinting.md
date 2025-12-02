# Profile Minting Library - Quick Reference

## Overview

This library (`profileMinting.ts`) handles all client-side logic for minting and updating Soulbound NFT profiles, including image uploads and contract transaction preparation.

## Exported Functions

### 1. `handleProfileMint(walletAddress: string, profileData: {...}): Promise<{...}>`

**Use:** Initial NFT minting for new wallet users

**Input:**
```typescript
walletAddress: "0x1234...abcd"
profileData: {
  name: "Alice",
  age: 25,
  gender: "Female",
  interests: "Crypto, Art"
}
```

**Output:**
```typescript
{
  photoUrl: "https://xvynefwulsgbyzkvqmuo.supabase.co/storage/...",
  contractArgs: ["Alice", 25, "Female", "Crypto, Art", "https://..."],
  transactionType: "createProfile"
}
```

**Returns:** Ready-to-use args for `createProfile()` contract function

---

### 2. `handleProfileTextUpdate(tokenId: string, newProfileData: {...}, newImageFile?: File): Promise<{...}>`

**Use:** Update existing profile

**Input:**
```typescript
tokenId: "1"
newProfileData: {
  name: "Alice Updated",
  age: 26,
  gender: "Female",
  interests: "Crypto, Art, Gaming",
  photoUrl: "https://existing.url/...",
  email: "alice@example.com"
}
newImageFile: File // Optional - only if user uploaded new image
```

**Output:**
```typescript
{
  photoUrl: "https://new.or.existing.url/...",
  contractArgs: ["Alice Updated", 26, "Female", "Crypto, Art, Gaming", "https://...", "alice@example.com"],
  transactionType: "updateProfile"
}
```

**Returns:** Ready-to-use args for `updateProfile()` contract function

---

### 3. `handleEmailRegistration(walletAddress: string, profileData: {...}, skipPhotoUpload?: boolean): Promise<{...}>`

**Use:** Register profile with email address

**Input:**
```typescript
walletAddress: "0x1234...abcd"
profileData: {
  name: "Bob",
  age: 30,
  gender: "Male",
  interests: "Gaming",
  email: "bob@example.com"
}
skipPhotoUpload: false // Optional, default = false
```

**Output:**
```typescript
{
  photoUrl: "https://..." or "",
  contractArgs: ["Bob", 30, "Male", "Gaming", "bob@example.com"],
  transactionType: "registerWithEmail"
}
```

**Returns:** Ready-to-use args for `registerWithEmail()` contract function

---

### 4. `uploadImageToSupabase(imageData: string | File, walletAddress: string): Promise<string>`

**Use:** Upload image (avatar or user file) to Supabase

**Input:**
```typescript
imageData: File | "data:image/svg+xml;base64,..." // Data URL or File
walletAddress: "0x1234...abcd"
```

**Output:**
```
"https://xvynefwulsgbyzkvqmuo.supabase.co/storage/v1/object/public/profile-images/profiles/1733043600000-abc123.jpg"
```

**Returns:** Public Supabase URL

**Throws:** Error with message if upload fails

---

### 5. `generateBlockieDataUrl(address: string): string`

**Use:** Generate Blockie avatar from wallet address

**Input:**
```typescript
address: "0x1234...abcd"
```

**Output:**
```
"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMjAwJyBoZWlnaHQ9JzIwMCc..."
```

**Returns:** Data URL ready for upload

**Notes:**
- Deterministic: Same address always generates same avatar
- Uses address hash for color and pattern
- 5x5 grid pattern based on address bits

---

### 6. `handleProfileOperation(operationType: 'create' | 'register' | 'update', walletAddress: string, profileData: any, options?: {...}): Promise<{...}>`

**Use:** Unified handler for all profile operations

**Input:**
```typescript
// Create
await handleProfileOperation('create', address, {
  name: "Alice",
  age: 25,
  gender: "Female",
  interests: "Crypto"
});

// Register
await handleProfileOperation('register', address, {
  name: "Bob",
  age: 30,
  gender: "Male",
  interests: "Gaming",
  email: "bob@example.com"
}, { skipPhotoUpload: true });

// Update
await handleProfileOperation('update', address, {
  tokenId: "1",
  name: "Alice Updated",
  age: 26,
  gender: "Female",
  interests: "Crypto, Art",
  photoUrl: "https://...",
  email: "alice@example.com"
}, { newImageFile: fileObj });
```

**Returns:** Same as operation-specific handlers

---

## Usage in Components

### ProfileSetup.tsx (Minting)

```typescript
import { handleProfileMint } from '@/lib/profileMinting';

// In handleSubmit()
try {
  const mintData = await handleProfileMint(address!, {
    name: formData.name,
    age: parseInt(formData.age),
    gender: formData.gender,
    interests: formData.interests,
  });

  writeContract({
    address: CONTRACTS.PROFILE_NFT as `0x${string}`,
    abi: PROFILE_NFT_ABI,
    functionName: 'createProfile',
    args: mintData.contractArgs,
  });
} catch (error) {
  setFormError(error.message);
}
```

### ProfileEdit.tsx (Updating)

```typescript
import { handleProfileTextUpdate } from '@/lib/profileMinting';

// In handleUpdateProfile()
try {
  const updateData = await handleProfileTextUpdate(
    profile.tokenId.toString(),
    {
      name: formData.name,
      age: parseInt(formData.age),
      gender: formData.gender,
      interests: formData.interests,
      photoUrl: newPhotoUrl || formData.photoUrl || '',
      email: formData.email,
    },
    newImageFile  // Optional: pass if user uploaded new image
  );

  writeContract({
    address: CONTRACTS.PROFILE_NFT as `0x${string}`,
    abi: PROFILE_NFT_ABI,
    functionName: 'updateProfile',
    args: updateData.contractArgs,
  });
} catch (error) {
  showNotification(error.message, 'error');
}
```

---

## Error Handling

All functions include try-catch blocks that throw descriptive errors:

```typescript
// Image upload errors
"Failed to upload image: File size exceeds 3MB"
"Failed to upload image: Network error"

// Blockie generation errors
"Error generating Blockie avatar: ..."

// Function validation errors
"Unknown operation type: invalid"
```

**Handle errors:**
```typescript
try {
  const data = await handleProfileMint(address, profileData);
} catch (error) {
  if (error instanceof Error) {
    console.error('Error message:', error.message);
    // Show to user
    showNotification(error.message, 'error');
  }
}
```

---

## Contract Function Arguments

Ensure args are passed in correct order to `writeContract()`:

### `createProfile(name, age, gender, interests, photoUrl)`
```typescript
args: [
  "Alice",                    // name: string
  25,                         // age: uint8
  "Female",                   // gender: string
  "Crypto, Art",              // interests: string
  "https://supabase.url/..." // photoUrl: string
]
```

### `registerWithEmail(name, age, gender, interests, email)`
```typescript
args: [
  "Bob",              // name: string
  30,                 // age: uint8
  "Male",             // gender: string
  "Gaming",           // interests: string
  "bob@example.com"   // email: string
]
```

### `updateProfile(name, age, gender, interests, photoUrl, email)`
```typescript
args: [
  "Alice Updated",                // name: string
  26,                             // age: uint8
  "Female",                       // gender: string
  "Crypto, Art, Gaming",          // interests: string
  "https://supabase.url/...",     // photoUrl: string
  "alice@example.com"             // email: string
]
```

---

## Environment Variables

Make sure these are set in `.env.local`:

```
# Network configuration
NEXT_PUBLIC_NETWORK=base-sepolia  # or base-mainnet

# Contract addresses
NEXT_PUBLIC_PROFILE_NFT_ADDRESS=0x50ac9Eb1710a2557463E25bBb09762A51C4a74B5
NEXT_PUBLIC_PROFILE_NFT_MAINNET=0x...  # After mainnet deployment

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xvynefwulsgbyzkvqmuo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Common Scenarios

### Scenario 1: New User Creates Profile

```typescript
// 1. User fills form
// 2. Call helper
const mintData = await handleProfileMint(userAddress, formData);

// 3. Execute transaction
writeContract({
  functionName: 'createProfile',
  args: mintData.contractArgs,
});

// 4. Wait for confirmation and redirect
if (isSuccess) {
  router.push('/');
}
```

### Scenario 2: User Updates Profile with New Image

```typescript
// 1. User selects new image and edits fields
// 2. Call helper with image file
const updateData = await handleProfileTextUpdate(
  tokenId,
  newProfileData,
  newImageFile  // The File object from input
);

// 3. Execute transaction
writeContract({
  functionName: 'updateProfile',
  args: updateData.contractArgs,
});
```

### Scenario 3: Email Registration

```typescript
// 1. Email user signs message
// 2. Call helper
const registerData = await handleEmailRegistration(
  userAddress,
  emailProfileData,
  false  // Generate avatar
);

// 3. Execute transaction
writeContract({
  functionName: 'registerWithEmail',
  args: registerData.contractArgs,
});
```

---

## Debugging

Enable debug logging by checking browser console:

```typescript
// All helpers log their progress
handleProfileMint() logs:
  "Starting profile mint for: 0x..."
  "Blockie avatar generated"
  "Avatar uploaded to Supabase: https://..."

handleProfileTextUpdate() logs:
  "Starting profile text update for tokenId: 1"
  "New profile image uploaded: https://..."
```

---

## Performance Considerations

1. **Image Upload** (slow)
   - Takes 1-3 seconds depending on network
   - Consider showing loading spinner
   - Happens before contract transaction

2. **Contract Transaction** (varies)
   - Depends on gas prices and network congestion
   - Handled by Wagmi (useWaitForTransactionReceipt)
   - Show transaction hash to user during confirmation

3. **Avatar Generation** (fast)
   - < 100ms
   - Synchronous operation

---

## API Endpoint Used

### POST /api/upload-image

**Request:**
```
Content-Type: multipart/form-data
Body: { file: File }
```

**Response:**
```json
{ "url": "https://xvynefwulsgbyzkvqmuo.supabase.co/storage/..." }
```

**Limits:**
- Max file size: 3MB
- Allowed types: image/* (JPEG, PNG, GIF, WebP, etc.)

---

## Testing

### Unit Test Example

```typescript
describe('handleProfileMint', () => {
  it('should generate avatar and prepare args', async () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    const mockData = {
      name: 'Test User',
      age: 25,
      gender: 'Male',
      interests: 'Testing'
    };

    const result = await handleProfileMint(mockAddress, mockData);

    expect(result.photoUrl).toContain('supabase.co');
    expect(result.contractArgs[0]).toBe('Test User');
    expect(result.contractArgs[1]).toBe(25);
    expect(result.transactionType).toBe('createProfile');
  });
});
```

---

## Related Files

- **Contract:** `/contracts/ProfileNFT.sol` - Smart contract functions
- **API:** `/api/upload-image` - Image upload endpoint
- **API:** `/api/metadata/[tokenId]` - Dynamic metadata endpoint
- **Types:** `/lib/contracts.ts` - ABI definitions
- **Components:** `/components/ProfileSetup.tsx` - Uses handleProfileMint
- **Components:** `/components/ProfileEdit.tsx` - Uses handleProfileTextUpdate
- **Docs:** `PROFILE_MINTING_FLOW.md` - Detailed flow documentation

---

## Support

For questions or issues:

1. Check the detailed flow documentation in `PROFILE_MINTING_FLOW.md`
2. Review component implementations in ProfileSetup/Edit
3. Check browser console for debug logs
4. Verify Supabase connectivity and credentials
5. Ensure contract addresses are correct

All functions are well-documented with JSDoc comments in the source file.
