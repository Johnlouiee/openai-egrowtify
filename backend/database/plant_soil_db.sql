-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 10, 2025 at 10:44 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `plant_soil_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `ai_analysis_usage`
--

CREATE TABLE `ai_analysis_usage` (
  `ai_image_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `free_analyses_used` int(11) DEFAULT 0,
  `purchased_credits` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ai_analysis_usage`
--

INSERT INTO `ai_analysis_usage` (`ai_image_id`, `user_id`, `free_analyses_used`, `purchased_credits`, `created_at`, `updated_at`) VALUES
(1, 263666, 0, 0, '2025-12-03 16:44:23', '2025-12-03 16:44:23'),
(2, 416851, 2, 0, '2025-12-09 05:33:36', '2025-12-09 05:51:27'),
(3, 661309, 1, 0, '2025-12-09 05:54:21', '2025-12-09 05:54:22'),
(4, 673347, 1, 0, '2025-12-09 05:54:33', '2025-12-09 05:54:34'),
(5, 690772, 1, 0, '2025-12-09 05:54:50', '2025-12-09 05:54:51');

-- --------------------------------------------------------

--
-- Table structure for table `ai_usage_tracking`
--

CREATE TABLE `ai_usage_tracking` (
  `usage_tracking_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `usage_type` varchar(20) NOT NULL COMMENT 'plant_analysis or soil_analysis',
  `image_path` varchar(500) DEFAULT NULL,
  `analysis_result` text DEFAULT NULL,
  `cost` decimal(10,2) DEFAULT 0.00,
  `is_free_usage` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ai_usage_tracking`
--

INSERT INTO `ai_usage_tracking` (`usage_tracking_id`, `user_id`, `usage_type`, `image_path`, `analysis_result`, `cost`, `is_free_usage`, `created_at`) VALUES
(1, 416851, 'plant_analysis', NULL, 'Helianthus annuus', 0.00, 1, '2025-12-09 05:33:38'),
(2, 416851, 'plant_analysis', NULL, 'Helianthus annuus', 0.00, 1, '2025-12-09 05:51:27'),
(3, 661309, 'plant_analysis', NULL, 'Helianthus annuus', 0.00, 1, '2025-12-09 05:54:22'),
(4, 673347, 'plant_analysis', NULL, 'Helianthus annuus', 0.00, 1, '2025-12-09 05:54:34'),
(5, 690772, 'plant_analysis', NULL, 'Helianthus annuus', 0.00, 1, '2025-12-09 05:54:51');

-- --------------------------------------------------------

--
-- Table structure for table `plant_training_submissions`
--

CREATE TABLE `plant_training_submissions` (
  `submission_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `plant_name` varchar(200) NOT NULL,
  `scientific_name` varchar(200) DEFAULT NULL,
  `common_names` text DEFAULT NULL,
  `plant_type` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `care_instructions` text DEFAULT NULL,
  `image_data` text DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `soil_analysis_usage`
--

