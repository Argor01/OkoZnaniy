# Deployment Instructions for Chat Feature

## Changes Made

### Backend Changes:
1. **apps/chat/models.py** - Made `order` field nullable to support direct user chats
2. **apps/chat/views.py** - Added `get_or_create_by_user` endpoint
3. **apps/chat/serializers.py** - Fixed serializers to handle null order field
4. **apps/chat/migrations/0003_chat_order_nullable.py** - Database migration

### Frontend Changes:
1. **frontend-react/src/api/chat.ts** - Added `getOrCreateByUser` API method
2. **frontend-react/src/pages/ExpertDashboard/modals/MessageModalNew.tsx** - Added `selectedUserId` prop and auto-open logic
3. **frontend-react/src/pages/ExpertDashboard/index.tsx** - Pass user ID to MessageModal

## Deployment Steps

Run on the server:

```bash
bash update-and-restart.sh
```

This will:
1. Pull latest code from git
2. Apply database migration (make order field nullable)
3. Restart backend and frontend services

## Testing

After deployment:
1. Login as any user
2. Go to "Мои друзья" tab
3. Click "Написать" on any user
4. Chat should open automatically with that user
5. You can send messages immediately

## What This Fixes

- Before: Clicking "Написать" opened empty MessageModal
- After: Clicking "Написать" creates/opens chat with selected user automatically
- Chats now work between any two users, not just for orders
