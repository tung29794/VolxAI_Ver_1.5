# AI Rewrite Feature Implementation Guide

## Overview

The AI Rewrite feature has been successfully integrated into the Article Editor. This feature allows users to select text in the React Quill editor and rewrite it in various styles using OpenAI's GPT-3.5-turbo model.

## What's New

### 1. Backend API Endpoint

- **File**: `server/routes/ai.ts`
- **Endpoint**: `POST /api/ai/rewrite`
- **Description**: Accepts selected text and rewrite style, calls OpenAI API, and returns rewritten text

**Request Body**:

```json
{
  "text": "The text you want to rewrite",
  "style": "standard" // or shorter, longer, easy, creative, funny, casual, friendly, professional
}
```

**Response**:

```json
{
  "rewrittenText": "The rewritten version of your text"
}
```

**Available Rewrite Styles**:

- **Standard**: Professional and standard manner
- **Shorter**: Concise and brief version
- **Longer**: Expanded with more details
- **Easy**: Simplified for general audience
- **Creative**: Engaging and creative rewrite
- **Funny**: Humorous and entertaining
- **Casual**: Conversational and friendly tone
- **Friendly**: Warm and approachable tone
- **Professional**: Formal and business-ready

### 2. Frontend Components

#### Article Editor (`client/pages/ArticleEditor.tsx`)

- **New Toolbar Button**: "⚡ AI" button added to Quill toolbar
- **New State Variables**:
  - `isRewriteModalOpen`: Controls modal visibility
  - `selectedText`: Stores the currently selected text
  - `isRewriting`: Tracks loading state during API call
  - `quillRef`: Reference to Quill editor instance

- **New Functions**:
  - `handleOpenRewriteModal()`: Extracts selected text and opens modal
  - `handleRewriteText(style)`: Calls API and replaces selected text

- **New UI Elements**:
  - Modal dialog showing selected text and rewrite options
  - Loading state indicator during API calls
  - Cancel button to close modal

### 3. Database Tracking

#### New Table: `ai_rewrite_history`

- **Fields**:
  - `id`: Primary key (AUTO_INCREMENT)
  - `original_text`: The text before rewriting (LONGTEXT)
  - `rewritten_text`: The text after rewriting (LONGTEXT)
  - `style`: The rewrite style used (VARCHAR)
  - `created_at`: Timestamp of the request (TIMESTAMP)

- **Indexes**:
  - `idx_style`: For filtering by rewrite style
  - `idx_created_at`: For querying by date

This table logs all rewrite requests for analytics and usage tracking.

### 4. Environment Configuration

**Required Environment Variable**:

- `OPENAI_API_KEY`: Your OpenAI API key (already configured)

The API key is securely stored as an environment variable and never exposed to the frontend.

## How to Use the AI Rewrite Feature

### Step 1: Access the Article Editor

1. Navigate to `/admin/articles/new` or click "New Article" from the admin dashboard
2. The editor will load with the Quill rich text editor

### Step 2: Write Your Content

1. Enter a title in the "Post Title" field
2. Write or paste content into the Quill editor

### Step 3: Select Text to Rewrite

1. Highlight/select the text you want to rewrite in the editor
2. The text must be at least 1 character long

### Step 4: Click the AI Rewrite Button

1. In the Quill toolbar, click the "⚡ AI" button (blue button on the right of the toolbar)
2. A modal dialog will appear showing your selected text

### Step 5: Choose a Rewrite Style