CREATE TABLE `soil_analysis_usage` (
  `soil_usage_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `free_analyses_used` int(11) DEFAULT 0,
  `purchased_credits` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `soil_analysis_usage`
--

INSERT INTO `soil_analysis_usage` (`soil_usage_id`, `user_id`, `free_analyses_used`, `purchased_credits`, `created_at`, `updated_at`) VALUES
(1, 246806, 0, 0, '2025-12-03 16:44:06', '2025-12-03 16:44:06'),
(2, 247112, 0, 0, '2025-12-03 16:44:07', '2025-12-03 16:44:07'),
(3, 521787, 0, 0, '2025-12-03 16:48:41', '2025-12-03 16:48:41'),
(4, 522099, 0, 0, '2025-12-03 16:48:42', '2025-12-03 16:48:42'),
(5, 544993, 0, 0, '2025-12-03 16:49:04', '2025-12-03 16:49:04'),
(6, 547991, 0, 0, '2025-12-03 16:49:07', '2025-12-03 16:49:07'),
(7, 565461, 0, 0, '2025-12-03 16:49:25', '2025-12-03 16:49:25'),
(8, 565772, 0, 0, '2025-12-03 16:49:25', '2025-12-03 16:49:25'),
(9, 398986, 0, 0, '2025-12-09 05:33:18', '2025-12-09 05:33:18'),
(10, 399299, 0, 0, '2025-12-09 05:33:19', '2025-12-09 05:33:19'),
(11, 416851, 0, 0, '2025-12-09 05:33:54', '2025-12-09 05:33:54'),
(12, 552548, 0, 0, '2025-12-09 05:35:52', '2025-12-09 05:35:52'),
(13, 552855, 0, 0, '2025-12-09 05:35:52', '2025-12-09 05:35:52'),
(14, 555515, 0, 0, '2025-12-09 05:35:55', '2025-12-09 05:35:55'),
(15, 561857, 0, 0, '2025-12-09 05:36:01', '2025-12-09 05:36:01'),
(16, 586472, 0, 0, '2025-12-09 05:36:26', '2025-12-09 05:36:26'),
(17, 647374, 0, 0, '2025-12-09 05:37:27', '2025-12-09 05:37:27'),
(18, 679151, 0, 0, '2025-12-09 05:37:59', '2025-12-09 05:37:59'),
(19, 748621, 0, 0, '2025-12-09 05:39:08', '2025-12-09 05:39:08'),
(20, 748936, 0, 0, '2025-12-09 05:39:08', '2025-12-09 05:39:08'),
(21, 750241, 0, 0, '2025-12-09 05:39:10', '2025-12-09 05:39:10'),
(22, 750443, 0, 0, '2025-12-09 05:39:10', '2025-12-09 05:39:10'),
(23, 483099, 0, 0, '2025-12-09 05:51:23', '2025-12-09 05:51:23'),
(24, 483407, 0, 0, '2025-12-09 05:51:23', '2025-12-09 05:51:23'),
(25, 546089, 0, 0, '2025-12-09 05:52:26', '2025-12-09 05:52:26'),
(26, 563085, 0, 0, '2025-12-09 05:52:43', '2025-12-09 05:52:43'),
(27, 574801, 0, 0, '2025-12-09 05:52:54', '2025-12-09 05:52:54'),
(28, 656745, 0, 0, '2025-12-09 05:54:16', '2025-12-09 05:54:16'),
(29, 657051, 0, 0, '2025-12-09 05:54:17', '2025-12-09 05:54:17'),
(30, 662727, 0, 0, '2025-12-09 05:54:22', '2025-12-09 05:54:22'),
(31, 674754, 0, 0, '2025-12-09 05:54:34', '2025-12-09 05:54:34'),
(32, 681569, 0, 0, '2025-12-09 05:54:41', '2025-12-09 05:54:41'),
(33, 692267, 0, 0, '2025-12-09 05:54:52', '2025-12-09 05:54:52');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `ai_analysis_usage`
--
ALTER TABLE `ai_analysis_usage`
  ADD PRIMARY KEY (`ai_image_id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `ai_usage_tracking`
--
ALTER TABLE `ai_usage_tracking`
  ADD PRIMARY KEY (`usage_tracking_id`),
  ADD KEY `idx_ai_usage_tracking_user_id` (`user_id`),
  ADD KEY `idx_ai_usage_tracking_usage_type` (`usage_type`),
  ADD KEY `idx_ai_usage_tracking_created_at` (`created_at`);

--
-- Indexes for table `plant_training_submissions`
--
ALTER TABLE `plant_training_submissions`
  ADD PRIMARY KEY (`submission_id`),
  ADD KEY `ix_plant_training_submissions_created_at` (`created_at`),
  ADD KEY `ix_plant_training_submissions_user_id` (`user_id`);

--
-- Indexes for table `soil_analysis_usage`
--
ALTER TABLE `soil_analysis_usage`
  ADD PRIMARY KEY (`soil_usage_id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `ai_analysis_usage`
--
ALTER TABLE `ai_analysis_usage`
  MODIFY `ai_image_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `ai_usage_tracking`
--
ALTER TABLE `ai_usage_tracking`
  MODIFY `usage_tracking_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `plant_training_submissions`
--
ALTER TABLE `plant_training_submissions`
  MODIFY `submission_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `soil_analysis_usage`
--
ALTER TABLE `soil_analysis_usage`
  MODIFY `soil_usage_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
