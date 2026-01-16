/**
 * Article Generation Service
 * 
 * This service provides a unified interface for generating articles.
 * Both the single-article endpoint (/generate-article) and the batch processor
 * use this service to ensure consistent behavior and avoid code duplication.
 */

import { 
  generateArticleContent,
  generateArticleTitle,
  generateArticleSEOTitle,
  generateArticleMetaDescription,
  generateOutline,
  generateBatchWriteArticleTitle,
  generateBatchWriteSeoTitle,
  generateBatchWriteMetaDescription
} from './aiService';
import { query as dbQuery, execute as dbExecute } from '../db';

export interface ArticleGenerationOptions {
  userId: number;
  keyword: string;
  language: string;
  tone: string;
  model: string;
  length: string;
  outlineType: string;
  customOutline?: string;
  websiteId?: string;
  autoInsertImages?: boolean;
  maxImages?: number;
  useGoogleSearch?: boolean;
}

export interface ArticleGenerationResult {
  success: boolean;
  articleId?: number;
  title?: string;
  seoTitle?: string;
  metaDescription?: string;
  content?: string;
  tokensUsed?: number;
  error?: string;
}

/**
 * Generate a complete article with title, SEO metadata, and content
 * This is the main function used by both single article generation and batch processing
 */
export async function generateCompleteArticle(
  options: ArticleGenerationOptions
): Promise<ArticleGenerationResult> {
  const startTime = Date.now();
  console.log(`\n🚀 [ArticleGenService] Starting article generation for keyword: "${options.keyword}"`);
  console.log(`   Model: ${options.model}, Length: ${options.length}, Outline: ${options.outlineType}`);

  try {
    let totalTokensUsed = 0;

    // STEP 1: Generate article title using BATCH WRITE specific function
    console.log(`📝 [ArticleGenService] Step 1/5: Generating title (Batch Write)...`);
    const titleResult = await generateBatchWriteArticleTitle(
      options.keyword,
      options.userId,
      options.language,
      options.tone,
      options.model
    );

    if (!titleResult.success || !titleResult.title) {
      console.error(`❌ [ArticleGenService] Failed to generate title:`, titleResult.error);
      return {
        success: false,
        error: titleResult.error || 'Failed to generate title',
        tokensUsed: totalTokensUsed
      };
    }

    const articleTitle = titleResult.title;
    totalTokensUsed += titleResult.tokensUsed || 0;
    console.log(`✅ [ArticleGenService] Title generated: "${articleTitle}" (${titleResult.tokensUsed} tokens)`);

    // STEP 2: Generate SEO title (with fallback) using BATCH WRITE specific function
    console.log(`📝 [ArticleGenService] Step 2/5: Generating SEO title (Batch Write)...`);

    let seoTitle = articleTitle; // ✅ Default fallback
    
    const seoTitleResult = await generateBatchWriteSeoTitle(
      articleTitle,
      options.keyword,
      options.userId,
      options.language,
      options.model
    );

    if (seoTitleResult.success && seoTitleResult.seoTitle) {
      seoTitle = seoTitleResult.seoTitle;
      totalTokensUsed += seoTitleResult.tokensUsed || 0;
      console.log(`✅ [ArticleGenService] SEO title generated: "${seoTitle}" (${seoTitleResult.tokensUsed} tokens)`);
    } else {
      console.warn(`⚠️  [ArticleGenService] SEO title generation failed: ${seoTitleResult.error}`);
      console.log(`   Using fallback: "${seoTitle}"`);
      // Continue with fallback instead of early return
    }

    // STEP 3: Generate meta description (with fallback) using BATCH WRITE specific function
    console.log(`📝 [ArticleGenService] Step 3/5: Generating meta description (Batch Write)...`);
    // ✅ Smart fallback: use keyword + title
    let metaDescription = `${options.keyword} - ${articleTitle.substring(0, 100)}`;
    
    const metaDescResult = await generateBatchWriteMetaDescription(
      articleTitle,
      options.keyword,
      options.userId,
      options.language,
      options.model
    );

    if (metaDescResult.success && metaDescResult.metaDesc) {
      metaDescription = metaDescResult.metaDesc;
      totalTokensUsed += metaDescResult.tokensUsed || 0;
      console.log(`✅ [ArticleGenService] Meta description generated (${metaDescResult.tokensUsed} tokens)`);
    } else {
      console.warn(`⚠️  [ArticleGenService] Meta description generation failed: ${metaDescResult.error}`);
      console.log(`   Using fallback: "${metaDescription}"`);
      // Continue with fallback instead of early return
    }

    // STEP 4: Generate or prepare outline
    let finalOutline = options.customOutline || '';
    
    if (options.outlineType === 'ai-outline' && !finalOutline) {
      console.log(`📝 [ArticleGenService] Step 4/5: Auto-generating AI outline...`);
      const outlineResult = await generateOutline({
        keyword: options.keyword,
        userId: options.userId,
        language: options.language,
        tone: options.tone,
        length: options.length,
        model: options.model
      });

      if (outlineResult.success && outlineResult.outline) {
        finalOutline = outlineResult.outline;
        totalTokensUsed += outlineResult.tokensUsed || 0;
        console.log(`✅ [ArticleGenService] AI outline generated (${outlineResult.tokensUsed} tokens)`);
      } else {
        console.warn(`⚠️ [ArticleGenService] Failed to generate outline, continuing without it`);
      }
    } else if (options.outlineType === 'no-outline') {
      console.log(`📝 [ArticleGenService] Step 4/5: Using no-outline mode`);
    } else if (finalOutline) {
      console.log(`📝 [ArticleGenService] Step 4/5: Using custom outline (${finalOutline.length} chars)`);
    }

    // STEP 5: Create article record in database
    console.log(`📝 [ArticleGenService] Step 5/5: Creating article record...`);
    
    // Split keyword into array if it contains commas
    const keywordsArray = options.keyword.includes(',') 
      ? options.keyword.split(',').map(k => k.trim()).filter(k => k.length > 0)
      : [options.keyword];
    
    const keywordsJson = JSON.stringify(keywordsArray);
    console.log(`   Keywords array: ${keywordsArray.length} items:`, keywordsArray);
    
    const insertResult = await dbExecute(
      `INSERT INTO articles (
        user_id, title, seo_title, meta_description, content, primary_keyword, keywords, status
      ) VALUES (?, ?, ?, ?, '', ?, ?, 'draft')`,
      [options.userId, articleTitle, seoTitle, metaDescription, options.keyword, keywordsJson]
    );

    const articleId = (insertResult as any).insertId;
    console.log(`✅ [ArticleGenService] Article record created with ID: ${articleId}`);
    
    // ✅ FIX #2: Verify metadata was saved correctly
    console.log(`📋 [ArticleGenService] Verifying saved metadata...`);
    const [savedArticle] = await dbQuery<any>(
      'SELECT id, seo_title, meta_description FROM articles WHERE id = ?',
      [articleId]
    );
    
    if (savedArticle) {
      console.log(`   Saved SEO Title: "${savedArticle.seo_title || '(empty)'}"`);
      console.log(`   Saved Meta Desc: "${savedArticle.meta_description ? savedArticle.meta_description.substring(0, 50) : '(empty)'}..."`);
    }

    // STEP 6: Generate article content
    console.log(`📝 [ArticleGenService] Step 6/6: Generating article content...`);
    const contentResult = await generateArticleContent({
      userId: options.userId,
      keyword: options.keyword,
      language: options.language,
      tone: options.tone,
      model: options.model,
      length: options.length,
      outlineType: options.outlineType,
      customOutline: finalOutline,
      websiteId: options.websiteId,
      useGoogleSearch: options.useGoogleSearch || false
    });

    if (!contentResult.success || !contentResult.content) {
      console.error(`❌ [ArticleGenService] Failed to generate content:`, contentResult.error);
      
      // Delete the article record since content generation failed
      await dbExecute('DELETE FROM articles WHERE id = ?', [articleId]);
      
      return {
        success: false,
        error: contentResult.error || 'Failed to generate content',
        tokensUsed: totalTokensUsed
      };
    }

    totalTokensUsed += contentResult.tokensUsed || 0;
    console.log(`✅ [ArticleGenService] Content generated (${contentResult.tokensUsed} tokens)`);

    // STEP 7: Update article with generated content
    await dbExecute(
      'UPDATE articles SET content = ?, status = ?, updated_at = NOW() WHERE id = ?',
      [contentResult.content, 'published', articleId]
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ [ArticleGenService] Article generation completed in ${duration}s`);
    console.log(`   Article ID: ${articleId}`);
    console.log(`   Total tokens used: ${totalTokensUsed}`);

    return {
      success: true,
      articleId,
      title: articleTitle,
      seoTitle,
      metaDescription,
      content: contentResult.content,
      tokensUsed: totalTokensUsed
    };

  } catch (error: any) {
    console.error(`❌ [ArticleGenService] Unexpected error:`, error);
    return {
      success: false,
      error: error.message || 'Internal error during article generation',
      tokensUsed: 0
    };
  }
}
