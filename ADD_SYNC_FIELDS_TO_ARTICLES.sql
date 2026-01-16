-- Add sync fields to articles table for WordPress integration
ALTER TABLE `articles` 
ADD COLUMN `wordpress_post_id` INT NULL AFTER `featured_image`,
ADD COLUMN `website_id` INT NULL AFTER `wordpress_post_id`,
ADD INDEX `idx_wordpress_post_id` (`wordpress_post_id`),
ADD INDEX `idx_website_id` (`website_id`),
ADD FOREIGN KEY (`website_id`) REFERENCES `websites`(`id`) ON DELETE SET NULL;

-- Add unique constraint to prevent duplicate syncs
ALTER TABLE `articles`
ADD UNIQUE KEY `unique_wordpress_post` (`website_id`, `wordpress_post_id`);