1. The modal shows 9 different rewrite options
2. Click on the style you prefer
3. The API will process the request (you'll see a loading spinner)

### Step 6: Review the Result

1. The selected text will be automatically replaced with the rewritten version
2. The modal will close
3. Your editor content is now updated

### Step 7: Continue Editing

1. Make any additional edits as needed
2. The rewritten text is now part of your document
3. When you're ready, click "Đăng bài" to publish or "Lưu nháp" to save as draft

## Technical Details

### Architecture

```
Article Editor
    ↓
User selects text → Clicks "⚡ AI" button
    ↓
handleOpenRewriteModal() extracts selected text
    ↓
Modal dialog opens showing selection
    ↓
User selects rewrite style
    ↓
handleRewriteText() calls /api/ai/rewrite
    ↓
Backend calls OpenAI API with selected text + style
    ↓
OpenAI returns rewritten text
    ↓
Rewritten text is inserted back into editor
    ↓
Modal closes, user continues editing
    ↓
AI usage is logged to ai_rewrite_history table
```

### API Flow

1. **Request**: Frontend sends text + style to `/api/ai/rewrite`
2. **Processing**: Backend constructs OpenAI API request with system prompt and user message
3. **OpenAI Call**: Calls `gpt-3.5-turbo` model with:
   - Temperature: 0.7 (balanced creativity)
   - Max tokens: 2000
   - Custom system prompt for quality control
4. **Response**: OpenAI returns rewritten text
5. **Storage**: Request is logged to database for analytics (non-blocking)
6. **Return**: Rewritten text is sent back to frontend

### Error Handling

- **No Selection**: If user clicks AI button without selecting text, nothing happens
- **API Errors**: Displays error message and allows user to retry
- **Database Errors**: Logged but don't fail the rewrite operation
- **Invalid Styles**: Rejected with 400 error

## Installation & Setup

### Prerequisites

- Node.js and npm/pnpm installed
- Database setup completed (see DATABASE_SETUP.md)
- OpenAI API key configured (already set in environment)

### Database Setup

The `ai_rewrite_history` table is automatically created when you run:

```bash
node database/setup.js
```

Or manually create it:

```sql
CREATE TABLE IF NOT EXISTS ai_rewrite_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    original_text LONGTEXT NOT NULL,
    rewritten_text LONGTEXT NOT NULL,
    style VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_style (style),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Backend Setup

The AI route is already registered in `server/index.ts`:

```typescript
import { aiRouter } from "./routes/ai";

app.use("/api/ai", aiRouter);
```

### Frontend Setup

The ArticleEditor component automatically includes:

- Quill toolbar with AI button
- Modal dialog for style selection
- API integration and text replacement

## Files Modified

### Created Files

- `server/routes/ai.ts` - AI rewrite endpoint
- `database/migrations/add_ai_rewrite_history_table.sql` - Migration file

### Modified Files

- `server/index.ts` - Added AI router registration
- `client/pages/ArticleEditor.tsx` - Added AI rewrite UI and functionality
- `database/init.sql` - Added ai_rewrite_history table

## Configuration

### OpenAI Settings

- **Model**: gpt-3.5-turbo (cost-effective, fast)
- **Temperature**: 0.7 (balanced between deterministic and creative)
- **Max Tokens**: 2000 (sufficient for most rewrites)
- **System Prompt**: Professional content editor instructions

### UI Settings

- **Button Color**: Light blue (#dbeafe) with hover effect
- **Button Position**: Toolbar (right side)
- **Modal Max Height**: 400px (scrollable for many styles)
- **Loading State**: Spinner animation

## Performance Considerations

1. **API Response Time**: Typically 2-5 seconds depending on text length
2. **Database**: Logging is asynchronous and non-blocking
3. **Front-end**: Selection extraction is instant
4. **Token Usage**: Tracked by OpenAI, calculate costs based on usage

## Monitoring & Analytics

### Tracking Usage

Query the `ai_rewrite_history` table to analyze:

```sql
-- Most used rewrite styles
SELECT style, COUNT(*) as count FROM ai_rewrite_history
GROUP BY style
ORDER BY count DESC;

-- Daily usage
SELECT DATE(created_at) as date, COUNT(*) as count
FROM ai_rewrite_history
GROUP BY DATE(created_at);

-- Text length statistics
SELECT
    style,
    AVG(CHAR_LENGTH(original_text)) as avg_original_length,
    AVG(CHAR_LENGTH(rewritten_text)) as avg_rewritten_length
FROM ai_rewrite_history
GROUP BY style;
```

## Troubleshooting

### Issue: "AI Rewrite button is not appearing"

- **Solution**: Make sure you're on the Article Editor page (`/admin/articles/new`)
- **Check**: Browser console for errors (F12 → Console tab)

### Issue: "Nothing happens when I click the AI button"

- **Solution**: You must select text first before clicking the button
- **Check**: Ensure at least 1 character is selected in the editor

### Issue: "Modal opens but API doesn't respond"

- **Possible Causes**:
  - OpenAI API key is invalid
  - API key has expired
  - Rate limit exceeded
- **Solution**: Check OpenAI dashboard and renew key if needed

### Issue: "Error message: Failed to rewrite text"

- **Possible Causes**:
  - Network connectivity issue
  - Server error
  - Invalid API response
- **Solution**: Check browser console logs and server logs for details

## Future Enhancements

Potential improvements for future versions:

1. **Advanced Options**: Allow users to set creativity level and length preferences
2. **History Panel**: Show recently rewritten texts
3. **Batch Rewriting**: Rewrite multiple paragraphs at once
4. **Custom Instructions**: Let users add specific instructions (tone, audience, etc.)
5. **Comparison View**: Side-by-side comparison of original and rewritten text
6. **Tone Detection**: Auto-detect and suggest matching rewrite styles
7. **AI Model Selection**: Support different OpenAI models (GPT-4, etc.)
8. **Cost Tracking**: Show token cost before rewriting
9. **Feedback Loop**: Track which rewrites users keep vs. reject

## Security & Privacy

1. **API Key**: Stored securely in environment variables, never exposed to frontend
2. **Text Data**: Only original text is stored in database for analytics
3. **HTTPS**: All API calls use HTTPS in production
4. **Rate Limiting**: Implement rate limiting to prevent abuse (recommended)
5. **User Validation**: Routes are protected (ArticleEditor requires authentication)

## Support & Resources

- **OpenAI Documentation**: https://platform.openai.com/docs
- **React Quill Documentation**: https://quilljs.com/docs/api/
- **Project Database**: See DATABASE_SETUP.md
- **Backend Guide**: See BACKEND_DEPLOYMENT_GUIDE.md

## Version History

- **v1.0** (Current): Initial AI Rewrite feature implementation
  - 9 rewrite styles
  - OpenAI GPT-3.5-turbo integration
  - Database tracking
  - Full UI integration
