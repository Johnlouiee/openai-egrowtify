-- Database Tables for Plant & Soil Identification
-- Run this script to create the necessary tables

CREATE DATABASE IF NOT EXISTS plant_soil_db;
USE plant_soil_db;

-- Table: ai_analysis_usage (tracks plant identification usage)
CREATE TABLE IF NOT EXISTS `ai_analysis_usage` (
  `ai_image_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `free_analyses_used` int(11) DEFAULT 0,
  `purchased_credits` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ai_image_id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: ai_usage_tracking (tracks individual analysis requests)
CREATE TABLE IF NOT EXISTS `ai_usage_tracking` (
  `usage_tracking_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `usage_type` varchar(20) NOT NULL COMMENT 'plant_analysis or soil_analysis',
  `image_path` varchar(500) DEFAULT NULL,
  `analysis_result` text DEFAULT NULL,
  `cost` decimal(10,2) DEFAULT 0.00,
  `is_free_usage` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`usage_tracking_id`),
  KEY `idx_ai_usage_tracking_user_id` (`user_id`),
  KEY `idx_ai_usage_tracking_usage_type` (`usage_type`),
  KEY `idx_ai_usage_tracking_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: soil_analysis_usage (tracks soil analysis usage)
CREATE TABLE IF NOT EXISTS `soil_analysis_usage` (
  `soil_usage_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `free_analyses_used` int(11) DEFAULT 0,
  `purchased_credits` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`soil_usage_id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: plant_training_submissions (stores user submissions for training new plants)
CREATE TABLE IF NOT EXISTS `plant_training_submissions` (
  `submission_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `plant_name` varchar(200) NOT NULL,
  `scientific_name` varchar(200) DEFAULT NULL,
  `common_names` text DEFAULT NULL,
  `plant_type` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `care_instructions` text DEFAULT NULL,
  `image_data` text DEFAULT NULL,
  `status` varchar(20) DEFAULT 'pending',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`submission_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

