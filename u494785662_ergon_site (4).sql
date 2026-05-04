-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Feb 06, 2026 at 11:26 AM
-- Server version: 11.8.3-MariaDB-log
-- PHP Version: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u494785662_ergon_site`
--

-- --------------------------------------------------------

--
-- Table structure for table `accounts`
--

CREATE TABLE `accounts` (
  `id` int(11) NOT NULL,
  `account_code` varchar(10) NOT NULL,
  `account_name` varchar(100) NOT NULL,
  `account_type` enum('asset','liability','equity','revenue','expense') NOT NULL,
  `balance` decimal(15,2) DEFAULT 0.00,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `activity_type` enum('login','logout','task_update','break_start','break_end','system_ping') DEFAULT 'system_ping',
  `description` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `admin_positions`
--

CREATE TABLE `admin_positions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `assigned_department` varchar(100) DEFAULT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`permissions`)),
  `assigned_by` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `advances`
--

CREATE TABLE `advances` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `project_id` int(11) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `reason` text NOT NULL,
  `advance_type` varchar(100) DEFAULT NULL,
  `repayment_date` date DEFAULT NULL,
  `requested_date` date NOT NULL,
  `status` varchar(20) DEFAULT 'pending',
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `admin_remarks` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `rejected_by` int(11) DEFAULT NULL,
  `rejected_at` timestamp NULL DEFAULT NULL,
  `payment_proof` varchar(255) DEFAULT NULL,
  `paid_by` int(11) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `approved_amount` decimal(10,2) DEFAULT NULL,
  `approval_remarks` text DEFAULT NULL,
  `payment_remarks` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `advances`
--

INSERT INTO `advances` (`id`, `user_id`, `project_id`, `type`, `amount`, `reason`, `advance_type`, `repayment_date`, `requested_date`, `status`, `approved_by`, `approved_at`, `rejection_reason`, `admin_remarks`, `created_at`, `updated_at`, `rejected_by`, `rejected_at`, `payment_proof`, `paid_by`, `paid_at`, `approved_amount`, `approval_remarks`, `payment_remarks`) VALUES
(1, 69, 20, 'Salary Advance', 10000.00, 'Christmas festival', NULL, '2025-12-23', '2025-12-23', 'pending', NULL, NULL, NULL, NULL, '2025-12-23 07:20:14', '2025-12-23 07:20:14', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(2, 67, 21, 'Project Advance', 1000.00, 'Site expenses', NULL, NULL, '2026-01-06', 'pending', NULL, NULL, NULL, NULL, '2026-01-06 06:01:59', '2026-01-06 06:01:59', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

--
-- Triggers `advances`
--
DELIMITER $$
CREATE TRIGGER `advance_notification_insert` AFTER INSERT ON `advances` FOR EACH ROW BEGIN
            INSERT INTO notifications (sender_id, receiver_id, type, category, title, message, reference_type, reference_id, module_type, status_change, action_url)
            SELECT NEW.user_id, u.id, 'info', 'approval', 
                   CONCAT('New Advance Request from ', (SELECT name FROM users WHERE id = NEW.user_id)),
                   CONCAT('Advance request for $', NEW.amount, ' - ', NEW.reason),
                   'advance', NEW.id, 'advance', 'pending', CONCAT('/ergon/advances/view/', NEW.id)
            FROM users u 
            WHERE u.role IN ('admin', 'owner') AND u.status = 'active';
        END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `advance_notification_update` AFTER UPDATE ON `advances` FOR EACH ROW BEGIN
            IF OLD.status != NEW.status AND NEW.status IN ('approved', 'rejected') THEN
                INSERT INTO notifications (sender_id, receiver_id, type, category, title, message, reference_type, reference_id, module_type, status_change, approver_id, action_url)
                VALUES (NEW.approved_by, NEW.user_id, 
                       CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'warning' END,
                       'approval', 
                       CONCAT('Advance Request ', UPPER(NEW.status)),
                       CONCAT('Your advance request has been ', NEW.status, ' - Amount: $', NEW.amount),
                       'advance', NEW.id, 'advance', NEW.status, NEW.approved_by, CONCAT('/ergon/advances/view/', NEW.id));
            END IF;
        END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `approvals`
--

CREATE TABLE `approvals` (
  `id` int(11) NOT NULL,
  `module` varchar(50) NOT NULL,
  `record_id` int(11) NOT NULL,
  `requested_by` int(11) NOT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `status` enum('Pending','Approved','Rejected') DEFAULT 'Pending',
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `approved_expenses`
--

CREATE TABLE `approved_expenses` (
  `id` int(11) NOT NULL,
  `expense_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `category` varchar(100) NOT NULL,
  `claimed_amount` decimal(10,2) NOT NULL,
  `approved_amount` decimal(10,2) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `payment_proof` varchar(255) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance`
--

CREATE TABLE `attendance` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `status` enum('present','absent','late','on_leave') DEFAULT 'present',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `check_in` datetime DEFAULT NULL,
  `check_out` datetime DEFAULT NULL,
  `location_name` varchar(255) DEFAULT 'Office',
  `project_id` int(11) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `manual_entry` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `attendance`
--

INSERT INTO `attendance` (`id`, `user_id`, `status`, `created_at`, `updated_at`, `check_in`, `check_out`, `location_name`, `project_id`, `latitude`, `longitude`, `manual_entry`) VALUES
(62, 69, 'present', '2025-12-23 09:55:29', '2025-12-23 07:17:47', '2025-12-23 09:55:29', '2025-12-23 12:47:47', 'Office', 20, 8.91243610, 77.99771070, 0),
(63, 68, 'present', '2025-12-23 11:44:27', '2025-12-23 06:14:27', '2025-12-23 11:44:27', NULL, 'Office', 21, 15.53418670, 76.16089500, 0),
(64, 67, 'present', '2025-12-23 11:45:07', '2025-12-23 06:15:07', '2025-12-23 11:45:07', NULL, 'Office', 21, 15.53462330, 76.16036010, 0),
(65, 67, 'present', '2025-12-24 09:28:00', '2025-12-24 03:58:00', '2025-12-24 09:28:00', NULL, 'Office', 21, 15.53395330, 76.16007670, 0),
(66, 67, 'present', '2025-12-25 09:58:54', '2025-12-25 04:28:54', '2025-12-25 09:58:54', NULL, 'Office', 21, 15.53390330, 76.16030670, 0),
(67, 67, 'present', '2025-12-26 09:15:18', '2025-12-26 03:45:18', '2025-12-26 09:15:18', NULL, 'Office', 21, 15.53387330, 76.16011500, 0),
(68, 67, 'present', '2025-12-27 09:25:40', '2025-12-27 03:55:40', '2025-12-27 09:25:40', NULL, 'Office', 21, 15.53389000, 76.16011000, 0),
(69, 69, 'present', '2025-12-27 14:47:01', '2025-12-27 09:17:01', '2025-12-27 14:47:01', NULL, 'Office', 18, 11.74570450, 76.72492740, 0),
(70, 69, 'present', '2025-12-28 09:28:49', '2025-12-28 03:58:49', '2025-12-28 09:28:49', NULL, 'Office', 18, 11.74556190, 76.72522880, 0),
(71, 67, 'present', '2025-12-28 09:44:05', '2025-12-28 04:14:05', '2025-12-28 09:44:05', NULL, 'Office', 21, 15.53367670, 76.16005000, 0),
(72, 67, 'present', '2025-12-29 11:22:27', '2025-12-29 05:52:27', '2025-12-29 11:22:27', NULL, 'Office', 21, 15.53381820, 76.16038010, 0),
(73, 67, 'present', '2025-12-30 09:20:49', '2025-12-30 03:50:49', '2025-12-30 09:20:49', NULL, 'Office', 21, 15.53377830, 76.16006830, 0),
(74, 69, 'present', '2025-12-30 09:44:21', '2025-12-30 12:08:53', '2025-12-30 09:44:21', '2025-12-30 17:38:53', 'Office', 18, 11.74578200, 76.72521800, 0),
(75, 67, 'present', '2025-12-31 09:41:18', '2025-12-31 04:11:18', '2025-12-31 09:41:18', NULL, 'Office', 21, 15.53392670, 76.15998500, 0),
(76, 69, 'present', '2025-12-31 09:55:14', '2025-12-31 12:24:05', '2025-12-31 09:55:14', '2025-12-31 17:54:05', 'Office', 18, 11.74543820, 76.72525030, 0),
(77, 69, 'present', '2026-01-02 09:28:48', '2026-01-02 12:50:00', '2026-01-02 09:28:48', '2026-01-02 18:20:00', 'Office', 18, 11.74559810, 76.72532490, 0),
(78, 67, 'present', '2026-01-02 11:51:12', '2026-01-02 06:21:12', '2026-01-02 11:51:12', NULL, 'Office', 21, 15.53400830, 76.16011330, 0),
(79, 69, 'present', '2026-01-03 09:31:03', '2026-01-03 12:08:38', '2026-01-03 09:31:03', '2026-01-03 17:38:38', 'Office', 18, 11.74550430, 76.72523100, 0),
(80, 69, 'present', '2026-01-04 09:48:08', '2026-01-04 12:41:38', '2026-01-04 09:48:08', '2026-01-04 18:11:38', 'Office', 18, 11.74552470, 76.72525670, 0),
(81, 69, 'present', '2026-01-05 09:40:52', '2026-01-05 13:15:30', '2026-01-05 09:40:52', '2026-01-05 18:45:30', 'Office', 18, 11.74550740, 76.72475860, 0),
(82, 67, 'present', '2026-01-05 09:52:15', '2026-01-05 04:22:15', '2026-01-05 09:52:15', NULL, 'Office', 21, 15.53410510, 76.16069850, 0),
(83, 69, 'present', '2026-01-06 09:40:53', '2026-01-06 12:30:21', '2026-01-06 09:40:53', '2026-01-06 18:00:21', 'Office', 18, 11.74549770, 76.72469780, 0),
(84, 69, 'present', '2026-01-07 09:33:40', '2026-01-07 12:43:02', '2026-01-07 09:33:40', '2026-01-07 18:13:02', 'Office', 18, 11.74556190, 76.72521510, 0),
(85, 67, 'present', '2026-01-07 10:01:19', '2026-01-07 04:31:19', '2026-01-07 10:01:19', NULL, 'Office', 21, 15.53379670, 76.16004670, 0),
(86, 67, 'present', '2026-01-08 09:02:33', '2026-01-08 03:32:33', '2026-01-08 09:02:33', NULL, 'Office', 21, 15.53397670, 76.16014670, 0),
(87, 69, 'present', '2026-01-08 09:48:54', '2026-01-08 04:18:54', '2026-01-08 09:48:54', NULL, 'Office', 18, 11.74558070, 76.72521250, 0),
(88, 67, 'present', '2026-01-09 09:39:59', '2026-01-09 04:09:59', '2026-01-09 09:39:59', NULL, 'Office', 21, 15.53384320, 76.16006500, 0),
(89, 69, 'present', '2026-01-09 10:32:51', '2026-01-09 05:02:51', '2026-01-09 10:32:51', NULL, 'Office', 25, 11.74134540, 76.72584430, 0),
(90, 67, 'present', '2026-01-10 08:58:59', '2026-01-10 03:28:59', '2026-01-10 08:58:59', NULL, 'Office', 21, 15.53379500, 76.15998000, 0),
(91, 69, 'present', '2026-01-10 10:11:17', '2026-01-10 04:41:17', '2026-01-10 10:11:17', NULL, 'Office', 18, 11.74561380, 76.72520090, 0),
(92, 67, 'present', '2026-01-11 10:10:53', '2026-01-11 04:40:53', '2026-01-11 10:10:53', NULL, 'Office', 21, 15.53388500, 76.16005170, 0),
(93, 69, 'present', '2026-01-11 10:45:36', '2026-01-11 05:15:36', '2026-01-11 10:45:36', NULL, 'Office', 18, 11.74557710, 76.72513850, 0),
(94, 67, 'present', '2026-01-12 09:58:13', '2026-01-12 04:28:13', '2026-01-12 09:58:13', NULL, 'Office', 21, 15.53334050, 76.15967020, 0),
(95, 58, 'present', '2026-01-12 10:01:38', '2026-01-12 04:31:53', '2026-01-12 10:01:38', '2026-01-12 10:01:53', 'Office', NULL, 9.98122440, 78.14337970, 0),
(96, 69, 'present', '2026-01-12 10:21:07', '2026-01-12 04:51:07', '2026-01-12 10:21:07', NULL, 'Office', 18, 11.74561750, 76.72520590, 0),
(97, 69, 'present', '2026-01-13 10:15:37', '2026-01-13 13:10:19', '2026-01-13 10:15:37', '2026-01-13 18:40:19', 'Office', 18, 11.74561990, 76.72518920, 0),
(98, 69, 'present', '2026-01-14 10:31:22', '2026-01-14 05:01:22', '2026-01-14 10:31:22', NULL, 'Office', 18, 11.74567030, 76.72521330, 0),
(99, 58, 'present', '2026-01-17 10:10:27', '2026-01-17 04:40:27', '2026-01-17 10:10:27', NULL, 'Office', NULL, 9.98122680, 78.14335320, 0),
(100, 67, 'present', '2026-01-20 09:15:42', '2026-01-20 03:45:42', '2026-01-20 09:15:42', NULL, 'Office', 21, 15.53356000, 76.16002830, 0),
(101, 67, 'present', '2026-01-21 09:10:38', '2026-01-21 03:40:38', '2026-01-21 09:10:38', NULL, 'Office', 21, 15.53376500, 76.16000500, 0),
(102, 67, 'present', '2026-01-22 09:23:51', '2026-01-22 03:53:51', '2026-01-22 09:23:51', NULL, 'Office', 21, 15.53360330, 76.16000330, 0),
(103, 67, 'present', '2026-01-23 09:04:17', '2026-01-23 03:34:17', '2026-01-23 09:04:17', NULL, 'Office', 21, 15.53374500, 76.15994000, 0),
(104, 67, 'present', '2026-01-24 08:51:37', '2026-01-24 03:21:37', '2026-01-24 08:51:37', NULL, 'Office', 21, 15.53387330, 76.16014670, 0),
(105, 67, 'present', '2026-01-25 09:01:05', '2026-01-25 03:31:05', '2026-01-25 09:01:05', NULL, 'Office', 21, 15.53380330, 76.15996670, 0),
(106, 67, 'present', '2026-01-26 09:05:33', '2026-01-26 03:35:33', '2026-01-26 09:05:33', NULL, 'Office', 21, 15.53384830, 76.16010330, 0),
(107, 58, 'present', '2026-01-26 12:07:58', '2026-01-26 06:37:58', '2026-01-26 12:07:58', NULL, 'Office', NULL, 9.98133950, 78.14330320, 0),
(108, 58, 'present', '2026-01-27 09:10:10', '2026-01-27 03:40:10', '2026-01-27 09:10:10', NULL, 'Office', NULL, 9.98121870, 78.14340180, 0),
(109, 67, 'present', '2026-01-27 09:13:08', '2026-01-27 03:43:08', '2026-01-27 09:13:08', NULL, 'Office', 21, 15.53387500, 76.16011330, 0),
(110, 67, 'present', '2026-01-28 09:08:22', '2026-01-28 03:38:22', '2026-01-28 09:08:22', NULL, 'Office', 21, 15.53436830, 76.16036000, 0),
(111, 67, 'present', '2026-01-29 08:59:09', '2026-01-29 03:29:09', '2026-01-29 08:59:09', NULL, 'Office', 21, 15.53390670, 76.16035330, 0),
(112, 67, 'present', '2026-01-30 09:05:37', '2026-01-30 03:35:37', '2026-01-30 09:05:37', NULL, 'Office', 21, 15.53352500, 76.16028500, 0),
(113, 67, 'present', '2026-01-31 09:02:57', '2026-01-31 03:32:57', '2026-01-31 09:02:57', NULL, 'Office', 21, 15.53380830, 76.16001830, 0),
(114, 69, 'present', '2026-01-31 10:16:35', '2026-01-31 04:46:35', '2026-01-31 10:16:35', NULL, 'Office', 18, 11.74573430, 76.72523960, 0),
(115, 67, 'present', '2026-02-02 09:14:34', '2026-02-02 03:44:34', '2026-02-02 09:14:34', NULL, 'Office', 21, 15.53385500, 76.16014830, 0),
(116, 67, 'present', '2026-02-03 08:42:52', '2026-02-03 03:12:52', '2026-02-03 08:42:52', NULL, 'Office', 21, 15.53373330, 76.16004670, 0),
(117, 67, 'present', '2026-02-04 08:49:44', '2026-02-04 03:19:44', '2026-02-04 08:49:44', NULL, 'Office', 21, 15.53375170, 76.15991500, 0),
(118, 67, 'present', '2026-02-05 08:45:50', '2026-02-05 03:15:50', '2026-02-05 08:45:50', NULL, 'Office', 21, 15.53367830, 76.16025500, 0),
(119, 67, 'present', '2026-02-06 09:07:19', '2026-02-06 03:37:19', '2026-02-06 09:07:19', NULL, 'Office', 21, 15.53373830, 76.16015830, 0);

-- --------------------------------------------------------

--
-- Table structure for table `attendance_conflicts`
--

CREATE TABLE `attendance_conflicts` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `attendance_id` int(11) NOT NULL,
  `conflict_type` varchar(50) NOT NULL,
  `details` text DEFAULT NULL,
  `resolved` tinyint(1) DEFAULT 0,
  `resolved_by` int(11) DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance_corrections`
--

CREATE TABLE `attendance_corrections` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `attendance_id` int(11) DEFAULT NULL,
  `correction_date` date NOT NULL,
  `original_check_in` datetime DEFAULT NULL,
  `original_check_out` datetime DEFAULT NULL,
  `requested_check_in` datetime DEFAULT NULL,
  `requested_check_out` datetime DEFAULT NULL,
  `reason` text NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `admin_remarks` text DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance_logs`
--

CREATE TABLE `attendance_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action` varchar(50) DEFAULT 'manual_entry',
  `details` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `log_action` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance_rules`
--

CREATE TABLE `attendance_rules` (
  `id` int(11) NOT NULL,
  `auto_checkout_time` time DEFAULT '18:00:00',
  `half_day_hours` decimal(3,1) DEFAULT 4.0,
  `full_day_hours` decimal(3,1) DEFAULT 8.0,
  `late_threshold_minutes` int(11) DEFAULT 15,
  `office_latitude` decimal(10,8) DEFAULT 0.00000000,
  `office_longitude` decimal(11,8) DEFAULT 0.00000000,
  `office_radius_meters` int(11) DEFAULT 200,
  `weekend_days` varchar(20) DEFAULT 'saturday,sunday',
  `is_gps_required` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `module` varchar(100) DEFAULT NULL,
  `action` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `badge_definitions`
--

CREATE TABLE `badge_definitions` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `icon` varchar(50) DEFAULT '?',
  `criteria_type` enum('points','tasks','streak','productivity') NOT NULL,
  `criteria_value` int(11) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `badge_definitions`
--

INSERT INTO `badge_definitions` (`id`, `name`, `description`, `icon`, `criteria_type`, `criteria_value`, `is_active`, `created_at`) VALUES
(1, 'First Task', 'Complete your first task', '🎯', 'tasks', 1, 1, '2025-10-26 22:02:34'),
(2, 'Task Master', 'Complete 10 tasks', '⭐', 'tasks', 10, 1, '2025-10-26 22:02:34'),
(3, 'Productivity Pro', 'Achieve 90% productivity score', '🚀', 'productivity', 90, 1, '2025-10-26 22:02:34'),
(4, 'Point Collector', 'Earn 100 points', '💎', 'points', 100, 1, '2025-10-26 22:02:34'),
(5, 'Consistent Performer', '5-day task completion streak', '🔥', 'streak', 5, 1, '2025-10-26 22:02:34');

-- --------------------------------------------------------

--
-- Table structure for table `chart_stats`
--

CREATE TABLE `chart_stats` (
  `id` int(11) NOT NULL,
  `company_prefix` varchar(50) NOT NULL,
  `quotation_pipeline_draft` int(11) DEFAULT 0,
  `quotation_pipeline_revised` int(11) DEFAULT 0,
  `quotation_pipeline_converted` int(11) DEFAULT 0,
  `win_rate` decimal(5,2) DEFAULT 0.00,
  `avg_deal_size` decimal(15,2) DEFAULT 0.00,
  `pipeline_value` decimal(15,2) DEFAULT 0.00,
  `po_count` int(11) DEFAULT 0,
  `po_fulfillment_rate` decimal(5,2) DEFAULT 0.00,
  `po_avg_lead_time` int(11) DEFAULT 0,
  `po_open_commitments` decimal(15,2) DEFAULT 0.00,
  `invoice_paid_count` int(11) DEFAULT 0,
  `invoice_unpaid_count` int(11) DEFAULT 0,
  `invoice_overdue_count` int(11) DEFAULT 0,
  `dso_days` int(11) DEFAULT 0,
  `bad_debt_risk` decimal(15,2) DEFAULT 0.00,
  `collection_efficiency` decimal(5,2) DEFAULT 0.00,
  `outstanding_total` decimal(15,2) DEFAULT 0.00,
  `top_customer_outstanding` decimal(15,2) DEFAULT 0.00,
  `concentration_risk` decimal(5,2) DEFAULT 0.00,
  `top3_exposure` decimal(15,2) DEFAULT 0.00,
  `customer_diversity` int(11) DEFAULT 0,
  `aging_current` decimal(15,2) DEFAULT 0.00,
  `aging_watch` decimal(15,2) DEFAULT 0.00,
  `aging_concern` decimal(15,2) DEFAULT 0.00,
  `aging_critical` decimal(15,2) DEFAULT 0.00,
  `provision_required` decimal(15,2) DEFAULT 0.00,
  `recovery_rate` decimal(5,2) DEFAULT 0.00,
  `credit_quality` varchar(20) DEFAULT 'Good',
  `payment_total` decimal(15,2) DEFAULT 0.00,
  `payment_velocity_daily` decimal(15,2) DEFAULT 0.00,
  `forecast_accuracy` decimal(5,2) DEFAULT 0.00,
  `cash_conversion_days` int(11) DEFAULT 0,
  `generated_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `circulars`
--

CREATE TABLE `circulars` (
  `id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `posted_by` int(11) NOT NULL,
  `visible_to` enum('All','Admin','User') DEFAULT 'All',
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `contacts`
--

CREATE TABLE `contacts` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `contacts`
--

INSERT INTO `contacts` (`id`, `name`, `phone`, `email`, `company`, `created_at`) VALUES
(1, 'Nelson Raj', '9517536422', 'nelsonraj@gmail.com', 'Athena Solutions', '2025-12-08 08:48:57'),
(2, 'Clinton', '98765 43211', 'clinton@gmail.com', 'BKG', '2025-12-08 08:51:39'),
(3, 'Anbu', '98763 44021', 'anbu.s@primevisiontech.com', NULL, '2025-12-11 03:51:41'),
(4, 'Naveen Raghav', '98877 51164', 'naveen.raghav@netcoreglobal.in', 'NetCore Global Services Ltd.', '2025-12-11 03:54:19'),
(5, 'John', '555-123-4567', 'john.doe@example.com', 'MAK47', '2025-12-11 05:46:21'),
(6, 'Aravind Kumar', '9012345678', 'Aravind Kumar@techsphere.in', 'TEC', '2025-12-11 06:14:14'),
(7, 'Arjun Mehta', '9123456789', 'arjun@bluewaveconsulting.in', 'Ak116', '2025-12-18 18:27:33'),
(8, 'LEO DAS', '9123738282', 'leo@gmail.com', 'DAS & CO', '2025-12-19 08:49:50'),
(9, 'Anbazhagan', '8056284477', NULL, 'VTM', '2026-01-01 05:22:12'),
(10, 'Murugadas', '9786934635', NULL, 'Ak116', '2026-01-01 05:47:45');

-- --------------------------------------------------------

--
-- Table structure for table `daily_performance`
--

CREATE TABLE `daily_performance` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `total_planned_minutes` int(11) DEFAULT 0,
  `total_active_minutes` decimal(10,2) DEFAULT 0.00,
  `total_tasks` int(11) DEFAULT 0,
  `completed_tasks` int(11) DEFAULT 0,
  `in_progress_tasks` int(11) DEFAULT 0,
  `postponed_tasks` int(11) DEFAULT 0,
  `completion_percentage` decimal(5,2) DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `daily_performance`
--

INSERT INTO `daily_performance` (`id`, `user_id`, `date`, `total_planned_minutes`, `total_active_minutes`, `total_tasks`, `completed_tasks`, `in_progress_tasks`, `postponed_tasks`, `completion_percentage`, `created_at`, `updated_at`) VALUES
(1, 57, '2025-12-17', 180, 0.00, 3, 0, 1, 1, 0.00, '2025-12-17 04:09:03', '2025-12-17 04:09:03');

-- --------------------------------------------------------

--
-- Table structure for table `daily_planner`
--

CREATE TABLE `daily_planner` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `department_id` int(11) DEFAULT NULL,
  `plan_date` date NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `estimated_hours` decimal(4,2) DEFAULT 0.00,
  `actual_hours` decimal(4,2) DEFAULT NULL,
  `completion_percentage` int(11) DEFAULT 0,
  `completion_status` enum('pending','in_progress','completed','cancelled') DEFAULT 'pending',
  `reminder_time` time DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `daily_planners`
--

CREATE TABLE `daily_planners` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `department_id` int(11) DEFAULT NULL,
  `plan_date` date NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `estimated_hours` decimal(4,2) DEFAULT NULL,
  `actual_hours` decimal(4,2) DEFAULT NULL,
  `completion_status` enum('not_started','in_progress','completed','cancelled') DEFAULT 'not_started',
  `completion_percentage` int(11) DEFAULT 0,
  `notes` text DEFAULT NULL,
  `reminder_time` time DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `daily_planner_audit`
--

CREATE TABLE `daily_planner_audit` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action` varchar(50) NOT NULL,
  `target_date` date DEFAULT NULL,
  `task_count` int(11) DEFAULT 0,
  `details` text DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `daily_plans`
--

CREATE TABLE `daily_plans` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `department_id` int(11) DEFAULT NULL,
  `plan_date` date NOT NULL,
  `project_name` varchar(200) DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `task_category` varchar(100) DEFAULT NULL,
  `category` enum('planned','unplanned') DEFAULT 'planned',
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `estimated_hours` decimal(4,2) DEFAULT 1.00,
  `status` enum('pending','in_progress','completed','blocked','cancelled') DEFAULT 'pending',
  `progress` int(11) DEFAULT 0,
  `actual_hours` decimal(4,2) DEFAULT 0.00,
  `completion_notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `completed_at` timestamp NULL DEFAULT NULL,
  `is_followup` tinyint(1) DEFAULT 0,
  `followup_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `daily_tasks`
--

CREATE TABLE `daily_tasks` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `task_id` int(11) DEFAULT NULL,
  `original_task_id` int(11) DEFAULT NULL,
  `scheduled_date` date NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `planned_start_time` time DEFAULT NULL,
  `planned_duration` int(11) DEFAULT 60,
  `priority` varchar(20) DEFAULT 'medium',
  `status` varchar(50) DEFAULT 'not_started',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `start_time` timestamp NULL DEFAULT NULL,
  `pause_time` timestamp NULL DEFAULT NULL,
  `pause_start_time` timestamp NULL DEFAULT NULL,
  `resume_time` timestamp NULL DEFAULT NULL,
  `completion_time` timestamp NULL DEFAULT NULL,
  `active_seconds` int(11) DEFAULT 0,
  `pause_duration` int(11) DEFAULT 0,
  `completed_percentage` int(11) DEFAULT 0,
  `postponed_from_date` date DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `total_pause_duration` int(11) DEFAULT 0,
  `sla_end_time` timestamp NULL DEFAULT NULL,
  `late_duration` int(11) DEFAULT 0,
  `postponed_to_date` date DEFAULT NULL,
  `source_field` varchar(50) DEFAULT NULL,
  `rollover_source_date` date DEFAULT NULL,
  `rollover_timestamp` timestamp NULL DEFAULT NULL,
  `remaining_sla_seconds` int(11) DEFAULT 0,
  `overdue_start_time` timestamp NULL DEFAULT NULL,
  `start_ts_ms` bigint(20) DEFAULT NULL,
  `sla_end_ts_ms` bigint(20) DEFAULT NULL,
  `pause_start_ts_ms` bigint(20) DEFAULT NULL,
  `paused_accum_ms` bigint(20) DEFAULT 0,
  `overdue_start_ts_ms` bigint(20) DEFAULT NULL,
  `sla_duration_seconds` int(11) DEFAULT 900,
  `progress_percent` int(11) DEFAULT 0,
  `total_pause_duration_ms` bigint(20) DEFAULT 0,
  `sla_time_spent_ms` bigint(20) DEFAULT 0,
  `overdue_time_spent_ms` bigint(20) DEFAULT 0,
  `total_used_time_ms` bigint(20) DEFAULT 0,
  `pause_end_ts_ms` bigint(20) DEFAULT NULL,
  `used_time_ms` bigint(20) DEFAULT 0,
  `remaining_sla_time` int(11) DEFAULT 0,
  `time_used` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `daily_tasks`
--

INSERT INTO `daily_tasks` (`id`, `user_id`, `task_id`, `original_task_id`, `scheduled_date`, `title`, `description`, `planned_start_time`, `planned_duration`, `priority`, `status`, `created_at`, `start_time`, `pause_time`, `pause_start_time`, `resume_time`, `completion_time`, `active_seconds`, `pause_duration`, `completed_percentage`, `postponed_from_date`, `updated_at`, `total_pause_duration`, `sla_end_time`, `late_duration`, `postponed_to_date`, `source_field`, `rollover_source_date`, `rollover_timestamp`, `remaining_sla_seconds`, `overdue_start_time`, `start_ts_ms`, `sla_end_ts_ms`, `pause_start_ts_ms`, `paused_accum_ms`, `overdue_start_ts_ms`, `sla_duration_seconds`, `progress_percent`, `total_pause_duration_ms`, `sla_time_spent_ms`, `overdue_time_spent_ms`, `total_used_time_ms`, `pause_end_ts_ms`, `used_time_ms`, `remaining_sla_time`, `time_used`) VALUES
(1, 69, 44, 44, '2026-01-02', 'LT PANEL FOUNDATION (Torrent Urja 17 Pvt Ltd)', 'LT PANEL FOUNDATION \r\nLT Foundation & Bus duct foundation with canopy and shed as per approved dwg.', NULL, 60, 'high', 'in_progress', '2026-01-02 04:28:51', NULL, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, '2026-01-02 04:28:51', 0, NULL, 0, NULL, 'planned_date', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, 900, 0, 0, 0, 0, 0, NULL, 0, 0, 0),
(2, 69, 65, 65, '2026-01-02', 'I&C - MISCELLANEOUS', 'I&C - MISCELLANEOUS\r\nMain gate installation with supply', NULL, 60, 'high', 'in_progress', '2026-01-02 05:16:14', NULL, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, '2026-01-02 05:16:14', 0, NULL, 0, NULL, 'planned_date', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, 900, 0, 0, 0, 0, 0, NULL, 0, 0, 0),
(3, 69, 68, 68, '2026-01-02', 'I&C - MISCELLANEOUS', '&C - MISCELLANEOUS \r\n1. CCTV cable laying & Pole\r\nmounting in PV area\r\n2. Street Lighting pole mounting ,\r\ncable laying & termination in PV\r\narea\r\n3. SCADA cable laying & installtion\r\nof required sensors', NULL, 60, 'high', 'in_progress', '2026-01-02 05:29:57', NULL, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, '2026-01-02 05:29:57', 0, NULL, 0, NULL, 'planned_date', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, 900, 0, 0, 0, 0, 0, NULL, 0, 0, 0),
(4, 1, 66, 66, '2026-01-02', 'MCS INSTALLATION', 'MCS INSTALLATION \r\nAs per Approved Drawing', NULL, 60, 'high', 'in_progress', '2026-01-02 05:30:53', NULL, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, '2026-01-02 05:30:53', 0, NULL, 0, NULL, 'planned_date', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, 900, 0, 0, 0, 0, 0, NULL, 0, 0, 0);

-- --------------------------------------------------------

--
-- Table structure for table `daily_task_history`
--

CREATE TABLE `daily_task_history` (
  `id` int(11) NOT NULL,
  `daily_task_id` int(11) NOT NULL,
  `action` varchar(50) NOT NULL,
  `old_value` text DEFAULT NULL,
  `new_value` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `daily_task_history`
--

INSERT INTO `daily_task_history` (`id`, `daily_task_id`, `action`, `old_value`, `new_value`, `notes`, `created_by`, `created_at`) VALUES
(1, 1, 'fetched', NULL, 'planned_date', '📌 Source: planned_date on 2025-12-08', 37, '2025-12-08 06:08:41'),
(2, 2, 'fetched', NULL, 'planned_date', '📌 Source: planned_date on 2025-12-08', 57, '2025-12-08 08:58:40'),
(3, 3, 'fetched', NULL, 'planned_date', '📌 Source: planned_date on 2025-12-08', 57, '2025-12-08 10:24:16'),
(4, 4, 'fetched', NULL, 'planned_date', '📌 Source: planned_date on 2025-12-08', 37, '2025-12-08 10:27:45'),
(5, 1, 'started', 'not_started', 'in_progress', 'Task started at 2025-12-08 10:40:18', 37, '2025-12-08 10:40:18'),
(6, 1, 'time_start', '0', NULL, 'Action: start at 2025-12-08 10:40:18. Duration: 0s.', 37, '2025-12-08 10:40:18'),
(7, 2, 'rollover_detected', '2025-12-08', '2025-12-09', 'Task detected for rollover from 2025-12-08', 57, '2025-12-09 08:33:24'),
(8, 3, 'rollover_detected', '2025-12-08', '2025-12-09', 'Task detected for rollover from 2025-12-08', 57, '2025-12-09 08:33:24'),
(9, 5, 'rollover', '2', '5', '🔄 Rolled over from: 2025-12-08', 57, '2025-12-09 08:33:24'),
(10, 6, 'rollover', '3', '6', '🔄 Rolled over from: 2025-12-08', 57, '2025-12-09 08:33:24'),
(11, 1, 'rollover_detected', '2025-12-08', '2025-12-09', 'Task detected for rollover from 2025-12-08', 37, '2025-12-09 08:33:35'),
(12, 7, 'rollover', '1', '7', '🔄 Rolled over from: 2025-12-08', 37, '2025-12-09 08:33:35'),
(13, 8, 'fetched', NULL, 'planned_date', '📌 Source: planned_date on 2025-12-09', 37, '2025-12-09 10:11:23'),
(14, 5, 'rollover_detected', '2025-12-09', '2025-12-10', 'Task detected for rollover from 2025-12-09', 57, '2025-12-10 03:54:55'),
(15, 6, 'rollover_detected', '2025-12-09', '2025-12-10', 'Task detected for rollover from 2025-12-09', 57, '2025-12-10 03:54:55'),
(16, 9, 'rollover', '5', '9', '🔄 Rolled over from: 2025-12-09', 57, '2025-12-10 03:54:55'),
(17, 10, 'rollover', '6', '10', '🔄 Rolled over from: 2025-12-09', 57, '2025-12-10 03:54:55'),
(18, 11, 'fetched', NULL, 'planned_date', '📌 Source: planned_date on 2025-12-10', 58, '2025-12-10 05:54:08'),
(19, 11, 'started', 'not_started', 'in_progress', 'Task started at 2025-12-10 05:55:06', 58, '2025-12-10 05:55:06'),
(20, 11, 'time_start', '0', NULL, 'Action: start at 2025-12-10 05:55:06. Duration: 0s.', 58, '2025-12-10 05:55:06'),
(21, 7, 'rollover_detected', '2025-12-09', '2025-12-11', 'Task detected for rollover from 2025-12-09', 37, '2025-12-11 03:01:39'),
(22, 4, 'rollover_detected', '2025-12-08', '2025-12-11', 'Task detected for rollover from 2025-12-08', 37, '2025-12-11 03:01:39'),
(23, 12, 'rollover', '7', '12', '🔄 Rolled over from: 2025-12-09', 37, '2025-12-11 03:01:39'),
(24, 13, 'rollover', '4', '13', '🔄 Rolled over from: 2025-12-08', 37, '2025-12-11 03:01:39'),
(25, 9, 'rollover_detected', '2025-12-10', '2025-12-11', 'Task detected for rollover from 2025-12-10', 57, '2025-12-11 03:03:34'),
(26, 14, 'rollover', '9', '14', '🔄 Rolled over from: 2025-12-10', 57, '2025-12-11 03:03:34'),
(27, 11, 'rollover_detected', '2025-12-10', '2025-12-11', 'Task detected for rollover from 2025-12-10', 58, '2025-12-11 03:14:31'),
(28, 15, 'rollover', '11', '15', '🔄 Rolled over from: 2025-12-10', 58, '2025-12-11 03:14:31'),
(29, 16, 'fetched', NULL, 'planned_date', '📌 Source: planned_date on 2025-12-11', 58, '2025-12-11 08:25:32'),
(30, 17, 'fetched', NULL, 'planned_date', '📌 Source: planned_date on 2025-12-11', 58, '2025-12-11 09:01:27'),
(31, 18, 'fetched', NULL, 'planned_date', '📌 Source: planned_date on 2025-12-11', 37, '2025-12-11 13:27:35'),
(32, 14, 'rollover_detected', '2025-12-11', '2025-12-12', 'Task detected for rollover from 2025-12-11', 57, '2025-12-12 14:11:32'),
(33, 10, 'rollover_detected', '2025-12-10', '2025-12-12', 'Task detected for rollover from 2025-12-10', 57, '2025-12-12 14:11:32'),
(34, 19, 'rollover_detected', '2025-12-11', '2025-12-12', 'Task detected for rollover from 2025-12-11', 57, '2025-12-12 14:11:32'),
(35, 20, 'rollover', '14', '20', '🔄 Rolled over from: 2025-12-11', 57, '2025-12-12 14:11:32'),
(36, 21, 'rollover', '10', '21', '🔄 Rolled over from: 2025-12-10', 57, '2025-12-12 14:11:32'),
(37, 22, 'rollover', '19', '22', '🔄 Rolled over from: 2025-12-11', 57, '2025-12-12 14:11:32'),
(38, 20, 'rollover_detected', '2025-12-12', '2025-12-15', 'Task detected for rollover from 2025-12-12', 57, '2025-12-15 06:25:21'),
(39, 21, 'rollover_detected', '2025-12-12', '2025-12-15', 'Task detected for rollover from 2025-12-12', 57, '2025-12-15 06:25:21'),
(40, 22, 'rollover_detected', '2025-12-12', '2025-12-15', 'Task detected for rollover from 2025-12-12', 57, '2025-12-15 06:25:21'),
(41, 23, 'rollover', '20', '23', '🔄 Rolled over from: 2025-12-12', 57, '2025-12-15 06:25:21'),
(42, 24, 'rollover', '21', '24', '🔄 Rolled over from: 2025-12-12', 57, '2025-12-15 06:25:21'),
(43, 25, 'rollover', '22', '25', '🔄 Rolled over from: 2025-12-12', 57, '2025-12-15 06:25:21'),
(44, 26, 'fetched', NULL, 'planned_date', '📌 Source: planned_date on 2025-12-16', 37, '2025-12-15 06:39:12'),
(45, 19, 'rollover_detected', '2025-12-15', '2025-12-16', 'Task detected for rollover from 2025-12-15', 57, '2025-12-16 18:16:18'),
(46, 23, 'rollover_detected', '2025-12-15', '2025-12-16', 'Task detected for rollover from 2025-12-15', 57, '2025-12-16 18:16:18'),
(47, 24, 'rollover_detected', '2025-12-15', '2025-12-16', 'Task detected for rollover from 2025-12-15', 57, '2025-12-16 18:16:18'),
(48, 29, 'rollover', '19', '29', '🔄 Rolled over from: 2025-12-15', 57, '2025-12-16 18:16:18'),
(49, 30, 'rollover', '23', '30', '🔄 Rolled over from: 2025-12-15', 57, '2025-12-16 18:16:18'),
(50, 31, 'rollover', '24', '31', '🔄 Rolled over from: 2025-12-15', 57, '2025-12-16 18:16:18'),
(51, 32, 'fetched', NULL, 'planned_date', '📌 Source: planned_date on 2025-12-16', 37, '2025-12-16 18:16:34'),
(52, 29, 'rollover_detected', '2025-12-16', '2025-12-17', 'Task detected for rollover from 2025-12-16', 57, '2025-12-17 04:07:59'),
(53, 30, 'rollover_detected', '2025-12-16', '2025-12-17', 'Task detected for rollover from 2025-12-16', 57, '2025-12-17 04:07:59'),
(54, 31, 'rollover_detected', '2025-12-16', '2025-12-17', 'Task detected for rollover from 2025-12-16', 57, '2025-12-17 04:07:59'),
(55, 33, 'rollover', '29', '33', '🔄 Rolled over from: 2025-12-16', 57, '2025-12-17 04:07:59'),
(56, 34, 'rollover', '30', '34', '🔄 Rolled over from: 2025-12-16', 57, '2025-12-17 04:07:59'),
(57, 35, 'rollover', '31', '35', '🔄 Rolled over from: 2025-12-16', 57, '2025-12-17 04:07:59'),
(58, 35, 'time_postpone', '0', NULL, 'Action: postpone at 2025-12-17 04:09:03. Duration: 0s.', 57, '2025-12-17 04:09:03'),
(59, 35, 'postponed', '2025-12-17', '2025-12-18', 'Task postponed to 2025-12-18', 57, '2025-12-17 04:09:03'),
(60, 36, 'created', NULL, 'postponed_entry', 'Postponed task entry created for 2025-12-18', 57, '2025-12-17 04:09:03'),
(61, 35, 'time_postpone', '0', NULL, 'Action: postpone at 2025-12-17 04:09:48. Duration: 0s.', 57, '2025-12-17 04:09:48'),
(62, 35, 'postponed', '2025-12-17', '2025-12-19', 'Task postponed to 2025-12-19', 57, '2025-12-17 04:09:48'),
(63, 37, 'created', NULL, 'postponed_entry', 'Postponed task entry created for 2025-12-19', 57, '2025-12-17 04:09:48'),
(64, 38, 'completed_via_followup', 'completed', '100', 'Task completed via follow-up module', 37, '2025-12-17 04:21:42'),
(65, 32, 'rollover_detected', '2025-12-16', '2025-12-17', 'Task detected for rollover from 2025-12-16', 37, '2025-12-17 04:21:45'),
(66, 39, 'rollover', '32', '39', '🔄 Rolled over from: 2025-12-16', 37, '2025-12-17 04:21:45'),
(67, 34, 'rollover_detected', '2025-12-17', '2025-12-18', 'Task detected for rollover from 2025-12-17', 57, '2025-12-18 04:59:31'),
(68, 40, 'rollover', '34', '40', '🔄 Rolled over from: 2025-12-17', 57, '2025-12-18 04:59:31'),
(69, 15, 'rollover_detected', '2025-12-11', '2025-12-18', 'Task detected for rollover from 2025-12-11', 58, '2025-12-18 16:55:36'),
(70, 16, 'rollover_detected', '2025-12-11', '2025-12-18', 'Task detected for rollover from 2025-12-11', 58, '2025-12-18 16:55:36'),
(71, 17, 'rollover_detected', '2025-12-11', '2025-12-18', 'Task detected for rollover from 2025-12-11', 58, '2025-12-18 16:55:36'),
(72, 41, 'rollover', '15', '41', '🔄 Rolled over from: 2025-12-11', 58, '2025-12-18 16:55:36'),
(73, 42, 'rollover', '16', '42', '🔄 Rolled over from: 2025-12-11', 58, '2025-12-18 16:55:36'),
(74, 43, 'rollover', '17', '43', '🔄 Rolled over from: 2025-12-11', 58, '2025-12-18 16:55:36'),
(75, 44, 'fetched', NULL, 'planned_date', '📌 Source: planned_date on 2025-12-18', 58, '2025-12-18 17:16:41'),
(76, 46, 'fetched', NULL, 'planned_date', '📌 Source: planned_date on 2025-12-18', 58, '2025-12-18 17:48:00'),
(77, 41, 'rollover_detected', '2025-12-18', '2025-12-19', 'Task detected for rollover from 2025-12-18', 58, '2025-12-18 18:38:14'),
(78, 48, 'rollover', '41', '48', '🔄 Rolled over from: 2025-12-18', 58, '2025-12-18 18:38:14'),
(79, 49, 'fetched', NULL, 'planned_date', '📌 Source: planned_date on 2025-12-19', 58, '2025-12-18 19:39:54'),
(80, 50, 'fetched', NULL, 'planned_date', '📌 Source: planned_date on 2025-12-19', 58, '2025-12-18 19:46:56'),
(81, 13, 'rollover_detected', '2025-12-11', '2025-12-19', 'Task detected for rollover from 2025-12-11', 37, '2025-12-18 20:38:56'),
(82, 39, 'rollover_detected', '2025-12-17', '2025-12-19', 'Task detected for rollover from 2025-12-17', 37, '2025-12-18 20:38:56'),
(83, 51, 'rollover', '13', '51', '🔄 Rolled over from: 2025-12-11', 37, '2025-12-18 20:38:56'),
(84, 52, 'rollover', '39', '52', '🔄 Rolled over from: 2025-12-17', 37, '2025-12-18 20:38:56'),
(85, 54, 'fetched', NULL, 'planned_date', '📌 Source: planned_date on 2025-12-19', 58, '2025-12-19 08:11:45'),
(86, 40, 'rollover_detected', '2025-12-18', '2025-12-19', 'Task detected for rollover from 2025-12-18', 57, '2025-12-19 08:17:12'),
(87, 55, 'rollover', '40', '55', '🔄 Rolled over from: 2025-12-18', 57, '2025-12-19 08:17:12'),
(88, 56, 'fetched', NULL, 'planned_date', '📌 Source: planned_date on 2025-12-19', 37, '2025-12-19 08:17:35'),
(89, 58, 'fetched', NULL, 'planned_date', '📌 Source: planned_date on 2025-12-19', 58, '2025-12-19 08:58:07'),
(90, 59, 'fetched', NULL, 'planned_date', '📌 Source: planned_date on 2025-12-19', 58, '2025-12-19 11:07:00'),
(91, 60, 'fetched', NULL, 'planned_date', '📌 Source: planned_date on 2025-12-19', 58, '2025-12-19 11:07:00');

-- --------------------------------------------------------

--
-- Table structure for table `daily_task_updates`
--

CREATE TABLE `daily_task_updates` (
  `id` int(11) NOT NULL,
  `plan_id` int(11) NOT NULL,
  `progress_before` int(11) DEFAULT 0,
  `progress_after` int(11) NOT NULL,
  `hours_worked` decimal(4,2) DEFAULT 0.00,
  `update_notes` text DEFAULT NULL,
  `blockers` text DEFAULT NULL,
  `next_steps` text DEFAULT NULL,
  `update_type` enum('progress','completion','blocker','status_change') DEFAULT 'progress',
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `daily_workflow_status`
--

CREATE TABLE `daily_workflow_status` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `workflow_date` date NOT NULL,
  `total_planned_tasks` int(11) DEFAULT 0,
  `total_completed_tasks` int(11) DEFAULT 0,
  `total_planned_hours` decimal(4,2) DEFAULT 0.00,
  `total_actual_hours` decimal(4,2) DEFAULT 0.00,
  `productivity_score` decimal(5,2) DEFAULT 0.00,
  `last_updated` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `morning_submitted_at` timestamp NULL DEFAULT NULL,
  `evening_updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dashboard_stats`
--

CREATE TABLE `dashboard_stats` (
  `id` int(11) NOT NULL,
  `company_prefix` varchar(10) DEFAULT NULL,
  `total_revenue` decimal(15,2) DEFAULT 0.00,
  `invoice_count` int(11) DEFAULT 0,
  `average_invoice` decimal(15,2) DEFAULT 0.00,
  `amount_received` decimal(15,2) DEFAULT 0.00,
  `collection_rate` decimal(5,2) DEFAULT 0.00,
  `paid_invoices` int(11) DEFAULT 0,
  `outstanding_amount` decimal(15,2) DEFAULT 0.00,
  `outstanding_percentage` decimal(5,2) DEFAULT 0.00,
  `overdue_amount` decimal(15,2) DEFAULT 0.00,
  `customer_count` int(11) DEFAULT 0,
  `po_commitments` decimal(15,2) DEFAULT 0.00,
  `open_pos` int(11) DEFAULT 0,
  `average_po` decimal(15,2) DEFAULT 0.00,
  `claimable_amount` decimal(15,2) DEFAULT 0.00,
  `claimable_pos` int(11) DEFAULT 0,
  `claim_rate` decimal(5,2) DEFAULT 0.00,
  `generated_at` timestamp NULL DEFAULT current_timestamp(),
  `pending_invoices` int(11) DEFAULT 0,
  `customers_pending` int(11) DEFAULT 0,
  `igst_liability` decimal(15,2) DEFAULT 0.00,
  `cgst_sgst_total` decimal(15,2) DEFAULT 0.00,
  `gst_liability` decimal(15,2) DEFAULT 0.00,
  `closed_pos` int(11) DEFAULT 0,
  `placed_quotations` int(11) DEFAULT 0,
  `rejected_quotations` int(11) DEFAULT 0,
  `pending_quotations` int(11) DEFAULT 0,
  `total_quotations` int(11) DEFAULT 0,
  `po_high_fulfillment_count` int(11) DEFAULT 0,
  `po_mid_fulfillment_count` int(11) DEFAULT 0,
  `po_low_fulfillment_count` int(11) DEFAULT 0,
  `po_total_count` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `head_id` int(11) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `departments`
--

INSERT INTO `departments` (`id`, `name`, `description`, `head_id`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Human Resources', 'Employee management and organizational development', 58, 'active', '2025-10-23 06:24:06', '2025-12-22 13:09:10'),
(5, 'Operations', 'Daily business operations and logistics', NULL, 'active', '2025-10-23 06:24:06', '2025-10-23 06:24:06'),
(6, 'Liaison', 'Interdepartmental coordination and external stakeholder communication.', 1, 'inactive', '2025-10-26 21:55:53', '2025-12-22 13:07:38'),
(13, 'Finance & Accounts', 'Consolidated Finance, Accounting and Financial Operations', 16, 'active', '2025-10-27 09:35:18', '2025-12-22 13:08:53'),
(14, 'Information Technology', 'Consolidated IT Development, Infrastructure and Support', NULL, 'inactive', '2025-10-27 09:35:18', '2025-12-22 13:07:27'),
(15, 'Marketing & Sales', 'Consolidated Marketing, Sales and Business Development', NULL, 'inactive', '2025-10-27 09:35:18', '2025-12-22 13:08:11');

-- --------------------------------------------------------

--
-- Table structure for table `enabled_modules`
--

CREATE TABLE `enabled_modules` (
  `id` int(11) NOT NULL,
  `module_name` varchar(50) NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `enabled_at` timestamp NULL DEFAULT current_timestamp(),
  `disabled_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `enabled_modules`
--

INSERT INTO `enabled_modules` (`id`, `module_name`, `status`, `enabled_at`, `disabled_at`, `created_at`, `updated_at`) VALUES
(1, 'users', 'active', '2025-12-09 10:21:09', NULL, '2025-12-02 17:08:13', '2025-12-09 10:21:09'),
(2, 'projects', 'active', '2025-12-09 10:27:44', NULL, '2025-12-02 17:08:18', '2025-12-09 10:27:44'),
(3, 'tasks', 'active', '2025-12-02 17:08:25', NULL, '2025-12-02 17:08:25', '2025-12-02 17:08:25'),
(4, 'notifications', 'active', '2025-12-16 18:23:25', NULL, '2025-12-02 17:08:29', '2025-12-16 18:23:25'),
(5, 'finance', 'active', '2025-12-09 10:27:54', NULL, '2025-12-02 17:08:38', '2025-12-09 10:27:54'),
(6, 'departments', 'active', '2025-12-09 09:00:08', NULL, '2025-12-08 04:03:39', '2025-12-09 09:00:08'),
(8, 'daily_planner', 'inactive', '2025-12-09 09:00:14', NULL, '2025-12-08 06:08:36', '2025-12-22 13:03:14'),
(9, 'reports', 'inactive', '2025-12-11 08:42:26', NULL, '2025-12-08 07:11:01', '2025-12-22 13:03:49'),
(10, 'analytics', 'inactive', '2025-12-15 06:29:30', NULL, '2025-12-08 07:11:34', '2025-12-22 13:03:38'),
(16, 'followups', 'active', '2026-01-01 05:17:06', NULL, '2025-12-08 08:48:07', '2026-01-01 05:17:06'),
(19, 'system_admin', 'inactive', '2025-12-15 06:30:05', NULL, '2025-12-08 09:07:59', '2025-12-22 13:03:41'),
(20, 'gamification', 'active', '2026-01-01 05:17:18', NULL, '2025-12-08 09:08:04', '2026-01-01 05:17:18');

-- --------------------------------------------------------

--
-- Table structure for table `evening_updates`
--

CREATE TABLE `evening_updates` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `planner_id` int(11) DEFAULT NULL,
  `task_id` int(11) DEFAULT NULL,
  `progress_percentage` int(11) DEFAULT 0,
  `actual_hours_spent` decimal(4,2) DEFAULT 0.00,
  `completion_status` enum('not_started','in_progress','completed','blocked') DEFAULT 'not_started',
  `blockers` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE `expenses` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `project_id` int(11) DEFAULT NULL,
  `category` varchar(100) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` text DEFAULT NULL,
  `receipt_path` varchar(255) DEFAULT NULL,
  `status` enum('pending','approved','rejected','paid') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `expense_date` date NOT NULL DEFAULT curdate(),
  `attachment` varchar(255) DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `journal_entry_id` int(11) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `payment_proof` varchar(255) DEFAULT NULL,
  `paid_by` int(11) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `approved_amount` decimal(10,2) DEFAULT NULL,
  `approval_remarks` text DEFAULT NULL,
  `payment_remarks` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `expenses`
--

INSERT INTO `expenses` (`id`, `user_id`, `project_id`, `category`, `amount`, `description`, `receipt_path`, `status`, `created_at`, `updated_at`, `expense_date`, `attachment`, `rejection_reason`, `approved_by`, `journal_entry_id`, `approved_at`, `payment_proof`, `paid_by`, `paid_at`, `approved_amount`, `approval_remarks`, `payment_remarks`) VALUES
(1, 69, 20, 'other', 3524.00, 'Paint materials and pipe elbow also', NULL, 'pending', '2025-12-23 05:56:26', '2025-12-23 05:56:26', '2025-12-23', '1766469386_IMG_20251223_111232.jpg', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

--
-- Triggers `expenses`
--
DELIMITER $$
CREATE TRIGGER `expense_notification_insert` AFTER INSERT ON `expenses` FOR EACH ROW BEGIN
            INSERT INTO notifications (sender_id, receiver_id, type, category, title, message, reference_type, reference_id, module_type, status_change, action_url)
            SELECT NEW.user_id, u.id, 'info', 'approval', 
                   CONCAT('New Expense Request from ', (SELECT name FROM users WHERE id = NEW.user_id)),
                   CONCAT('Expense request for ', NEW.description, ' - Amount: $', NEW.amount),
                   'expense', NEW.id, 'expense', 'pending', CONCAT('/ergon/expenses/view/', NEW.id)
            FROM users u 
            WHERE u.role IN ('admin', 'owner') AND u.status = 'active';
        END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `expense_notification_update` AFTER UPDATE ON `expenses` FOR EACH ROW BEGIN
            IF OLD.status != NEW.status AND NEW.status IN ('approved', 'rejected') THEN
                INSERT INTO notifications (sender_id, receiver_id, type, category, title, message, reference_type, reference_id, module_type, status_change, approver_id, action_url)
                VALUES (NEW.approved_by, NEW.user_id, 
                       CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'warning' END,
                       'approval', 
                       CONCAT('Expense Request ', UPPER(NEW.status)),
                       CONCAT('Your expense request has been ', NEW.status, ' - Amount: $', NEW.amount),
                       'expense', NEW.id, 'expense', NEW.status, NEW.approved_by, CONCAT('/ergon/expenses/view/', NEW.id));
            END IF;
        END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `finance_customer`
--

CREATE TABLE `finance_customer` (
  `id` bigint(20) NOT NULL,
  `customer_code` varchar(255) DEFAULT NULL,
  `customer_type` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `display_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `mobile` varchar(255) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `billing_address_line1` varchar(255) DEFAULT NULL,
  `billing_address_line2` varchar(255) DEFAULT NULL,
  `billing_city` varchar(255) DEFAULT NULL,
  `billing_state` varchar(255) DEFAULT NULL,
  `billing_pincode` varchar(255) DEFAULT NULL,
  `billing_country` varchar(255) DEFAULT NULL,
  `shipping_same_as_billing` tinyint(1) DEFAULT NULL,
  `shipping_address_line1` varchar(255) DEFAULT NULL,
  `shipping_address_line2` varchar(255) DEFAULT NULL,
  `shipping_city` varchar(255) DEFAULT NULL,
  `shipping_state` varchar(255) DEFAULT NULL,
  `shipping_pincode` varchar(255) DEFAULT NULL,
  `shipping_country` varchar(255) DEFAULT NULL,
  `business_type` varchar(255) DEFAULT NULL,
  `industry` varchar(255) DEFAULT NULL,
  `gstin` varchar(255) DEFAULT NULL,
  `pan_number` varchar(255) DEFAULT NULL,
  `aadhar_number` varchar(255) DEFAULT NULL,
  `bank_name` varchar(255) DEFAULT NULL,
  `bank_account_number` varchar(255) DEFAULT NULL,
  `bank_ifsc_code` varchar(255) DEFAULT NULL,
  `bank_branch` varchar(255) DEFAULT NULL,
  `credit_limit` decimal(18,2) DEFAULT NULL,
  `payment_terms` varchar(255) DEFAULT NULL,
  `currency` varchar(255) DEFAULT NULL,
  `project_area` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `company_id` bigint(20) DEFAULT NULL,
  `created_by_id` bigint(20) DEFAULT NULL,
  `gst_registration_date` date DEFAULT NULL,
  `is_gst_registered` tinyint(1) DEFAULT NULL,
  `state_code` varchar(255) DEFAULT NULL,
  `account_holder_name` varchar(255) DEFAULT NULL,
  `bank_verification_status` varchar(255) DEFAULT NULL,
  `bank_verified_date` timestamp NULL DEFAULT NULL,
  `last_statement_import` timestamp NULL DEFAULT NULL,
  `statement_import_enabled` tinyint(1) DEFAULT NULL,
  `opening_balance` decimal(18,2) DEFAULT NULL,
  `opening_balance_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `finance_customer`
--

INSERT INTO `finance_customer` (`id`, `customer_code`, `customer_type`, `name`, `display_name`, `email`, `phone`, `mobile`, `website`, `billing_address_line1`, `billing_address_line2`, `billing_city`, `billing_state`, `billing_pincode`, `billing_country`, `shipping_same_as_billing`, `shipping_address_line1`, `shipping_address_line2`, `shipping_city`, `shipping_state`, `shipping_pincode`, `shipping_country`, `business_type`, `industry`, `gstin`, `pan_number`, `aadhar_number`, `bank_name`, `bank_account_number`, `bank_ifsc_code`, `bank_branch`, `credit_limit`, `payment_terms`, `currency`, `project_area`, `notes`, `is_active`, `created_at`, `updated_at`, `company_id`, `created_by_id`, `gst_registration_date`, `is_gst_registered`, `state_code`, `account_holder_name`, `bank_verification_status`, `bank_verified_date`, `last_statement_import`, `statement_import_enabled`, `opening_balance`, `opening_balance_date`) VALUES
(9, 'SECUS001', 'business', 'Prozeal Green Energy Limited', 'Prozeal Green Energy Ltd', '', '7940191727', '', '', 'Prozeal Green Energy Ltd, 1209 to 1212 , West Wing, Stratum @Venus Grounds,', 'Nehru Nagar, Ahmedabad, Gujarat-380015', 'Ahmedabad', 'Gujarat', '380015', 'India', 0, 'Prozeal Green Energy Ltd, 1209 to 1212 , West Wing, Stratum @Venus Grounds,', 'Nehru Nagar, Ahmedabad, Gujarat-380015', 'Ahmedabad', 'Gujarat', '380015', 'India', '', '', '24AAHCP3289L1ZY', 'AAHCP3289L', '', '', '', '', '', 0.00, '', 'INR', '', '', 1, '2025-11-14 10:40:54', '2025-11-18 10:53:19', 11, 29, NULL, 1, '24', '', 'pending', NULL, NULL, 0, 0.00, NULL),
(10, 'SECUS002', 'business', 'MAK47', 'MAK47', 'manicanter3050@gmail.com', '9787873050', '', '', 'No 146, Achani Village, Veppangulam, Sivagangai, Tamilnadu-630305', '', 'Sivagangai', 'Tamilnadu', '630305', 'India', 0, 'No 146, Achani Village, Veppangulam, Sivagangai, Tamilnadu-630305', '', 'Sivagangai', 'Tamilnadu', '630305', 'India', '', '', '33CTQPM7467J1ZX', 'CTQPM7467J', '', '', '', '', '', 0.00, '', 'INR', '', '', 1, '2025-11-14 12:10:46', '2025-11-20 07:12:11', 11, 29, NULL, 1, '33', '', 'pending', NULL, NULL, 0, 0.00, NULL),
(11, 'SECUS003', 'business', 'TAMILVANAN INDUSTRIES', 'TAMILVANAN INDUSTRIES', '', '9965563637', '', '', '187, Tiruchuli Kallikudi Road, Vaiyampatti road,', 'Virudhunagar , TamiKariapattilnadu-626001', 'Virudhunagar', 'Tamilnadu', '626001', 'India', 1, '', '', '', '', '', '', '', '', '33ABCPT7999Q1ZG', 'ABCPT7999Q', '', '', '', '', '', 0.00, '', 'INR', '', '', 1, '2025-11-14 12:23:53', '2025-11-14 12:34:00', 11, 29, NULL, 1, '33', '', 'pending', NULL, NULL, 0, 0.00, NULL),
(12, 'SECUS004', 'business', 'DSK Electricals', 'DSK Electricals', '', '6380795088', '', '', 'DSK Electricals  B1-C1 First Floor, Gemini parson commercial complex No.600,Anna Salai Chennai: 600006.', '', 'Chennai', 'TamilNadu', '600006', 'India', 0, 'DSK Electricals  B1-C1 First Floor, Gemini parson commercial complex No.600,Anna Salai Chennai: 600006.', '', 'Chennai', 'TamilNadu', '600006', 'India', '', '', '33AAAFD0525H1Z4', 'AAAFD0525H', '', '', '', '', '', 0.00, '', 'INR', '', '', 1, '2025-11-16 05:44:54', '2025-11-20 07:08:52', 11, 29, NULL, 1, '3', '', 'pending', NULL, NULL, 0, 0.00, NULL),
(13, 'TCCUS001', 'business', 'Prozeal Green Energy Ltd', 'Prozeal Green Energy Ltd', '', '7940191727', '', '', '1209 to 1212 , West Wing, Stratum @Venus Grounds, Nehru Nagar, Ahmedabad, Gujarat-380015', '', 'Ahmedabad', 'TamilNadu', '380015', 'India', 0, '1209 to 1212 , West Wing, Stratum @Venus Grounds, Nehru Nagar, Ahmedabad, Gujarat-380015', '', 'Ahmedabad', 'TamilNadu', '380015', 'India', '', '', '24AAHCP3289L1ZY', 'AAHCP3289L', '', '', '', '', '', 0.00, '', 'INR', '', '', 1, '2025-11-17 10:24:45', '2025-12-15 10:05:28', 13, 30, NULL, 1, '2', '', 'pending', NULL, NULL, 0, 0.00, NULL),
(14, 'TCCUS002', 'business', 'Prathama Solarconnect Energy Private Limited', 'Prathama Solarconnect Energy Private Limited', '', '9080654027', '', '', 'Survey No.147, Sub Division 3B, Veppankulam Village, Karaikudi Taluka, Sivagangai Dist - 630302, Tamil Nadu', '', 'Sivagangai Dist', 'TamilNadu', '630302', 'India', 0, 'Survey No.147, Sub Division 3B, Veppankulam Village, Karaikudi Taluka, Sivagangai Dist - 630302, Tamil Nadu', '', 'Sivagangai Dist', 'TamilNadu', '630302', 'India', '', '', '33AAKCP3080G1ZI', 'AAKCP3080G', '', '', '', '', '', 0.00, '', 'INR', '', '', 1, '2025-11-17 10:32:49', '2025-12-15 10:23:42', 13, 30, NULL, 1, '33', '', 'pending', NULL, NULL, 0, 0.00, NULL),
(15, 'TCCUS003', 'business', 'Thiagarajar Mills (P) Ltd', 'Thiagarajar Mills (P) Ltd', '', '9080654027', '', '', 'Ottapidaram,Tuticorin,  Tamil Nadu - 628401.', '', 'Tuticorin', 'TamilNadu', '628401', 'India', 0, 'Ottapidaram,Tuticorin,  Tamil Nadu - 628401.', '', 'Tuticorin', 'TamilNadu', '628401', 'India', '', '', '33AAACT4304R1Z8', 'AAACT4304R', '', '', '', '', '', 0.00, '', 'INR', '', '', 1, '2025-11-17 10:36:42', '2025-12-15 10:25:56', 13, 30, NULL, 1, '33', '', 'pending', NULL, NULL, 0, 0.00, NULL),
(16, 'TCCUS004', 'business', 'Torrent Saurya Urja 5 Pvt Ltd', 'Torrent Saurya Urja 5 Pvt Ltd', '', '9080654027', '', '', 'Samanvay 600 Tapovan, Ambavadi,  Ahmedabad, Gujarat – 380015', '', 'Ahmedabad', 'TamilNadu', '380015', 'India', 0, 'Samanvay 600 Tapovan, Ambavadi,  Ahmedabad, Gujarat – 380015', '', 'Ahmedabad', 'TamilNadu', '380015', 'India', 'trust', '', '24AAICT7384F1Z3', 'AAICT7384F', '', '', '', '', '', 0.00, '', 'INR', '', '', 1, '2025-11-17 10:42:06', '2025-11-20 12:32:03', 13, 30, NULL, 1, '2', '', 'pending', NULL, NULL, 0, 0.00, NULL),
(23, 'BKCCUS007', 'business', 'Prozeal Green Energy Private Limited', 'Prozeal Green Energy Private Limited', '', '', '', '', '1209 to 1212 , West Wing, 12th Floor, Stratum @Venus Grounds, Near Jhansi Ki Rani Statue, Satellite Rd,', 'Nehru Nagar,', 'Ahmedabad,', 'Gujarat', '380015', 'India', 0, '1209 to 1212 , West Wing, 12th Floor, Stratum @Venus Grounds, Near Jhansi Ki Rani Statue, Satellite Rd,', 'Nehru Nagar,', 'Ahmedabad,', 'Gujarat', '380015', 'India', '', '', '24AAHCP3289L1ZY', 'AAHCP3289L', '', '', '', '', '', 0.00, '', 'INR', '', '', 1, '2025-11-18 10:49:24', '2025-11-20 05:50:58', 14, 31, NULL, 1, ':', '', 'pending', NULL, NULL, 0, 0.00, NULL),
(24, 'ASCUS001', 'business', 'Prozeal Green Energy  Ltd', 'Prozeal Green Energy  Ltd', '', '', '', '', '1209 and 1210 , West Wing, 12th Floor, Stratum @ Venus Grounds, Near Jhansi Ki Rani Statue, Satellite Rd', 'Nehru Nagar,, Ahmedabad, Gujarat-380015', 'Ahmedabad', 'Gujarat', '380015', 'India', 0, '1209 and 1210 , West Wing, 12th Floor, Stratum @ Venus Grounds, Near Jhansi Ki Rani Statue, Satellite Rd', 'Nehru Nagar,, Ahmedabad, Gujarat-380015', 'Ahmedabad', 'Gujarat', '380015', 'India', '', '', '24AAHCP3289L1ZY', 'AAHCP3289L', '', '', '', '', '', 0.00, '', 'INR', '', '', 1, '2025-11-18 17:46:04', '2025-12-15 07:13:02', 15, 32, NULL, 1, '2', '', 'pending', NULL, NULL, 0, 0.00, NULL),
(25, 'ASCUS002', 'business', 'Lucmen Energgy Pvt Ltd', 'Lucmen Energgy Pvt Ltd', '', '', '', '', 'Plot No 74, Ramani Flats, 4th Street, Ashtalakshmi Nagar, West Thambaram,  Chennai – 600048.', '', 'Chennai', 'TamilNadu', '630305', 'India', 0, 'Plot No 74, Ramani Flats, 4th Street, Ashtalakshmi Nagar, West Thambaram,  Chennai – 600048.', '', 'Chennai', 'TamilNadu', '630305', 'India', 'other', '', '33AADCL2517M1ZK', 'AADCL2517M', '', '', '', '', '', 0.00, '', 'INR', '', '', 1, '2025-11-18 17:51:06', '2025-11-20 10:02:05', 15, 32, NULL, 1, '33', '', 'pending', NULL, NULL, 0, 0.00, NULL),
(26, 'ASCUS003', 'business', 'Pollax Solar Solutions Pvt Ltd', 'Pollax Solar Solutions Pvt Ltd', '', '', '', '', 'Unit No : 7 & 8, FIRST FLOOR, PINNACLE BUILDING, MANAMATHY, Manambathi, Kanchipuram,', '', 'Kanchipuram', 'TamilNadu', '630305', 'India', 0, 'Unit No : 7 & 8, FIRST FLOOR, PINNACLE BUILDING, MANAMATHY, Manambathi, Kanchipuram,', '', 'Kanchipuram', 'TamilNadu', '630305', 'India', '', '', '33AANCP0666M1Z0', 'AANCP0666M', '', '', '', '', '', 0.00, '', 'INR', '', '', 1, '2025-11-18 17:56:22', '2025-12-15 06:15:54', 15, 32, NULL, 1, '33', '', 'pending', NULL, NULL, 0, 0.00, NULL),
(27, 'MAK47CUS001', 'business', 'TVS Electronics Limited', 'TVS Electronics Limited', '', '', '', '', 'Arihant E-Park 9th Floor, L.B.Road, Adyar, Chennai-600 020.', '', 'Chennai', 'TamilNadu', '630305', 'India', 0, 'Arihant E-Park 9th Floor, L.B.Road, Adyar, Chennai-600 020.', '', 'Chennai', 'TamilNadu', '630305', 'India', '', '', '33AAACI0886K1ZI', 'AAACI0886K', '', '', '', '', '', 0.00, '', 'INR', '', '', 1, '2025-11-20 03:41:11', '2025-11-20 03:54:30', 16, 33, NULL, 1, '33', '', 'pending', NULL, NULL, 0, 0.00, NULL),
(28, 'BKGECUS001', 'business', 'Prozeal Green Energy Limited', 'Prozeal Green Energy Ltd', '', '6374075829', '', '', 'Prozeal Green Energy Limited, 1209 to 1212 , West Wing, Stratum @Venus Grounds,', 'Nehru Nagar, Ahmedabad, Gujarat-380015', 'Ahmedabad', 'Gujarat', '380015', 'India', 0, 'Prozeal Green Energy Limited, 1209 to 1212 , West Wing, Stratum @Venus Grounds,', 'Nehru Nagar, Ahmedabad, Gujarat-380015', 'Ahmedabad', 'Gujarat', '380015', 'India', '', '', '24AAHCP3289L1ZY', 'AAHCP3289L', '', '', '', '', '', 0.00, '', 'INR', '', '', 1, '2025-11-20 04:51:17', '2025-12-01 09:11:06', 17, 34, NULL, 1, '24', '', 'pending', NULL, NULL, 0, 0.00, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `finance_customershippingaddress`
--

CREATE TABLE `finance_customershippingaddress` (
  `id` bigint(20) NOT NULL,
  `label` varchar(255) NOT NULL,
  `address_line1` varchar(255) NOT NULL,
  `address_line2` varchar(255) NOT NULL,
  `city` varchar(255) NOT NULL,
  `state` varchar(255) NOT NULL,
  `pincode` varchar(20) NOT NULL,
  `country` varchar(255) NOT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `customer_id` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `finance_customershippingaddress`
--

INSERT INTO `finance_customershippingaddress` (`id`, `label`, `address_line1`, `address_line2`, `city`, `state`, `pincode`, `country`, `is_default`, `created_at`, `updated_at`, `customer_id`) VALUES
(1763462740501, 'Torrent Urja 14 Pvt Ltd ', '', '', '', '', '', 'India', 0, '2025-11-18 10:53:19', '2025-11-18 10:53:19', 9),
(1763463024479, 'Pantech Synergy Private Limited', 'Sy.no.135/19A2S , D.Kamdambankulam village', 'aviyur ', 'virudhunagar', 'tamilnadu', '626115', 'India', 0, '2025-11-20 05:50:58', '2025-11-20 05:50:58', 23),
(1763463099279, 'Parvathi Dyeing Private Limited', 'kadambankulam village ', 'aviyur', 'virudhunagar', 'tamilnadu', '626115', 'India', 0, '2025-11-20 05:50:58', '2025-11-20 05:50:58', 23),
(1763463256220, 'Pro-Zeal Green Power Five Pvt. Ltd.', 'Hangalahobali, Mylanahalli Village, Lanahalli,Sy No. 14 Sy No.118/1 Sy No.118/2, 1,', 'Guntassituated,', 'Chamarajanagar', 'karnataka', '571111', 'India', 0, '2025-11-20 05:50:58', '2025-11-20 05:50:58', 23),
(1763463275649, 'Prathama Solarconnect Energy Pvt Ltd Veppankullam Village,  Sivagangai District, Tamil Nadu', '', '', ' Sivagangai District', 'TamilNadu', '630305', 'India', 0, '2025-11-20 07:12:11', '2025-11-20 07:12:11', 10),
(1763463379090, 'Shree Mtk Textiles Private Limited', 'Sy.no.135/19A2S , D.Kamdambankulam village', 'aviyur', 'virudhunagar', 'tamilnadu', '626115', 'India', 0, '2025-11-20 05:50:58', '2025-11-20 05:50:58', 23),
(1763463461151, 'Star Eco Energy Private Limited', 'Sy.no.135/19A2S , D.Kamdambankulam village', 'aviyur', 'virudhunagar', 'tamilnadu', '626115', 'India', 0, '2025-11-20 05:50:58', '2025-11-20 05:50:58', 23),
(1763463562660, 'Suriya Spinning Mills', 'Sy.no.135/19A2S , D.Kamdambankulam village', 'Aviyur', 'Virudhunagar', 'tamilnadu', '626115', 'India', 0, '2025-11-20 05:50:58', '2025-11-20 05:50:58', 23),
(1763463651761, 'Torrent Saurya Urja 3 Private Limited -', 'Automotive Axel Village Somahalli, District Chamarajnagara,Taluka Gundlupet, MysoreSurvey no :76,74,110,111', 'Begur KEB Road,,Taluk - Gundlupet,', 'Gundlupet,', 'karnataka', '571109', 'India', 0, '2025-11-20 05:50:58', '2025-11-20 05:50:58', 23),
(1763463868770, 'Torrent Urja 17 Private Limited-', 'Laxmi Mills Village', 'Ottapidaram,,,', 'Ottapidaram,,,', 'tamilnadu', '628401', 'India', 0, '2025-11-20 05:50:58', '2025-11-20 05:50:58', 23),
(1763463869618, 'Torrent Urja 14 Private Limited', 'Sy.no. 699 & 700,Behind Panchalankurichi Cylon Colony Village, Towards Kulasekaranallur village,', 'ottapidaram', 'tuticorin', 'tamilnadu', '628401', 'India', 0, '2025-11-20 05:50:58', '2025-11-20 05:50:58', 23),
(1763487564121, 'AM GREEN ENERGY PRIVATE LIMITED, 1', 'Village -Kandikayapalli/ Alamuru, Panyam Mandal, District - Nandyal, Kurnool,', 'Andhra Pradesh, India- 518112', 'Nandya', 'Andhra Pradesh', '518112', 'India', 0, '2025-12-15 07:13:02', '2025-12-15 07:13:02', 24),
(1763488151629, ' 1Lucmen Energgy Pvt Ltd', 'Plot No 74, Ramani Flats, 4th Street, Ashtalakshmi Nagar, West ThambaramPlot No 74, Ramani Flats, 4th Street, Ashtalakshmi Nagar, West Thambaram,  Chennai – 600048. i – 600048. ', '', '  Chennai', 'TamilNadu', '630305', 'India', 0, '2025-11-20 10:02:05', '2025-11-20 10:02:05', 25),
(1763488478801, 'Pollax Solar Solutions Pvt Ltd ', 'Unit No : 7 & 8, FIRST FLOOR, PINNACLE BUILDING, MANAMATHY, Manambathi, Kanchipuram,', '', ' Kanchipuram', 'TamilNadu', '630305', 'India', 0, '2025-12-15 06:15:54', '2025-12-15 06:15:54', 26),
(1763553038661, 'Bangalore International Airport Limited', 'Administration Block, Bravo-1,Kempegowda International airport', 'Devanahalli,,', 'bengaluru', 'karnataka', '560300', 'India', 0, '2025-11-20 05:50:58', '2025-11-20 05:50:58', 23),
(1763609995997, 'Prathama Solarconnect Energy Private Limited, Veppankulam Village, karaikudi TK Sivagangai Dt', 'Tamilnadu-630305', '', '', '', '', 'India', 0, '2025-11-20 03:54:30', '2025-11-20 03:54:30', 27),
(1763614021854, 'Colortone Textiles Pvt Ltd.', 'Colortone Textiles Pvt Ltd. Koppal, Kuknoor, Karnataka - 583232', '', 'Koppal', 'Karnataka', '583232', 'India', 0, '2025-12-01 09:11:06', '2025-12-01 09:11:06', 28),
(1763614097268, 'Torrent Urja 22 PVT LTD ', 'Phoenix Mill solar PV Plant', 'Ullendrupet , Tamil Nadu.', 'Kallakurichi', 'Tamil Nadu', '606107', 'India', 0, '2025-12-01 09:11:06', '2025-12-01 09:11:06', 28),
(1763622496307, 'Prathama Solarconnect Energy Pvt Ltd Veppankullam Village, ', 'Sivagangai District, Tamil Nadu', '', '', '', '', 'India', 0, '2025-11-20 07:08:52', '2025-11-20 07:08:52', 12),
(1763638507469, 'Torrent Urja 14 Pvt Ltd', '', '', 'Tuticorin', 'Tamilnadu', '628401', 'India', 0, '2025-12-15 10:05:28', '2025-12-15 10:05:28', 13),
(1763638608635, 'Torrent Saurya Urja 5 Pvt Ltd  Sugen Mega Power Project, National Hignway no 48, Kamrej', 'Surat, Gujarat - 261000 ', '', 'Surat', 'Gujarat', '26100', 'India', 0, '2025-11-20 12:32:03', '2025-11-20 12:32:03', 16),
(1763638917206, 'Survey No: 72/5, 73/4, 74/12, 72/3C others,Ottapidaram', 'Tuticorin,Tamil Nadu - 628401.', '', 'Tuticorin', 'Tamil Nadu', '628401', 'India', 0, '2025-12-15 10:25:56', '2025-12-15 10:25:56', 15),
(1764580174068, 'Torrent Urja 14 Private Limited ', 'Kulasekaranallur village,Sy.no. 699,700 Behind Panchalankurichi Cylon Colony ', 'Taluka - Ottapidaram', 'Thoothukudi', 'Tamilnadu', '628401', 'India', 0, '2025-12-01 09:11:06', '2025-12-01 09:11:06', 28),
(1765780837181, '33.5MWP Welspun Tharad Gujarat', 'Gujarat', '', '', 'Gujarat', '380015', 'India', 0, '2025-12-15 07:13:02', '2025-12-15 07:13:02', 24),
(1765781002125, '15 MW ARS Steel', '', '', ' Ottapidaram', 'Tamil Nadu ', '', 'India', 0, '2025-12-15 07:13:02', '2025-12-15 07:13:02', 24),
(1765781093135, '14 MW ARS Steel', '', '', 'Ottapidaram', 'Tamil Nadu ', '', 'India', 0, '2025-12-15 07:13:02', '2025-12-15 07:13:02', 24),
(1765781095299, 'Torrent Saurya Urja 5 Pvt Ltd', 'Thirumanenjeri Village, Karambakudi Taluk, Pudukkottai district, Tamilnadu., Pudukkottai, Tamil Nadu- 622302', '', 'Pudukkottai', 'Tamil Nadu', '622302', 'India', 0, '2025-12-15 07:13:02', '2025-12-15 07:13:02', 24),
(1765781392649, 'Shree MTK Textiles Private Limited', '', '', 'Aviyur', ' Tamil Nadu', '', 'India', 0, '2025-12-15 07:13:02', '2025-12-15 07:13:02', 24),
(1765781465647, 'Brittania International Bakery Products Ltd', '', '', 'Chennai', 'Tamil Nadu', '', 'India', 0, '2025-12-15 07:13:02', '2025-12-15 07:13:02', 24),
(1765781556323, 'INOX & 33.5MWP Welspun Tharad Gujarat  Gujarat.', '', '', '', ' Gujarat', '', 'India', 0, '2025-12-15 07:13:02', '2025-12-15 07:13:02', 24),
(1765781558942, 'Lucmen Energgy Pvt Ltd', 'Plot No 74, Ramani Flats, 4th Street,  Ashtalakshmi Nagar, West Thambaram,  District : Chennai – 600048.', '', '', '', '600048', 'India', 0, '2025-12-15 07:13:02', '2025-12-15 07:13:02', 24),
(1765781820912, 'Brittania International Bakery Products Ltd', 'Uragadam,Chennai,Tamil Nadu.', '', '', '', '', 'India', 0, '2025-12-15 07:13:02', '2025-12-15 07:13:02', 24),
(1765782042253, 'Bhargavi Renewable Private Limited ', 'Valadar Village, Taluka Tharad Gujarat.', '', '', '', '', 'India', 0, '2025-12-15 07:13:02', '2025-12-15 07:13:02', 24),
(1765782176553, 'Torrent Urja 14 Pvt Ltd ', '14 MW ARS Steel, Ottapidaram, Tamil Nadu  & AM GREEN ENERGY PRIVATE LIMITED Kurnool, Andhra Pradesh ', '', '', '', '518112', 'India', 0, '2025-12-15 07:13:02', '2025-12-15 07:13:02', 24),
(1765782638038, 'Lucmen Energgy Pvt Ltd', 'Plot No 74, Ramani Flats, 4th Street,  Ashtalakshmi Nagar, West Thambaram', '', '', 'Chennai ', '600048', 'India', 0, '2025-12-15 07:13:02', '2025-12-15 07:13:02', 24),
(1765792490842, 'ARS Phase II  ', '', '', '', '', '', 'India', 0, '2025-12-15 10:05:28', '2025-12-15 10:05:28', 13),
(1765792660184, 'Torrent Urja 14 Pvt Ltd & Torrent Urja 17 Pvt Ltd', '', '', '', '', '', 'India', 0, '2025-12-15 10:05:28', '2025-12-15 10:05:28', 13),
(1765793094238, 'Torrent Urja 17 Pvt Ltd', '', '', '', '', '', 'India', 0, '2025-12-15 10:05:28', '2025-12-15 10:05:28', 13),
(1765793985281, '75 MW Solar Plant', '', '', '', '', '', 'India', 0, '2025-12-15 10:23:42', '2025-12-15 10:23:42', 14);

-- --------------------------------------------------------

--
-- Table structure for table `finance_invoices`
--

CREATE TABLE `finance_invoices` (
  `id` bigint(20) NOT NULL,
  `invoice_number` varchar(255) DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `reference` varchar(255) DEFAULT NULL,
  `customer_gstin` varchar(255) DEFAULT NULL,
  `company_gstin` varchar(255) DEFAULT NULL,
  `gst_type` varchar(255) DEFAULT NULL,
  `subtotal` decimal(18,2) DEFAULT NULL,
  `total_tax` decimal(18,2) DEFAULT NULL,
  `total_amount` decimal(18,2) DEFAULT NULL,
  `cgst_amount` decimal(18,2) DEFAULT NULL,
  `sgst_amount` decimal(18,2) DEFAULT NULL,
  `igst_amount` decimal(18,2) DEFAULT NULL,
  `discount_percentage` decimal(18,2) DEFAULT NULL,
  `discount_amount` decimal(18,2) DEFAULT NULL,
  `shipping_charges` decimal(18,2) DEFAULT NULL,
  `other_charges` decimal(18,2) DEFAULT NULL,
  `payment_status` varchar(255) DEFAULT NULL,
  `paid_amount` decimal(18,2) DEFAULT NULL,
  `outstanding_amount` decimal(18,2) DEFAULT NULL,
  `last_payment_date` date DEFAULT NULL,
  `payment_due_date` date DEFAULT NULL,
  `invoice_type` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `terms_and_conditions` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `company_id` bigint(20) DEFAULT NULL,
  `created_by_id` bigint(20) DEFAULT NULL,
  `customer_id` bigint(20) DEFAULT NULL,
  `shipping_address_id` bigint(20) DEFAULT NULL,
  `proforma_invoice_id` bigint(20) DEFAULT NULL,
  `purchase_order_id` bigint(20) DEFAULT NULL,
  `gst_transaction_id` varchar(255) DEFAULT NULL,
  `gstr1_filing_date` date DEFAULT NULL,
  `is_filed_in_gstr1` tinyint(1) DEFAULT NULL,
  `place_of_supply` varchar(255) DEFAULT NULL,
  `reverse_charge_applicable` tinyint(1) DEFAULT NULL,
  `quotation_id` bigint(20) DEFAULT NULL,
  `is_rejected` tinyint(1) DEFAULT NULL,
  `rejected_at` timestamp NULL DEFAULT NULL,
  `rejected_by_id` bigint(20) DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `is_revised` tinyint(1) DEFAULT NULL,
  `revised_at` timestamp NULL DEFAULT NULL,
  `revised_by_id` bigint(20) DEFAULT NULL,
  `revision_count` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `finance_invoices`
--

INSERT INTO `finance_invoices` (`id`, `invoice_number`, `invoice_date`, `due_date`, `reference`, `customer_gstin`, `company_gstin`, `gst_type`, `subtotal`, `total_tax`, `total_amount`, `cgst_amount`, `sgst_amount`, `igst_amount`, `discount_percentage`, `discount_amount`, `shipping_charges`, `other_charges`, `payment_status`, `paid_amount`, `outstanding_amount`, `last_payment_date`, `payment_due_date`, `invoice_type`, `status`, `notes`, `terms_and_conditions`, `created_at`, `updated_at`, `company_id`, `created_by_id`, `customer_id`, `shipping_address_id`, `proforma_invoice_id`, `purchase_order_id`, `gst_transaction_id`, `gstr1_filing_date`, `is_filed_in_gstr1`, `place_of_supply`, `reverse_charge_applicable`, `quotation_id`, `is_rejected`, `rejected_at`, `rejected_by_id`, `rejection_reason`, `is_revised`, `revised_at`, `revised_by_id`, `revision_count`) VALUES
(22, 'BKGE-INV-25-26-001', '2025-09-22', '2025-12-20', '', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 'igst', 980000.00, 176400.00, 1156400.00, 0.00, 0.00, 176400.00, 0.00, 0.00, 0.00, 0.00, 'unpaid', 0.00, 1156400.00, NULL, NULL, 'tax_invoice', 'draft', 'Tax invoice for GST filing', '', '2025-11-20 06:19:10', '2025-11-20 06:19:10', 17, 34, 28, NULL, NULL, 55, '', NULL, 0, '', 0, NULL, 0, NULL, NULL, NULL, 0, NULL, NULL, 0),
(23, 'BKGE-INV-25-26-002', '2025-09-22', '2025-12-20', '', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 'igst', 725210.00, 130537.80, 855747.80, 0.00, 0.00, 130537.80, 0.00, 0.00, 0.00, 0.00, 'unpaid', 0.00, 855747.80, NULL, NULL, 'tax_invoice', 'draft', 'Tax invoice for GST filing', '', '2025-11-20 06:21:41', '2025-11-20 06:21:41', 17, 34, 28, NULL, NULL, 55, '', NULL, 0, '', 0, NULL, 0, NULL, NULL, NULL, 0, NULL, NULL, 0),
(28, 'SEINV006', '2025-11-24', '2025-12-24', '', '24AAHCP3289L1ZY', '', 'exempt', 2421.00, 0.00, 2421.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'unpaid', 0.00, 2421.00, NULL, NULL, 'tax_invoice', 'draft', 'Tax invoice for GST filing', '', '2025-11-24 05:48:43', '2025-11-24 05:48:43', 11, 29, 9, NULL, NULL, 8, '', NULL, 0, '', 0, NULL, 0, NULL, NULL, NULL, 0, NULL, NULL, 0),
(29, 'TCINV002', '2025-11-24', '2025-12-24', '', '24AAHCP3289L1ZY', '33BIHPD1104L1ZS', 'igst', 1989000.00, 358020.00, 2347020.00, 0.00, 0.00, 358020.00, 0.00, 0.00, 0.00, 0.00, 'unpaid', 0.00, 2347020.00, NULL, NULL, 'tax_invoice', 'draft', 'Tax invoice for GST filing', '', '2025-11-24 08:14:21', '2025-11-24 08:14:21', 13, 30, 13, NULL, NULL, 49, '', NULL, 0, '', 0, NULL, 0, NULL, NULL, NULL, 0, NULL, NULL, 0),
(30, 'TCINV003', '2025-11-28', '2025-12-28', '', '24AAICT7384F1Z3', '33BIHPD1104L1ZS', 'igst', 48000.00, 5760.00, 53760.00, 0.00, 0.00, 5760.00, 0.00, 0.00, 0.00, 0.00, 'unpaid', 0.00, 53760.00, NULL, NULL, 'tax_invoice', 'draft', 'Tax invoice for GST filing', 'Payment terms: Net 30 days. GST as applicable. Late payments may incur additional charges.', '2025-11-28 08:45:28', '2025-11-28 08:45:28', 13, 30, 16, NULL, NULL, 58, '', NULL, 0, '', 0, NULL, 0, NULL, NULL, NULL, 0, NULL, NULL, 0),
(31, 'BKGE-INV-25-26-003', '2025-12-01', '2025-12-31', '', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 'igst', 802580.00, 144464.40, 947044.40, 0.00, 0.00, 144464.40, 0.00, 0.00, 0.00, 0.00, 'unpaid', 0.00, 947044.40, NULL, NULL, 'tax_invoice', 'draft', 'Tax invoice for GST filing', 'Payment terms: Net 30 days. GST as applicable. Late payments may incur additional charges.', '2025-12-01 04:09:29', '2025-12-01 04:09:29', 17, 34, 28, NULL, NULL, 61, '', NULL, 0, '', 0, NULL, 0, NULL, NULL, NULL, 0, NULL, NULL, 0),
(32, 'BKGE-INV-25-26-004', '2025-12-02', '2026-01-01', '', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 'igst', 15000.00, 2700.00, 17700.00, 0.00, 0.00, 2700.00, 0.00, 0.00, 0.00, 0.00, 'unpaid', 0.00, 17700.00, NULL, NULL, 'tax_invoice', 'draft', 'Tax invoice for GST filing', 'Payment terms: Net 30 days. GST as applicable. Late payments may incur additional charges.', '2025-12-02 10:29:10', '2025-12-02 10:29:10', 17, 34, 28, NULL, NULL, NULL, '', NULL, 0, '', 0, 44, 0, NULL, NULL, NULL, 0, NULL, NULL, 0),
(33, 'BKGE-INV-25-26-005', '2025-12-02', '2026-01-01', '', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 'igst', 15000.00, 2700.00, 17700.00, 0.00, 0.00, 2700.00, 0.00, 0.00, 0.00, 0.00, 'unpaid', 0.00, 17700.00, NULL, NULL, 'tax_invoice', 'draft', 'Tax invoice for GST filing', 'Payment terms: Net 30 days. GST as applicable. Late payments may incur additional charges.', '2025-12-02 10:29:31', '2025-12-02 10:29:31', 17, 34, 28, NULL, NULL, NULL, '', NULL, 0, '', 0, 44, 0, NULL, NULL, NULL, 0, NULL, NULL, 0),
(34, 'BKGE-INV-25-26-006', '2025-12-02', '2026-01-01', '', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 'igst', 15000.00, 2700.00, 17700.00, 0.00, 0.00, 2700.00, 0.00, 0.00, 0.00, 0.00, 'unpaid', 0.00, 17700.00, NULL, NULL, 'tax_invoice', 'draft', 'Tax invoice for GST filing', 'Payment terms: Net 30 days. GST as applicable. Late payments may incur additional charges.', '2025-12-02 10:30:01', '2025-12-02 10:30:01', 17, 34, 28, NULL, NULL, NULL, '', NULL, 0, '', 0, 44, 0, NULL, NULL, NULL, 0, NULL, NULL, 0),
(35, 'BKGE-INV-25-26-007', '2025-12-02', '2026-01-01', '', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 'igst', 30000.00, 5400.00, 35400.00, 0.00, 0.00, 5400.00, 0.00, 0.00, 0.00, 0.00, 'unpaid', 0.00, 35400.00, NULL, NULL, 'tax_invoice', 'sent', 'Tax invoice for GST filing', 'Payment terms: Net 30 days. GST as applicable. Late payments may incur additional charges.', '2025-12-02 10:31:49', '2025-12-02 10:32:42', 17, 34, 28, NULL, NULL, NULL, '', NULL, 0, '', 0, 45, 0, NULL, NULL, NULL, 0, NULL, NULL, 0),
(36, 'BKGE-INV-25-26-008', '2025-12-02', '2026-01-01', '', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 'igst', 30000.00, 5400.00, 35400.00, 0.00, 0.00, 5400.00, 0.00, 0.00, 0.00, 0.00, 'unpaid', 0.00, 35400.00, NULL, NULL, 'tax_invoice', 'draft', 'Tax invoice for GST filing', 'Payment terms: Net 30 days. GST as applicable. Late payments may incur additional charges.', '2025-12-02 10:33:46', '2025-12-02 10:33:46', 17, 34, 28, NULL, NULL, NULL, '', NULL, 0, '', 0, 45, 0, NULL, NULL, NULL, 0, NULL, NULL, 0),
(37, 'BKGE-INV-25-26-009', '2025-12-02', '2026-01-01', '', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 'igst', 30000.00, 5400.00, 35400.00, 0.00, 0.00, 5400.00, 0.00, 0.00, 0.00, 0.00, 'unpaid', 0.00, 35400.00, NULL, NULL, 'tax_invoice', 'sent', 'Tax invoice for GST filing', 'Payment terms: Net 30 days. GST as applicable. Late payments may incur additional charges.', '2025-12-02 13:11:37', '2025-12-02 13:12:55', 17, 34, 28, NULL, NULL, NULL, '', NULL, 0, '', 0, 47, 0, NULL, NULL, NULL, 0, NULL, NULL, 0),
(38, 'BKGE-INV-25-26-010', '2025-12-02', '2026-01-01', '', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 'igst', 30000.00, 5400.00, 35400.00, 0.00, 0.00, 5400.00, 0.00, 0.00, 0.00, 0.00, 'unpaid', 0.00, 35400.00, NULL, NULL, 'tax_invoice', 'sent', 'Tax invoice for GST filing', 'Payment terms: Net 30 days. GST as applicable. Late payments may incur additional charges.', '2025-12-02 13:11:58', '2025-12-02 13:12:24', 17, 34, 28, NULL, NULL, NULL, '', NULL, 0, '', 0, 47, 0, NULL, NULL, NULL, 0, NULL, NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `finance_payments`
--

CREATE TABLE `finance_payments` (
  `id` bigint(20) NOT NULL,
  `payment_number` varchar(255) DEFAULT NULL,
  `payment_date` date DEFAULT NULL,
  `amount` decimal(18,2) DEFAULT NULL,
  `payment_method` varchar(255) DEFAULT NULL,
  `tds_amount` decimal(18,2) DEFAULT NULL,
  `tds_percentage` decimal(18,2) DEFAULT NULL,
  `tds_section` varchar(255) DEFAULT NULL,
  `net_amount_received` decimal(18,2) DEFAULT NULL,
  `tds_certificate_number` varchar(255) DEFAULT NULL,
  `tds_certificate_date` date DEFAULT NULL,
  `is_tds_received` tinyint(1) DEFAULT NULL,
  `reference_number` varchar(255) DEFAULT NULL,
  `transaction_id` varchar(255) DEFAULT NULL,
  `bank_name` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `company_id` bigint(20) DEFAULT NULL,
  `created_by_id` bigint(20) DEFAULT NULL,
  `customer_id` bigint(20) DEFAULT NULL,
  `invoice_id` bigint(20) DEFAULT NULL,
  `proforma_invoice_id` bigint(20) DEFAULT NULL,
  `purchase_order_id` bigint(20) DEFAULT NULL,
  `form16a_number` varchar(255) DEFAULT NULL,
  `tds_certificate_issued` tinyint(1) DEFAULT NULL,
  `tds_challan_number` varchar(255) DEFAULT NULL,
  `tds_deposited_date` date DEFAULT NULL,
  `tds_rate_applied` decimal(18,2) DEFAULT NULL,
  `tds_section_code` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `finance_purchase_orders`
--

CREATE TABLE `finance_purchase_orders` (
  `id` bigint(20) NOT NULL,
  `po_number` varchar(255) DEFAULT NULL,
  `po_date` date DEFAULT NULL,
  `po_file` varchar(255) DEFAULT NULL,
  `internal_po_number` varchar(255) DEFAULT NULL,
  `quotation_date` date DEFAULT NULL,
  `valid_until` date DEFAULT NULL,
  `reference` varchar(255) DEFAULT NULL,
  `gst_type` varchar(255) DEFAULT NULL,
  `customer_gstin` varchar(255) DEFAULT NULL,
  `company_gstin` varchar(255) DEFAULT NULL,
  `subtotal` decimal(18,2) DEFAULT NULL,
  `total_tax` decimal(18,2) DEFAULT NULL,
  `total_amount` decimal(18,2) DEFAULT NULL,
  `cgst_amount` decimal(18,2) DEFAULT NULL,
  `sgst_amount` decimal(18,2) DEFAULT NULL,
  `igst_amount` decimal(18,2) DEFAULT NULL,
  `discount_percentage` decimal(18,2) DEFAULT NULL,
  `discount_amount` decimal(18,2) DEFAULT NULL,
  `shipping_charges` decimal(18,2) DEFAULT NULL,
  `other_charges` decimal(18,2) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `terms_and_conditions` text DEFAULT NULL,
  `claim_type` varchar(255) DEFAULT NULL,
  `proforma_claimed_amount` decimal(18,2) DEFAULT NULL,
  `invoice_claimed_amount` decimal(18,2) DEFAULT NULL,
  `remaining_proforma_balance` decimal(18,2) DEFAULT NULL,
  `remaining_invoice_balance` decimal(18,2) DEFAULT NULL,
  `proforma_status` varchar(255) DEFAULT NULL,
  `invoice_status` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `company_id` bigint(20) DEFAULT NULL,
  `created_by_id` bigint(20) DEFAULT NULL,
  `customer_id` bigint(20) DEFAULT NULL,
  `shipping_address_id` bigint(20) DEFAULT NULL,
  `quotation_id` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `finance_purchase_orders`
--

INSERT INTO `finance_purchase_orders` (`id`, `po_number`, `po_date`, `po_file`, `internal_po_number`, `quotation_date`, `valid_until`, `reference`, `gst_type`, `customer_gstin`, `company_gstin`, `subtotal`, `total_tax`, `total_amount`, `cgst_amount`, `sgst_amount`, `igst_amount`, `discount_percentage`, `discount_amount`, `shipping_charges`, `other_charges`, `status`, `notes`, `terms_and_conditions`, `claim_type`, `proforma_claimed_amount`, `invoice_claimed_amount`, `remaining_proforma_balance`, `remaining_invoice_balance`, `proforma_status`, `invoice_status`, `created_at`, `updated_at`, `company_id`, `created_by_id`, `customer_id`, `shipping_address_id`, `quotation_id`) VALUES
(8, 'PGEL/ 24-25/ 4784', '2025-05-22', '', 'SEPOU001', '2025-05-22', '2025-06-18', '', 'exempt', '24AAHCP3289L1ZY', '', 2421.00, 0.00, 2421.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'completed', '', '', 'percentage', 0.00, 2421.00, 0.00, 0.00, 'not_started', 'completed', '2025-11-18 16:00:40', '2025-11-24 05:33:29', 11, 29, 9, NULL, NULL),
(9, 'PGEL/25-26/2457', '2025-06-07', '', 'SEPOU002', '2025-11-19', '2025-12-19', '', 'exempt', '24AAHCP3289L1ZY', '', 6100.00, 0.00, 6100.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 02:03:25', '2025-11-20 05:50:33', 11, 29, 9, NULL, NULL),
(10, 'PGEL/24-25/5565', '2025-06-26', '', 'SEPOU003', '2025-11-19', '2025-12-19', '', 'exempt', '24AAHCP3289L1ZY', '', 97000.00, 0.00, 97000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 02:05:35', '2025-11-19 02:05:35', 11, 29, 9, NULL, NULL),
(11, 'PGEL/25-26/748', '2025-06-26', '', 'SEPOU004', '2025-11-19', '2025-12-19', '', 'exempt', '24AAHCP3289L1ZY', '', 97000.00, 0.00, 97000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 02:07:37', '2025-11-20 05:50:12', 11, 29, 9, NULL, NULL),
(12, 'PGEL/25-26/4232', '2025-09-13', '', 'SEPOU005', '2025-11-19', '2025-12-19', '', 'exempt', '24AAHCP3289L1ZY', '', 30000.00, 0.00, 30000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 02:11:14', '2025-11-20 05:49:59', 11, 29, 9, NULL, NULL),
(13, 'PGEL/25-26/5153', '2025-11-08', '', 'SEPOU006', '2025-11-19', '2025-12-19', '', 'exempt', '24AAHCP3289L1ZY', '', 25850.00, 0.00, 25850.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 02:15:56', '2025-11-19 02:15:56', 11, 29, 9, NULL, NULL),
(14, 'PGEL/ 24-25/ 4784', '2025-05-22', '', 'SEPOU007', '2025-11-19', '2025-12-19', '', 'exempt', '24AAHCP3289L1ZY', '', 2421.00, 0.00, 2421.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 02:23:33', '2025-11-20 05:56:54', 11, 29, 9, NULL, NULL),
(15, 'PGEL/24-25/1150', '2024-06-20', 'po_files/PGEL-PO-2425-1150_1.pdf', 'BKCPOU001', NULL, NULL, '', 'cgst_sgst', '33AAHCS2941J1ZB', '33JJFPK6756J1ZP', 1200000.00, 216000.00, 1416000.00, 108000.00, 108000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 06:31:16', '2025-11-19 06:31:16', 14, 31, 23, NULL, NULL),
(16, 'PGEL/24-25/199', '2024-04-27', 'po_files/Purchase_Order_PGEL_PO_24-25_199_-_YbJ96jh.pdf', 'BKCPOU002', NULL, NULL, '', 'cgst_sgst', '33AAHCS2941J1ZB', '33JJFPK6756J1ZP', 3278075.00, 590053.50, 3868128.50, 295026.75, 295026.75, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 07:04:30', '2025-11-19 07:07:36', 14, 31, 23, NULL, NULL),
(17, 'PGEL/24-25/385', '2024-05-10', 'po_files/Purchase_Order_PGEL_PO_24-25_385_-_B_K_Construction.pdf', 'BKCPOU003', NULL, NULL, '', 'cgst_sgst', '33AAHCS2941J1ZB', '33JJFPK6756J1ZP', 415000.00, 74700.00, 489700.00, 37350.00, 37350.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 07:07:18', '2025-11-19 07:07:18', 14, 31, 23, NULL, NULL),
(18, 'PGEL/24-25/5,115', '2025-08-05', 'po_files/Purchase_Order_PGEL_PO_24-25_5115_-_B_K_Constructions.pdf', 'BKCPOU004', NULL, NULL, '', 'cgst_sgst', '33AAHCS2941J1ZB', '33JJFPK6756J1ZP', 250000.00, 45000.00, 295000.00, 22500.00, 22500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 07:10:37', '2025-11-19 07:10:37', 14, 31, 23, NULL, NULL),
(20, 'PGEL/24-25/386', '2024-05-10', '', 'BKCPOU006', NULL, NULL, '', 'cgst_sgst', '33AAHCS2941J1ZB', '33JJFPK6756J1ZP', 550000.00, 99000.00, 649000.00, 49500.00, 49500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 08:44:46', '2025-11-19 08:44:46', 14, 31, 23, NULL, NULL),
(21, 'PGEL/24-25/1172', '2025-04-01', 'po_files/Purchase_Order_PGEL_PO_24-25_1172_R1_-_B_K_Constructions_1_rzzyxWr.pdf', 'BKCPOU007', NULL, NULL, '', 'cgst_sgst', '33AAHCS2941J1ZB', '33JJFPK6756J1ZP', 1250000.00, 225000.00, 1475000.00, 112500.00, 112500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 08:46:14', '2025-11-19 08:59:08', 14, 31, 23, NULL, NULL),
(22, 'PGEL/24-25/200', '2024-04-27', 'po_files/Purchase_Order_PGEL_PO_24-25_200_Parvathi_Dyeing_Pvt_Ltd_1_6TOZtp4.pdf', 'BKCPOU008', NULL, NULL, '', 'cgst_sgst', '33AAHCS2941J1ZB', '33JJFPK6756J1ZP', 2430515.00, 437492.70, 2868007.70, 218746.35, 218746.35, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 09:20:12', '2025-11-19 09:20:12', 14, 31, 23, NULL, NULL),
(23, 'PGEL/25-26/3473', '2025-07-15', 'po_files/3473_-_B_K_Constructions_-_15.07.2025_-_SPV_PROZEAL.pdf', 'BKCPOU009', NULL, NULL, '', 'cgst_sgst', '33AAHCS2941J1ZB', '33JJFPK6756J1ZP', 165750.00, 29835.00, 195585.00, 14917.50, 14917.50, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 09:22:02', '2025-11-19 09:22:02', 14, 31, 23, NULL, NULL),
(24, 'PGEL/24-25/5219', '2025-02-26', 'po_files/Supply_Order_Item_V1_B_mM3UMFy.K_Construction.pdf', 'BKCPOU010', NULL, NULL, '', 'cgst_sgst', '33AAHCS2941J1ZB', '33JJFPK6756J1ZP', 6199600.00, 1115928.00, 7315528.00, 557964.00, 557964.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 09:26:36', '2025-11-19 09:29:38', 14, 31, 23, NULL, NULL),
(25, 'PGEL/24-25/1171', '2024-06-20', 'po_files/PGEL-PO-2425-1171_C804xFS.pdf', 'BKCPOU011', NULL, NULL, '', 'cgst_sgst', '33AAHCS2941J1ZB', '33JJFPK6756J1ZP', 1150000.00, 207000.00, 1357000.00, 103500.00, 103500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 09:31:50', '2025-11-19 09:34:27', 14, 31, 23, NULL, NULL),
(26, 'PGEL/24-25/388', '2024-05-10', 'po_files/Purchase_Order_PGEL_PO_24-25_388_-_B_K_Construction.pdf', 'BKCPOU012', NULL, NULL, '', 'cgst_sgst', '33AAHCS2941J1ZB', '33JJFPK6756J1ZP', 415000.00, 74700.00, 489700.00, 37350.00, 37350.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 09:32:58', '2025-11-19 09:32:58', 14, 31, 23, NULL, NULL),
(27, 'PGEL/24-25/1149', '2024-06-20', 'po_files/PGEL-PO-2425-1149.pdf', 'BKCPOU013', NULL, NULL, '', 'cgst_sgst', '33AAHCS2941J1ZB', '33JJFPK6756J1ZP', 1150000.00, 207000.00, 1357000.00, 103500.00, 103500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 09:36:15', '2025-11-19 09:36:15', 14, 31, 23, NULL, NULL),
(28, 'PGEL/24-25/384', '2024-05-10', 'po_files/Purchase_Order_PGEL_PO_24-25_384_-_B_K_Construction.pdf', 'BKCPOU014', NULL, NULL, '', 'cgst_sgst', '33AAHCS2941J1ZB', '33JJFPK6756J1ZP', 415000.00, 74700.00, 489700.00, 37350.00, 37350.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 09:37:19', '2025-11-19 09:37:19', 14, 31, 23, NULL, NULL),
(29, 'PGEL/24-25/1170', '2024-06-20', 'po_files/PGEL-PO-2425-1170.pdf', 'BKCPOU015', NULL, NULL, '', 'cgst_sgst', '33AAHCS2941J1ZB', '33JJFPK6756J1ZP', 1150000.00, 207000.00, 1357000.00, 103500.00, 103500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 09:39:53', '2025-11-19 09:39:53', 14, 31, 23, NULL, NULL),
(30, 'PGEL/24-25/201', '2024-04-27', 'po_files/Purchase_Order_PGEL_PO_24-25_201_-_B_K_Constr.pdf', 'BKCPOU016', NULL, NULL, '', 'cgst_sgst', '33AAHCS2941J1ZB', '33JJFPK6756J1ZP', 2062070.00, 371172.60, 2433242.60, 185586.30, 185586.30, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 09:42:25', '2025-11-19 09:42:25', 14, 31, 23, NULL, NULL),
(31, 'PGEL/24-25/387', '2024-05-10', 'po_files/Purchase_Order_PGEL_PO_24-25_387_-_B_K_Construction.pdf', 'BKCPOU017', NULL, NULL, '', 'cgst_sgst', '33AAHCS2941J1ZB', '33JJFPK6756J1ZP', 415000.00, 74700.00, 489700.00, 37350.00, 37350.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 09:43:45', '2025-11-19 09:43:45', 14, 31, 23, NULL, NULL),
(32, 'PGEL/24-25/5591', '2025-03-26', 'po_files/Purchase_Order_PGEL_PO_24-25_5591_-_B_K_Constructions.pdf', 'BKCPOU018', NULL, NULL, '', 'cgst_sgst', '33AAHCS2941J1ZB', '33JJFPK6756J1ZP', 110880.00, 19958.40, 130838.40, 9979.20, 9979.20, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 09:44:49', '2025-11-19 09:44:49', 14, 31, 23, NULL, NULL),
(33, 'PGEL/24-25/5100', '2025-11-19', 'po_files/PGEL-24-25-5100.pdf', 'BKCPOU019', NULL, NULL, '', 'cgst_sgst', '33AAHCS2941J1ZB', '33JJFPK6756J1ZP', 1333400.00, 240012.00, 1573412.00, 120006.00, 120006.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 09:47:12', '2025-11-19 09:47:12', 14, 31, 23, NULL, NULL),
(34, 'PGEL/24-25/5101', '2025-02-20', 'po_files/PGEL-24-25-5101_4ltRobQ.pdf', 'BKCPOU020', NULL, NULL, '', 'cgst_sgst', '33AAHCS2941J1ZB', '33JJFPK6756J1ZP', 47520.00, 8553.60, 56073.60, 4276.80, 4276.80, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 09:48:37', '2025-11-19 09:49:40', 14, 31, 23, NULL, NULL),
(35, 'PGEL/25-26/2200', '2025-05-30', 'po_files/2200_-_B_K_Constructions_-_30.05.2025_-_OTTAPIDARAM_33KV_TL.pdf', 'BKCPOU021', NULL, NULL, '', 'cgst_sgst', '33AAHCS2941J1ZB', '33JJFPK6756J1ZP', 900000.00, 162000.00, 1062000.00, 81000.00, 81000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 09:52:15', '2025-11-19 09:52:15', 14, 31, 23, NULL, NULL),
(36, 'PGEL/24-25/5185', '2025-02-24', 'po_files/5185.pdf', 'BKCPOU022', NULL, NULL, '', 'igst', '24AAHCP3289L1ZY', '33JJFPK6756J1ZP', 3050000.00, 549000.00, 3599000.00, 0.00, 0.00, 549000.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 3050000.00, 3599000.00, 'not_started', 'not_started', '2025-11-19 09:54:07', '2025-12-01 04:14:00', 14, 31, 23, 1763463869618, NULL),
(37, 'PGEL/24-25/4110', '2024-12-20', 'po_files/3144_4w0OFe4.pdf', 'BKCPOU023', NULL, NULL, '', 'igst', '24AAHCP3289L1ZY', '33JJFPK6756J1ZP', 1200000.00, 216000.00, 1416000.00, 0.00, 0.00, 216000.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 1200000.00, 1416000.00, 'not_started', 'not_started', '2025-11-19 09:56:34', '2025-12-01 05:16:29', 14, 31, 23, 1763463651761, NULL),
(38, 'PGEL/24-25/3144', '2024-10-21', 'po_files/3144_mAlFKVq.pdf', 'BKCPOU024', NULL, NULL, '', 'cgst_sgst', '33AAHCS2941J1ZB', '33JJFPK6756J1ZP', 7800000.00, 1404000.00, 9204000.00, 702000.00, 702000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', NULL, 0.00, 1840800.00, 6240000.00, 7363200.00, 'not_started', 'partial', '2025-11-19 12:23:12', '2025-11-19 12:24:43', 14, 31, 23, NULL, NULL),
(39, 'PGEL/25-26/2963', '2025-06-19', 'po_files/Bk_Construction__Extra___Work_3.pdf', 'BKCPOU025', NULL, NULL, '', 'cgst_sgst', '33AAHCS2941J1ZB', '33JJFPK6756J1ZP', 2000000.00, 360000.00, 2360000.00, 180000.00, 180000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 12:26:35', '2025-11-19 12:26:35', 14, 31, 23, NULL, NULL),
(40, 'PGEL/24-25/2406', '2024-09-09', 'po_files/Supply_Order_Item_1_T74dsji.pdf', 'BKCPOU026', NULL, NULL, '', 'cgst_sgst', '33AAHCS2941J1ZB', '33JJFPK6756J1ZP', 1800000.00, 324000.00, 2124000.00, 162000.00, 162000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 12:27:37', '2025-11-19 12:28:00', 14, 31, 23, NULL, NULL),
(41, 'PGEL/24-25/4232', '2025-11-19', 'po_files/Supply_Order_Item_V2_Extra_Work_2_lPUGHXW.pdf', 'BKCPOU027', NULL, NULL, '', 'cgst_sgst', '33AAHCS2941J1ZB', '33JJFPK6756J1ZP', 1461675.00, 263101.50, 1724776.50, 131550.75, 131550.75, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 12:31:45', '2025-11-19 12:34:09', 14, 31, 23, NULL, NULL),
(45, 'PGEL/24-25/4575', '2025-01-17', '', 'ASPOU004', NULL, NULL, '', 'igst', '24AAHCP3289L1ZY', '33RZHPS7692D1ZJ', 57000.00, 10260.00, 67260.00, 0.00, 0.00, 10260.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 17:08:30', '2025-11-19 17:08:30', 15, 32, 24, NULL, NULL),
(46, 'PGEL/25-26/2696', '2025-06-11', '', 'ASPOU005', NULL, NULL, '', 'igst', '24AAHCP3289L1ZY', '33RZHPS7692D1ZJ', 64000.00, 11520.00, 75520.00, 0.00, 0.00, 11520.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 17:13:14', '2025-11-19 17:13:14', 15, 32, 24, NULL, NULL),
(47, 'PGEL/25-26/2697', '2025-06-11', '', 'ASPOU006', NULL, NULL, '', 'igst', '24AAHCP3289L1ZY', '33RZHPS7692D1ZJ', 64000.00, 11520.00, 75520.00, 0.00, 0.00, 11520.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 17:20:36', '2025-11-19 17:20:36', 15, 32, 24, NULL, NULL),
(48, 'PGEL/25-26/2744', '2025-06-12', '', 'ASPOU007', NULL, NULL, '', 'igst', '24AAHCP3289L1ZY', '33RZHPS7692D1ZJ', 37297.00, 6713.46, 44010.46, 0.00, 0.00, 6713.46, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-19 17:22:51', '2025-11-19 17:22:51', 15, 32, 24, NULL, NULL),
(49, 'PGEL/24-25/649', '2025-03-24', '', 'TCPOU001', NULL, NULL, '', 'igst', '24AAHCP3289L1ZY', '33BIHPD1104L1ZS', 1989000.00, 358020.00, 2347020.00, 0.00, 0.00, 358020.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', 'percentage', 0.00, 2347020.00, 0.00, 0.00, 'not_started', 'completed', '2025-11-20 01:43:41', '2025-11-24 08:13:24', 13, 30, 13, NULL, NULL),
(50, 'PGEL/25-26/4234', '2025-09-13', '', 'TCPOU002', NULL, NULL, '', 'igst', '24AAHCP3289L1ZY', '33BIHPD1104L1ZS', 60000.00, 10800.00, 70800.00, 0.00, 0.00, 10800.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-20 01:50:35', '2025-11-20 01:50:35', 13, 30, 13, NULL, NULL),
(51, '9100002088', '2025-10-07', '', 'TCPOU003', NULL, NULL, '', 'igst', '24AAICT7384F1Z3', '33BIHPD1104L1ZS', 48000.00, 5760.00, 53760.00, 0.00, 0.00, 5760.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-20 01:52:48', '2025-11-20 01:52:48', 13, 30, 16, NULL, NULL),
(52, '530000231', '2025-11-12', '', 'TCPOU004', NULL, NULL, '', 'cgst_sgst', '33AAKCP3080G1ZI', '33BIHPD1104L1ZS', 82036.00, 9844.32, 91880.32, 4922.16, 4922.16, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-20 01:54:20', '2025-11-20 01:54:20', 13, 30, 14, NULL, NULL),
(53, 'SE-001-2526', '2025-04-22', '', 'SEPOU008', NULL, NULL, '', 'exempt', '33CTQPM7467J1ZX', '', 143000.00, 0.00, 143000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-20 05:06:49', '2025-11-20 05:06:49', 11, 29, 10, NULL, NULL),
(54, 'SE-002-2526', '2025-05-13', '', 'SEPOU009', NULL, NULL, '', 'exempt', '24AAHCP3289L1ZY', '', 6100.00, 0.00, 6100.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-20 05:08:43', '2025-11-20 07:16:35', 11, 29, 9, 1763462740501, NULL),
(55, 'PGEL/25-26/4096', '2025-08-13', 'po_files/4096_-_BK_GREEN_ENERGY_-_Colortone_Textiles_Pvt_Ltd.pdf', 'BKGEPOU001', NULL, NULL, '', 'igst', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 15135991.17, 2724478.41, 17860469.58, 0.00, 0.00, 2724478.41, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', 'quantity', 0.00, 2012147.80, 13430781.17, 15848321.78, 'not_started', 'partial', '2025-11-20 05:08:54', '2025-11-20 07:28:33', 17, 34, 28, NULL, NULL),
(56, 'PGEL/25-26/3955', '2025-08-13', 'po_files/3955_-_BK_GREEN_ENERGY_-_13.08.2025_-_TU22_PHENIX_18MW_24_1.pdf', 'BKGEPOU002', NULL, NULL, '', 'igst', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 15300000.00, 2754000.00, 18054000.00, 0.00, 0.00, 2754000.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-20 05:28:15', '2025-11-20 07:29:29', 17, 34, 28, NULL, NULL),
(57, 'PGEL/25-26/4537', '2025-09-19', 'po_files/BK_GREEN_ENERGY_-_4537_-_Material_Sifting_-_Signed_Copy.pdf', 'BKGE-PO-25-26-001', NULL, NULL, '', 'igst', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 448810.00, 80785.80, 529595.80, 0.00, 0.00, 80785.80, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 0.00, 0.00, 'not_started', 'not_started', '2025-11-20 07:11:22', '2025-11-20 07:11:22', 17, 34, 28, NULL, NULL),
(58, '3130042470', '2025-11-20', '', 'TCPOU005', NULL, NULL, '', 'igst', '24AAICT7384F1Z3', '33BIHPD1104L1ZS', 48000.00, 5760.00, 53760.00, 0.00, 0.00, 5760.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', 'percentage', 0.00, 53760.00, 0.00, 0.00, 'not_started', 'completed', '2025-11-20 11:14:57', '2025-11-20 11:14:57', 13, 30, 16, NULL, NULL),
(59, 'PGEL/25-26/4233', '2025-09-13', '', 'TCPOU006', NULL, NULL, '', 'igst', '24AAHCP3289L1ZY', '33BIHPD1104L1ZS', 60000.00, 10800.00, 70800.00, 0.00, 0.00, 10800.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', NULL, 0.00, 70800.00, 0.00, 0.00, 'not_started', 'completed', '2025-11-20 12:42:48', '2025-11-20 12:42:48', 13, 30, 13, NULL, NULL),
(61, '987456', '2025-12-01', 'po_files/8.5_MW_lakshmi_mills_measurement_sheet_-_RA_01_2_1_1.pdf', 'BKGE-PO-25-26-002', '2025-12-01', '2025-12-31', '', 'igst', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 833560.00, 150040.80, 983600.80, 0.00, 0.00, 150040.80, 0.00, 0.00, 0.00, 0.00, 'draft', '', 'Advance payment 50%', 'percentage', 0.00, 947044.40, 30980.00, 36556.40, 'not_started', 'partial', '2025-12-01 04:08:44', '2025-12-01 04:08:44', 17, 34, 28, NULL, 36),
(62, 'BKGE-PO-25-26-007', '2025-12-01', '', 'BKGE-PO-25-26-003', '2025-11-29', '2025-12-31', '', 'igst', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 448810.00, 80785.80, 529595.80, 0.00, 0.00, 80785.80, 0.00, 0.00, 0.00, 0.00, 'draft', 'Notes', 'Payment Terms & Conditions: Properties:', '', 0.00, 0.00, 448810.00, 529595.80, 'not_started', 'not_started', '2025-12-02 08:34:26', '2025-12-02 08:34:26', 17, 34, 28, NULL, 42),
(63, 'PGEL/25-26/4232', '2025-12-02', '', 'BKGE-PO-25-26-004', '2025-12-01', '2025-12-31', '', 'igst', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 3148960.00, 566812.80, 3715772.80, 0.00, 0.00, 566812.80, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 3148960.00, 3715772.80, 'not_started', 'not_started', '2025-12-02 10:26:35', '2025-12-02 10:26:35', 17, 34, 28, 1764580174068, 41),
(64, 'PGEL/25-26/4238', '2025-12-02', '', 'BKGE-PO-25-26-005', '2025-11-30', '2026-01-01', '', 'igst', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 263505.00, 47430.90, 310935.90, 0.00, 0.00, 47430.90, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', '', 0.00, 0.00, 263505.00, 310935.90, 'not_started', 'not_started', '2025-12-02 11:44:57', '2025-12-02 11:44:57', 17, 34, 28, 1763614097268, 46);

-- --------------------------------------------------------

--
-- Table structure for table `finance_quotations`
--

CREATE TABLE `finance_quotations` (
  `id` bigint(20) NOT NULL,
  `quotation_number` varchar(255) DEFAULT NULL,
  `quotation_date` date DEFAULT NULL,
  `valid_until` date DEFAULT NULL,
  `reference` varchar(255) DEFAULT NULL,
  `gst_type` varchar(255) DEFAULT NULL,
  `customer_gstin` varchar(255) DEFAULT NULL,
  `company_gstin` varchar(255) DEFAULT NULL,
  `subtotal` decimal(18,2) DEFAULT NULL,
  `total_tax` decimal(18,2) DEFAULT NULL,
  `total_amount` decimal(18,2) DEFAULT NULL,
  `cgst_amount` decimal(18,2) DEFAULT NULL,
  `sgst_amount` decimal(18,2) DEFAULT NULL,
  `igst_amount` decimal(18,2) DEFAULT NULL,
  `discount_percentage` decimal(18,2) DEFAULT NULL,
  `discount_amount` decimal(18,2) DEFAULT NULL,
  `shipping_charges` decimal(18,2) DEFAULT NULL,
  `other_charges` decimal(18,2) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `terms_and_conditions` text DEFAULT NULL,
  `is_revised` tinyint(1) DEFAULT NULL,
  `revision_count` int(11) DEFAULT NULL,
  `revised_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `company_id` bigint(20) DEFAULT NULL,
  `created_by_id` bigint(20) DEFAULT NULL,
  `customer_id` bigint(20) DEFAULT NULL,
  `revised_by_id` bigint(20) DEFAULT NULL,
  `shipping_address_id` bigint(20) DEFAULT NULL,
  `invoice_created` tinyint(1) DEFAULT NULL,
  `invoice_created_at` timestamp NULL DEFAULT NULL,
  `po_created` tinyint(1) DEFAULT NULL,
  `po_created_at` timestamp NULL DEFAULT NULL,
  `claim_type` varchar(255) DEFAULT NULL,
  `invoice_claimed_amount` decimal(18,2) DEFAULT NULL,
  `proforma_claimed_amount` decimal(18,2) DEFAULT NULL,
  `remaining_invoice_balance` decimal(18,2) DEFAULT NULL,
  `remaining_proforma_balance` decimal(18,2) DEFAULT NULL,
  `proforma_created` tinyint(1) DEFAULT NULL,
  `is_rejected` tinyint(1) DEFAULT NULL,
  `rejected_at` timestamp NULL DEFAULT NULL,
  `rejected_by_id` bigint(20) DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `finance_quotations`
--

INSERT INTO `finance_quotations` (`id`, `quotation_number`, `quotation_date`, `valid_until`, `reference`, `gst_type`, `customer_gstin`, `company_gstin`, `subtotal`, `total_tax`, `total_amount`, `cgst_amount`, `sgst_amount`, `igst_amount`, `discount_percentage`, `discount_amount`, `shipping_charges`, `other_charges`, `status`, `notes`, `terms_and_conditions`, `is_revised`, `revision_count`, `revised_at`, `created_at`, `updated_at`, `company_id`, `created_by_id`, `customer_id`, `revised_by_id`, `shipping_address_id`, `invoice_created`, `invoice_created_at`, `po_created`, `po_created_at`, `claim_type`, `invoice_claimed_amount`, `proforma_claimed_amount`, `remaining_invoice_balance`, `remaining_proforma_balance`, `proforma_created`, `is_rejected`, `rejected_at`, `rejected_by_id`, `rejection_reason`) VALUES
(26, 'SEQUO013', '2025-05-10', '2025-06-10', '', 'exempt', '24AAHCP3289L1ZY', '', 6100.00, 0.00, 6100.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', 0, 0, NULL, '2025-11-18 13:06:02', '2025-11-18 13:06:02', 11, 29, 9, NULL, 1763462740501, 0, NULL, 0, NULL, NULL, 0.00, 0.00, 0.00, 0.00, 0, 0, NULL, NULL, NULL),
(27, 'SEQUO014', '2025-07-18', '2025-08-18', '', 'exempt', '24AAHCP3289L1ZY', '', 97000.00, 0.00, 97000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', 0, 0, NULL, '2025-11-18 13:09:04', '2025-11-18 13:10:51', 11, 29, 9, NULL, 1763462740501, 0, NULL, 0, NULL, NULL, 0.00, 0.00, 0.00, 0.00, 0, 0, NULL, NULL, NULL),
(28, 'SEQUO015', '2025-06-23', '2025-06-23', '', 'exempt', '24AAHCP3289L1ZY', '', 30000.00, 0.00, 30000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', 0, 0, NULL, '2025-11-18 13:10:38', '2025-11-18 13:10:38', 11, 29, 9, NULL, 1763462740501, 0, NULL, 0, NULL, NULL, 0.00, 0.00, 0.00, 0.00, 0, 0, NULL, NULL, NULL),
(29, 'SEQUO016', '2025-07-09', '2025-08-09', '', 'exempt', '33ABCPT7999Q1ZG', '', 9243.00, 0.00, 9243.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', 0, 0, NULL, '2025-11-18 13:12:41', '2025-11-18 13:12:41', 11, 29, 11, NULL, NULL, 0, NULL, 0, NULL, NULL, 0.00, 0.00, 0.00, 0.00, 0, 0, NULL, NULL, NULL),
(30, 'SEQUO017', '2025-07-28', '2025-07-28', '', 'exempt', '33AAAFD0525H1Z4', '', 120000.00, 0.00, 120000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', 0, 0, NULL, '2025-11-18 13:19:19', '2025-11-18 13:19:19', 11, 29, 12, NULL, NULL, 0, NULL, 0, NULL, NULL, 0.00, 0.00, 0.00, 0.00, 0, 0, NULL, NULL, NULL),
(31, 'SEQUO018', '2025-09-03', '2025-10-09', '', 'exempt', '33ABCPT7999Q1ZG', '', 76015.80, 0.00, 76015.80, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', 0, 0, NULL, '2025-11-18 13:21:21', '2025-11-18 13:21:21', 11, 29, 11, NULL, NULL, 0, NULL, 0, NULL, NULL, 0.00, 0.00, 0.00, 0.00, 0, 0, NULL, NULL, NULL),
(32, 'SEQUO019', '2025-11-03', '2025-12-03', '', 'exempt', '24AAHCP3289L1ZY', '', 25850.00, 0.00, 25850.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', 0, 0, NULL, '2025-11-18 13:30:59', '2025-11-20 07:06:38', 11, 29, 9, NULL, 1763462740501, 0, NULL, 0, NULL, NULL, 0.00, 0.00, 0.00, 0.00, 0, 0, NULL, NULL, NULL),
(33, 'TCQUO001', '2025-02-07', '2025-12-20', '', 'igst', '24AAHCP3289L1ZY', '33BIHPD1104L1ZS', 30000.00, 5400.00, 35400.00, 0.00, 0.00, 5400.00, 0.00, 0.00, 0.00, 0.00, 'sent', '', '', 0, 0, NULL, '2025-11-20 10:11:10', '2025-11-24 08:30:17', 13, 30, 13, NULL, NULL, 0, NULL, 1, '2025-11-24 08:28:27', NULL, 0.00, 0.00, 35400.00, 30000.00, 0, 0, NULL, NULL, NULL),
(34, 'BKGE-QT-25-26-001', '2025-11-26', '2025-12-26', '', 'igst', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 409090.00, 73636.20, 482726.20, 0.00, 0.00, 73636.20, 0.00, 0.00, 0.00, 0.00, 'sent', '', '', 0, 0, NULL, '2025-11-26 05:01:55', '2025-11-26 05:05:49', 17, 34, 28, NULL, NULL, 0, NULL, 0, NULL, NULL, 0.00, 0.00, 482726.20, 409090.00, 0, 0, NULL, NULL, NULL),
(36, 'BKGE-QT-25-26-002', '2025-12-01', '2025-12-31', '', 'igst', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 3058960.00, 550612.80, 3609572.80, 0.00, 0.00, 550612.80, 0.00, 0.00, 0.00, 0.00, 'approved', '', 'Advance payment 50%', 0, 0, NULL, '2025-12-01 04:05:56', '2025-12-01 04:08:44', 17, 34, 28, NULL, NULL, 0, NULL, 1, '2025-12-01 04:08:44', NULL, 0.00, 0.00, 3609572.80, 3058960.00, 0, 0, NULL, NULL, NULL),
(38, 'BKGE-QT-25-26-003', '2025-08-29', '2025-12-31', '', 'igst', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 30000.00, 5400.00, 35400.00, 0.00, 0.00, 5400.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', 0, 0, NULL, '2025-12-01 08:34:30', '2025-12-01 08:34:30', 17, 34, 28, NULL, NULL, 0, NULL, 0, NULL, NULL, 0.00, 0.00, 0.00, 0.00, 0, 0, NULL, NULL, NULL),
(39, 'BKGE-QT-25-26-004', '2025-08-26', '2025-12-31', '', 'igst', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 30000.00, 5400.00, 35400.00, 0.00, 0.00, 5400.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', 'Advance payment  : 80%', 0, 0, NULL, '2025-12-01 09:13:13', '2025-12-01 09:13:13', 17, 34, 28, NULL, 1764580174068, 0, NULL, 0, NULL, NULL, 0.00, 0.00, 0.00, 0.00, 0, 0, NULL, NULL, NULL),
(40, 'BKGE-QT-25-26-005', '2025-12-01', '2025-12-31', '', 'igst', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 30000.00, 5400.00, 35400.00, 0.00, 0.00, 5400.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', 0, 0, NULL, '2025-12-01 09:15:28', '2025-12-01 09:15:28', 17, 34, 28, NULL, 1764580174068, 0, NULL, 0, NULL, NULL, 0.00, 0.00, 0.00, 0.00, 0, 0, NULL, NULL, NULL),
(41, 'BKGE-QT-25-26-006', '2025-12-01', '2025-12-31', '', 'igst', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 88960.00, 16012.80, 104972.80, 0.00, 0.00, 16012.80, 0.00, 0.00, 0.00, 0.00, 'approved', '', '', 1, 0, NULL, '2025-12-01 09:18:11', '2025-12-02 10:26:35', 17, 34, 28, NULL, 1764580174068, 0, NULL, 1, '2025-12-02 10:26:35', NULL, 0.00, 0.00, 495423.00, 419850.00, 0, 0, NULL, NULL, NULL),
(42, 'BKGE-QT-25-26-007', '2025-11-29', '2025-12-31', '', 'igst', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 448810.00, 80785.80, 529595.80, 0.00, 0.00, 80785.80, 0.00, 0.00, 0.00, 0.00, 'approved', 'Notes', 'Payment Terms & Conditions: Properties:', 0, 0, NULL, '2025-12-01 11:18:40', '2025-12-02 08:34:26', 17, 34, 28, NULL, NULL, 0, NULL, 1, '2025-12-02 08:34:26', NULL, 0.00, 0.00, 529595.80, 448810.00, 0, 0, NULL, NULL, NULL),
(43, 'BKGE-QT-25-26-008', '2025-11-29', '2026-01-01', '', 'igst', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 478810.00, 86185.80, 564995.80, 0.00, 0.00, 86185.80, 0.00, 0.00, 0.00, 0.00, 'rejected', '', '', 0, 0, NULL, '2025-12-02 06:00:44', '2025-12-02 08:17:37', 17, 34, 28, NULL, NULL, 0, NULL, 0, NULL, NULL, 0.00, 0.00, 564995.80, 478810.00, 0, 1, '2025-12-02 08:17:37', 34, 'This Quotation has been Rejected.'),
(44, 'BKGE-QT-25-26-009', '2025-12-02', '2026-01-01', '', 'igst', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 30000.00, 5400.00, 35400.00, 0.00, 0.00, 5400.00, 0.00, 0.00, 0.00, 0.00, 'sent', '', '', 0, 0, NULL, '2025-12-02 10:27:56', '2025-12-02 10:30:01', 17, 34, 28, NULL, 1764580174068, 1, '2025-12-02 10:30:01', 0, NULL, 'percentage', 35400.00, 0.00, 35400.00, 30000.00, 0, 0, NULL, NULL, NULL),
(45, 'BKGE-QT-25-26-010', '2025-12-02', '2026-01-01', '', 'igst', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 30000.00, 5400.00, 35400.00, 0.00, 0.00, 5400.00, 0.00, 0.00, 0.00, 0.00, 'sent', '', '', 0, 0, NULL, '2025-12-02 10:30:56', '2025-12-02 10:33:46', 17, 34, 28, NULL, 1764580174068, 1, '2025-12-02 10:33:46', 0, NULL, 'percentage', 35400.00, 0.00, 35400.00, 30000.00, 0, 0, NULL, NULL, NULL),
(46, 'BKGE-QT-25-26-011', '2025-11-30', '2026-01-01', '', 'igst', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 263505.00, 47430.90, 310935.90, 0.00, 0.00, 47430.90, 0.00, 0.00, 0.00, 0.00, 'approved', '', '', 0, 0, NULL, '2025-12-02 11:27:33', '2025-12-02 11:44:57', 17, 34, 28, NULL, 1763614097268, 0, NULL, 1, '2025-12-02 11:44:57', NULL, 0.00, 0.00, 310935.90, 263505.00, 0, 0, NULL, NULL, NULL),
(47, 'BKGE-QT-25-26-012', '2025-12-02', '2026-01-01', '', 'igst', '24AAHCP3289L1ZY', '33DYJPK9079P1ZF', 30000.00, 5400.00, 35400.00, 0.00, 0.00, 5400.00, 0.00, 0.00, 0.00, 0.00, 'sent', '', '', 0, 0, NULL, '2025-12-02 13:10:22', '2025-12-02 13:11:58', 17, 34, 28, NULL, 1763614097268, 0, '2025-12-02 13:11:58', 0, NULL, 'percentage', 70800.00, 0.00, 35400.00, 30000.00, 0, 0, NULL, NULL, NULL),
(50, 'TC-QT-25-26-002', '2025-07-02', '2026-01-14', '', 'igst', '24AAHCP3289L1ZY', '33BIHPD1104L1ZS', 30000.00, 5400.00, 35400.00, 0.00, 0.00, 5400.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', 0, 0, NULL, '2025-12-15 09:38:24', '2025-12-15 12:24:01', 13, 30, 13, NULL, NULL, 0, NULL, 0, NULL, NULL, 0.00, 0.00, 35400.00, 30000.00, 0, 0, NULL, NULL, NULL),
(51, 'TC-QT-25-26-003', '2025-07-02', '2026-01-14', '', 'igst', '24AAHCP3289L1ZY', '33BIHPD1104L1ZS', 30000.00, 5400.00, 35400.00, 0.00, 0.00, 5400.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', 0, 0, NULL, '2025-12-15 09:52:24', '2025-12-15 12:24:27', 13, 30, 13, NULL, 1765793094238, 0, NULL, 0, NULL, NULL, 0.00, 0.00, 114460.00, 97000.00, 0, 0, NULL, NULL, NULL),
(52, 'TC-QT-25-26-004', '2025-07-08', '2026-01-14', '', 'igst', '24AAHCP3289L1ZY', '33BIHPD1104L1ZS', 97000.00, 17460.00, 114460.00, 0.00, 0.00, 17460.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', 0, 0, NULL, '2025-12-15 10:10:30', '2025-12-15 10:10:30', 13, 30, 13, NULL, 1765792490842, 0, NULL, 0, NULL, NULL, 0.00, 0.00, 0.00, 0.00, 0, 0, NULL, NULL, NULL),
(53, 'TC-QT-25-26-005', '2025-07-08', '2026-01-14', '', 'igst', '24AAHCP3289L1ZY', '33BIHPD1104L1ZS', 329000.00, 59220.00, 388220.00, 0.00, 0.00, 59220.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', 0, 0, NULL, '2025-12-15 10:13:59', '2025-12-15 12:26:58', 13, 30, 13, NULL, 1765792490842, 0, NULL, 0, NULL, NULL, 0.00, 0.00, 147500.00, 125000.00, 0, 0, NULL, NULL, NULL),
(54, 'TC-QT-25-26-006', '2025-07-08', '2026-01-14', '', 'cgst_sgst', '33AAKCP3080G1ZI', '33BIHPD1104L1ZS', 82036.00, 9844.32, 91880.32, 4922.16, 4922.16, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', 0, 0, NULL, '2025-12-15 11:13:52', '2025-12-15 11:13:52', 13, 30, 14, NULL, 1765793985281, 0, NULL, 0, NULL, NULL, 0.00, 0.00, 0.00, 0.00, 0, 0, NULL, NULL, NULL),
(55, 'TC-QT-25-26-007', '2025-07-10', '2026-01-14', '', 'cgst_sgst', '33AAKCP3080G1ZI', '33BIHPD1104L1ZS', 113147.03, 15816.47, 128963.50, 7908.23, 7908.23, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', 0, 0, NULL, '2025-12-15 11:23:55', '2025-12-15 11:26:55', 13, 30, 14, NULL, 1765793985281, 0, NULL, 0, NULL, NULL, 0.00, 0.00, 87524.67, 78147.03, 0, 0, NULL, NULL, NULL),
(57, 'TC-QT-25-26-009', '2025-07-15', '2026-01-14', '', 'cgst_sgst', '33AAACT4304R1Z8', '33BIHPD1104L1ZS', 124800.00, 22464.00, 147264.00, 11232.00, 11232.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', 0, 0, NULL, '2025-12-15 11:40:36', '2025-12-15 12:28:32', 13, 30, 15, NULL, 1763638917206, 0, NULL, 0, NULL, NULL, 0.00, 0.00, 147264.00, 124800.00, 0, 0, NULL, NULL, NULL),
(58, 'TC-QT-25-26-010', '2025-10-16', '2026-01-14', '', 'igst', '24AAHCP3289L1ZY', '33BIHPD1104L1ZS', 389000.00, 70020.00, 459020.00, 0.00, 0.00, 70020.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', 0, 0, NULL, '2025-12-15 12:22:42', '2025-12-15 12:40:05', 13, 30, 13, NULL, 1763638507469, 0, NULL, 0, NULL, NULL, 0.00, 0.00, 135700.00, 115000.00, 0, 0, NULL, NULL, NULL),
(59, 'TC-QT-25-26-011', '2025-10-16', '2026-01-14', '', 'igst', '24AAHCP3289L1ZY', '33BIHPD1104L1ZS', 399000.00, 71820.00, 470820.00, 0.00, 0.00, 71820.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', 0, 0, NULL, '2025-12-15 12:46:13', '2025-12-15 12:46:13', 13, 30, 13, NULL, 1765793094238, 0, NULL, 0, NULL, NULL, 0.00, 0.00, 0.00, 0.00, 0, 0, NULL, NULL, NULL),
(61, 'TC-QT-25-26-013', '2025-07-09', '2026-01-14', '', 'igst', '24AAICT7384F1Z3', '33BIHPD1104L1ZS', 96000.00, 17280.00, 113280.00, 0.00, 0.00, 17280.00, 0.00, 0.00, 0.00, 0.00, 'draft', '', '', 0, 0, NULL, '2025-12-15 12:52:26', '2025-12-15 12:52:26', 13, 30, 16, NULL, 1763638608635, 0, NULL, 0, NULL, NULL, 0.00, 0.00, 0.00, 0.00, 0, 0, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `followups`
--

CREATE TABLE `followups` (
  `id` int(11) NOT NULL,
  `contact_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `followup_type` enum('standalone','task') DEFAULT 'standalone',
  `task_id` int(11) DEFAULT NULL,
  `follow_up_date` date NOT NULL,
  `status` enum('pending','in_progress','completed','postponed','cancelled') NOT NULL DEFAULT 'pending',
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `followup_history`
--

CREATE TABLE `followup_history` (
  `id` int(11) NOT NULL,
  `followup_id` int(11) NOT NULL,
  `action` varchar(50) NOT NULL,
  `old_value` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `followup_history`
--

INSERT INTO `followup_history` (`id`, `followup_id`, `action`, `old_value`, `notes`, `created_by`, `created_at`) VALUES
(1, 1, 'created', NULL, 'Follow-up created', 1, '2025-12-08 08:49:17'),
(2, 2, 'created', NULL, 'Follow-up created', 57, '2025-12-09 10:38:38'),
(3, 3, 'created', NULL, 'Follow-up created', 1, '2025-12-11 03:07:19'),
(4, 4, 'created', NULL, 'Follow-up created', 58, '2025-12-11 05:59:38'),
(5, 5, 'completed', 'pending', 'Follow-up completed', 37, '2025-12-15 07:06:51'),
(6, 5, 'status_changed', 'completed', 'Status updated from linked task completion', 1, '2025-12-15 07:08:42'),
(7, 5, 'status_changed', 'pending', 'Status updated from linked task completion', 1, '2025-12-15 07:08:59'),
(8, 3, 'completed', 'pending', 'Follow-up completed', 37, '2025-12-15 08:02:06'),
(9, 6, 'completed', 'pending', 'Follow-up completed', 37, '2025-12-16 18:18:02'),
(10, 7, 'completed', 'pending', 'Follow-up completed', 37, '2025-12-17 04:21:42'),
(11, 8, 'created', NULL, 'Follow-up created', 58, '2025-12-18 18:34:03');

-- --------------------------------------------------------

--
-- Table structure for table `funnel_stats`
--

CREATE TABLE `funnel_stats` (
  `id` int(11) NOT NULL,
  `company_prefix` varchar(50) NOT NULL,
  `quotation_count` int(11) DEFAULT 0,
  `quotation_value` decimal(15,2) DEFAULT 0.00,
  `po_count` int(11) DEFAULT 0,
  `po_value` decimal(15,2) DEFAULT 0.00,
  `po_conversion_rate` decimal(5,2) DEFAULT 0.00,
  `invoice_count` int(11) DEFAULT 0,
  `invoice_value` decimal(15,2) DEFAULT 0.00,
  `invoice_conversion_rate` decimal(5,2) DEFAULT 0.00,
  `payment_count` int(11) DEFAULT 0,
  `payment_value` decimal(15,2) DEFAULT 0.00,
  `payment_conversion_rate` decimal(5,2) DEFAULT 0.00,
  `generated_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `journal_entries`
--

CREATE TABLE `journal_entries` (
  `id` int(11) NOT NULL,
  `reference_type` varchar(50) NOT NULL,
  `reference_id` int(11) NOT NULL,
  `entry_date` date NOT NULL,
  `description` text DEFAULT NULL,
  `total_amount` decimal(15,2) NOT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `journal_entries`
--

INSERT INTO `journal_entries` (`id`, `reference_type`, `reference_id`, `entry_date`, `description`, `total_amount`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'expense', 2, '2025-12-08', 'Traveled to the client&rsquo;s office located in Teynampet, Chennai for a project discussion. Expense includes a round-trip auto fare and parking charges. This trip was required for submitting project documents and attending a review meeting.', 810.00, 1, '2025-12-08 06:25:00', '2025-12-08 06:25:00'),
(2, 'expense', 9, '2025-12-08', 'Test expense for approval testing', 500.00, 1, '2025-12-08 06:31:54', '2025-12-08 06:31:54'),
(3, 'expense', 13, '2025-12-08', 'MYSELF - HARINI', 500.00, 37, '2025-12-08 09:24:09', '2025-12-08 09:24:09');

-- --------------------------------------------------------

--
-- Table structure for table `journal_entry_lines`
--

CREATE TABLE `journal_entry_lines` (
  `id` int(11) NOT NULL,
  `journal_entry_id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `debit_amount` decimal(15,2) DEFAULT 0.00,
  `credit_amount` decimal(15,2) DEFAULT 0.00,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `journal_entry_lines`
--

INSERT INTO `journal_entry_lines` (`id`, `journal_entry_id`, `account_id`, `debit_amount`, `credit_amount`, `description`, `created_at`) VALUES
(1, 1, 1, 810.00, 0.00, 'Expense: Traveled to the client&rsquo;s office located in Teynampet, Chennai for a project discussion. Expense includes a round-trip auto fare and parking charges. This trip was required for submitting project documents and attending a review meeting.', '2025-12-08 06:25:00'),
(2, 1, 1, 0.00, 810.00, 'Payable: Traveled to the client&rsquo;s office located in Teynampet, Chennai for a project discussion. Expense includes a round-trip auto fare and parking charges. This trip was required for submitting project documents and attending a review meeting.', '2025-12-08 06:25:00'),
(3, 2, 1, 500.00, 0.00, 'Expense: Test expense for approval testing', '2025-12-08 06:31:54'),
(4, 2, 1, 0.00, 500.00, 'Payable: Test expense for approval testing', '2025-12-08 06:31:54'),
(5, 3, 1, 500.00, 0.00, 'Expense: MYSELF - HARINI', '2025-12-08 09:24:09'),
(6, 3, 1, 0.00, 500.00, 'Payable: MYSELF - HARINI', '2025-12-08 09:24:09');

-- --------------------------------------------------------

--
-- Table structure for table `leaves`
--

CREATE TABLE `leaves` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `leave_type` varchar(50) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `total_days` int(11) DEFAULT NULL,
  `days_requested` int(11) NOT NULL,
  `reason` text DEFAULT NULL,
  `contact_during_leave` varchar(20) DEFAULT NULL,
  `status` enum('Pending','Approved','Rejected') DEFAULT 'Pending',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `leaves`
--

INSERT INTO `leaves` (`id`, `user_id`, `leave_type`, `start_date`, `end_date`, `total_days`, `days_requested`, `reason`, `contact_during_leave`, `status`, `created_at`, `updated_at`, `approved_by`, `approved_at`, `rejection_reason`) VALUES
(16, 69, 'casual', '2025-12-24', '2025-12-26', 3, 3, 'Christmas festival', '8300703942', 'Approved', '2025-12-23 04:31:20', '2026-01-11 07:37:56', 1, '2026-01-11 07:37:56', NULL);

--
-- Triggers `leaves`
--
DELIMITER $$
CREATE TRIGGER `calculate_leave_days` BEFORE INSERT ON `leaves` FOR EACH ROW SET NEW.total_days = DATEDIFF(NEW.end_date, NEW.start_date) + 1
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `login_attempts`
--

CREATE TABLE `login_attempts` (
  `id` int(11) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `attempts` int(11) DEFAULT 1,
  `last_attempt` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `blocked_until` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `uuid` char(36) DEFAULT NULL,
  `sender_id` int(11) DEFAULT NULL,
  `receiver_id` int(11) NOT NULL,
  `module_name` varchar(50) DEFAULT 'system',
  `action_type` varchar(50) DEFAULT 'info',
  `template_key` varchar(100) DEFAULT NULL,
  `message` text NOT NULL,
  `link` varchar(255) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `reference_id` int(11) DEFAULT NULL,
  `delivery_channel_set` varchar(100) DEFAULT 'inapp',
  `is_read` tinyint(1) DEFAULT 0,
  `status` enum('queued','delivered','failed','deleted') DEFAULT 'queued',
  `retry_count` int(11) DEFAULT 0,
  `expires_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  `type` enum('info','success','warning','error','urgent') DEFAULT 'info',
  `category` enum('task','approval','system','reminder','announcement') DEFAULT 'system',
  `action_url` varchar(500) DEFAULT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `priority` tinyint(1) DEFAULT 1,
  `module_type` enum('leave','expense','advance','task','system') DEFAULT 'system',
  `status_change` enum('pending','approved','rejected','assigned','completed') DEFAULT NULL,
  `approver_id` int(11) DEFAULT NULL,
  `reminder_date` datetime DEFAULT NULL,
  `title` varchar(255) NOT NULL DEFAULT '',
  `is_batched` tinyint(1) DEFAULT 0,
  `read_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `uuid`, `sender_id`, `receiver_id`, `module_name`, `action_type`, `template_key`, `message`, `link`, `payload`, `reference_id`, `delivery_channel_set`, `is_read`, `status`, `retry_count`, `expires_at`, `created_at`, `updated_at`, `type`, `category`, `action_url`, `reference_type`, `priority`, `module_type`, `status_change`, `approver_id`, `reminder_date`, `title`, `is_batched`, `read_at`) VALUES
(1, NULL, 69, 16, 'system', 'info', NULL, 'Leave request from S.Johnkennedy for casual (2025-12-24 to 2025-12-26)', NULL, NULL, 16, 'inapp', 0, 'queued', 0, NULL, '2025-12-23 04:31:20', NULL, 'info', 'approval', 'https://bkgreenenergy.com/ergon-site/leaves/view/16', 'leave', 1, 'system', NULL, NULL, NULL, 'New Leave Request', 0, NULL),
(2, NULL, 69, 1, 'system', 'info', NULL, 'Leave request from S.Johnkennedy for casual (2025-12-24 to 2025-12-26)', NULL, NULL, 16, 'inapp', 0, 'queued', 0, NULL, '2025-12-23 04:31:20', NULL, 'info', 'approval', 'https://bkgreenenergy.com/ergon-site/leaves/view/16', 'leave', 1, 'system', NULL, NULL, NULL, 'New Leave Request', 0, NULL),
(3, NULL, 69, 59, 'system', 'info', NULL, 'Leave request from S.Johnkennedy for casual (2025-12-24 to 2025-12-26)', NULL, NULL, 16, 'inapp', 0, 'queued', 0, NULL, '2025-12-23 04:31:20', NULL, 'info', 'approval', 'https://bkgreenenergy.com/ergon-site/leaves/view/16', 'leave', 1, 'system', NULL, NULL, NULL, 'New Leave Request', 0, NULL),
(4, NULL, 69, 16, 'system', 'info', NULL, 'Expense request for Paint materials and pipe elbow also - Amount: $3524.00', NULL, NULL, 1, 'inapp', 0, 'queued', 0, NULL, '2025-12-23 05:56:26', NULL, 'info', 'approval', '/ergon/expenses/view/1', 'expense', 1, 'expense', 'pending', NULL, NULL, 'New Expense Request from S.Johnkennedy', 0, NULL),
(5, NULL, 69, 1, 'system', 'info', NULL, 'Expense request for Paint materials and pipe elbow also - Amount: $3524.00', NULL, NULL, 1, 'inapp', 0, 'queued', 0, NULL, '2025-12-23 05:56:26', NULL, 'info', 'approval', '/ergon/expenses/view/1', 'expense', 1, 'expense', 'pending', NULL, NULL, 'New Expense Request from S.Johnkennedy', 0, NULL),
(6, NULL, 69, 59, 'system', 'info', NULL, 'Expense request for Paint materials and pipe elbow also - Amount: $3524.00', NULL, NULL, 1, 'inapp', 0, 'queued', 0, NULL, '2025-12-23 05:56:26', NULL, 'info', 'approval', '/ergon/expenses/view/1', 'expense', 1, 'expense', 'pending', NULL, NULL, 'New Expense Request from S.Johnkennedy', 0, NULL),
(7, NULL, 69, 16, 'system', 'info', NULL, 'Expense claim from S.Johnkennedy - ₹3,524.00', NULL, NULL, 1, 'inapp', 0, 'queued', 0, NULL, '2025-12-23 05:56:26', NULL, 'info', 'approval', 'https://bkgreenenergy.com/ergon-site/expenses/view/1', 'expense', 1, 'system', NULL, NULL, NULL, 'New Expense Claim', 0, NULL),
(8, NULL, 69, 1, 'system', 'info', NULL, 'Expense claim from S.Johnkennedy - ₹3,524.00', NULL, NULL, 1, 'inapp', 0, 'queued', 0, NULL, '2025-12-23 05:56:26', NULL, 'info', 'approval', 'https://bkgreenenergy.com/ergon-site/expenses/view/1', 'expense', 1, 'system', NULL, NULL, NULL, 'New Expense Claim', 0, NULL),
(9, NULL, 69, 59, 'system', 'info', NULL, 'Expense claim from S.Johnkennedy - ₹3,524.00', NULL, NULL, 1, 'inapp', 0, 'queued', 0, NULL, '2025-12-23 05:56:26', NULL, 'info', 'approval', 'https://bkgreenenergy.com/ergon-site/expenses/view/1', 'expense', 1, 'system', NULL, NULL, NULL, 'New Expense Claim', 0, NULL),
(10, NULL, 69, 16, 'system', 'info', NULL, 'Advance request for $10000.00 - Christmas festival', NULL, NULL, 1, 'inapp', 0, 'queued', 0, NULL, '2025-12-23 07:20:14', NULL, 'info', 'approval', '/ergon/advances/view/1', 'advance', 1, 'advance', 'pending', NULL, NULL, 'New Advance Request from S.Johnkennedy', 0, NULL),
(11, NULL, 69, 1, 'system', 'info', NULL, 'Advance request for $10000.00 - Christmas festival', NULL, NULL, 1, 'inapp', 0, 'queued', 0, NULL, '2025-12-23 07:20:14', NULL, 'info', 'approval', '/ergon/advances/view/1', 'advance', 1, 'advance', 'pending', NULL, NULL, 'New Advance Request from S.Johnkennedy', 0, NULL),
(12, NULL, 69, 59, 'system', 'info', NULL, 'Advance request for $10000.00 - Christmas festival', NULL, NULL, 1, 'inapp', 0, 'queued', 0, NULL, '2025-12-23 07:20:14', NULL, 'info', 'approval', '/ergon/advances/view/1', 'advance', 1, 'advance', 'pending', NULL, NULL, 'New Advance Request from S.Johnkennedy', 0, NULL),
(13, NULL, 69, 16, 'system', 'info', NULL, 'Advance request from S.Johnkennedy - ₹10,000.00 for Christmas festival', NULL, NULL, 1, 'inapp', 0, 'queued', 0, NULL, '2025-12-23 07:20:14', NULL, 'info', 'approval', 'https://bkgreenenergy.com/ergon-site/advances/view/1', 'advance', 1, 'system', NULL, NULL, NULL, 'New Advance Request', 0, NULL),
(14, NULL, 69, 1, 'system', 'info', NULL, 'Advance request from S.Johnkennedy - ₹10,000.00 for Christmas festival', NULL, NULL, 1, 'inapp', 0, 'queued', 0, NULL, '2025-12-23 07:20:14', NULL, 'info', 'approval', 'https://bkgreenenergy.com/ergon-site/advances/view/1', 'advance', 1, 'system', NULL, NULL, NULL, 'New Advance Request', 0, NULL),
(15, NULL, 69, 59, 'system', 'info', NULL, 'Advance request from S.Johnkennedy - ₹10,000.00 for Christmas festival', NULL, NULL, 1, 'inapp', 0, 'queued', 0, NULL, '2025-12-23 07:20:14', NULL, 'info', 'approval', 'https://bkgreenenergy.com/ergon-site/advances/view/1', 'advance', 1, 'system', NULL, NULL, NULL, 'New Advance Request', 0, NULL),
(16, NULL, 1, 71, 'system', 'info', NULL, 'You have been assigned a new task: MMS PILING', NULL, NULL, 30, 'inapp', 0, 'queued', 0, NULL, '2026-01-01 09:28:04', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(17, NULL, 1, 71, 'system', 'info', NULL, 'You have been assigned a new task: MMS & MODULE INSTALLATION', NULL, NULL, 31, 'inapp', 0, 'queued', 0, NULL, '2026-01-01 09:29:10', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(18, NULL, 1, 71, 'system', 'info', NULL, 'You have been assigned a new task: I&C - AC SCOPE', NULL, NULL, 32, 'inapp', 0, 'queued', 0, NULL, '2026-01-01 09:30:25', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(19, NULL, 1, 71, 'system', 'info', NULL, 'You have been assigned a new task: I&C - DC SCOPE', NULL, NULL, 33, 'inapp', 0, 'queued', 0, NULL, '2026-01-01 09:31:16', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(20, NULL, 1, 71, 'system', 'info', NULL, 'You have been assigned a new task: FENCING - CHAIN LINK - INSTALLATION', NULL, NULL, 34, 'inapp', 0, 'queued', 0, NULL, '2026-01-01 09:32:08', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(21, NULL, 1, 67, 'system', 'info', NULL, 'You have been assigned a new task: HT PANEL FOUNDATION', NULL, NULL, 35, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:12:39', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(22, NULL, 1, 67, 'system', 'info', NULL, 'You have been assigned a new task: IDT FOUNDATION WORK', NULL, NULL, 36, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:13:57', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(23, NULL, 1, 67, 'system', 'info', NULL, 'You have been assigned a new task: MISC. CIVIL WORK', NULL, NULL, 37, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:14:51', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(24, NULL, 1, 71, 'system', 'info', NULL, 'You have been assigned a new task: CIVIL FOUNDATION WORK', NULL, NULL, 38, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:14:54', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(25, NULL, 1, 67, 'system', 'info', NULL, 'You have been assigned a new task: MISC. CIVIL WORK', NULL, NULL, 39, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:15:41', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(26, NULL, 1, 67, 'system', 'info', NULL, 'You have been assigned a new task: MISC. CIVIL WORK', NULL, NULL, 40, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:17:10', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(27, NULL, 1, 71, 'system', 'info', NULL, 'You have been assigned a new task: IDT FOUNDATION WORK', NULL, NULL, 41, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:17:36', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(28, NULL, 1, 67, 'system', 'info', NULL, 'You have been assigned a new task: MISC. CIVIL WORK', NULL, NULL, 42, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:18:01', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(29, NULL, 1, 67, 'system', 'info', NULL, 'You have been assigned a new task: IDT FOUNDATION WORK  (Torrent Urja 17 Pvt Ltd)', NULL, NULL, 43, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:22:15', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(30, NULL, 1, 67, 'system', 'info', NULL, 'You have been assigned a new task: LT PANEL FOUNDATION (Torrent Urja 17 Pvt Ltd)', NULL, NULL, 44, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:23:39', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(31, NULL, 1, 69, 'system', 'info', NULL, 'You have been assigned a new task: MMS PILING Green Pro', NULL, NULL, 45, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:24:46', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(32, NULL, 1, 67, 'system', 'info', NULL, 'You have been assigned a new task: HT PANEL FOUNDATION (Torrent Urja 17 Pvt Ltd)', NULL, NULL, 46, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:24:49', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(33, NULL, 1, 67, 'system', 'info', NULL, 'You have been assigned a new task: MMS PILING Pile Foundations', NULL, NULL, 47, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:36:04', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(34, NULL, 1, 67, 'system', 'info', NULL, 'You have been assigned a new task: MMS & MODULE INSTALLATION', NULL, NULL, 48, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:37:46', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(35, NULL, 1, 67, 'system', 'info', NULL, 'You have been assigned a new task: I&C - AC SCOPE', NULL, NULL, 49, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:41:38', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(36, NULL, 1, 67, 'system', 'info', NULL, 'You have been assigned a new task: I&C - DC SCOPE', NULL, NULL, 50, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:42:38', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(37, NULL, 1, 67, 'system', 'info', NULL, 'You have been assigned a new task: CIVIL FOUNDATION WORK', NULL, NULL, 51, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:43:39', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(38, NULL, 1, 67, 'system', 'info', NULL, 'You have been assigned a new task: FENCING - CHAIN LINK - INSTALLATION', NULL, NULL, 52, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:44:38', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(39, NULL, 1, 67, 'system', 'info', NULL, 'You have been assigned a new task: I&C - MISCELLANEOUS', NULL, NULL, 53, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:45:54', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(40, NULL, 1, 67, 'system', 'info', NULL, 'You have been assigned a new task: MMS PILING', NULL, NULL, 54, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:47:50', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(41, NULL, 1, 69, 'system', 'info', NULL, 'You have been assigned a new task: MMS INSTALLATION', NULL, NULL, 55, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:47:50', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(42, NULL, 1, 67, 'system', 'info', NULL, 'You have been assigned a new task: MMS & MODULE INSTALLATION', NULL, NULL, 56, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:48:57', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(43, NULL, 1, 67, 'system', 'info', NULL, 'You have been assigned a new task: I&C - AC SCOPE', NULL, NULL, 57, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:53:48', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(44, NULL, 1, 67, 'system', 'info', NULL, 'You have been assigned a new task: I&C - DC SCOPE', NULL, NULL, 58, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:57:46', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(45, NULL, 1, 67, 'system', 'info', NULL, 'You have been assigned a new task: CIVIL FOUNDATION WORK', NULL, NULL, 59, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:58:36', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(46, NULL, 1, 69, 'system', 'info', NULL, 'You have been assigned a new task: CABLE LAYING', NULL, NULL, 60, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:58:43', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(47, NULL, 1, 67, 'system', 'info', NULL, 'You have been assigned a new task: FENCING - CHAIN LINK - INSTALLATION', NULL, NULL, 61, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 04:59:35', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(48, NULL, 1, 69, 'system', 'info', NULL, 'You have been assigned a new task: CIVIL FOUNDATION WORK', NULL, NULL, 62, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 05:02:14', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(49, NULL, 1, 69, 'system', 'info', NULL, 'You have been assigned a new task: IDT FOUNDATION WORK', NULL, NULL, 63, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 05:04:26', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(50, NULL, 1, 69, 'system', 'info', NULL, 'You have been assigned a new task: I&C - MISCELLANEOUS', NULL, NULL, 64, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 05:08:32', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(51, NULL, 1, 69, 'system', 'info', NULL, 'You have been assigned a new task: I&C - MISCELLANEOUS', NULL, NULL, 65, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 05:15:37', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(52, NULL, 1, 69, 'system', 'info', NULL, 'You have been assigned a new task: I&C - MISCELLANEOUS', NULL, NULL, 67, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 05:26:26', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(53, NULL, 1, 69, 'system', 'info', NULL, 'You have been assigned a new task: I&C - MISCELLANEOUS', NULL, NULL, 68, 'inapp', 0, 'queued', 0, NULL, '2026-01-02 05:29:04', NULL, 'info', 'system', NULL, 'tasks', 1, 'system', NULL, NULL, NULL, 'Tasks Assigned', 0, NULL),
(54, NULL, 67, 16, 'system', 'info', NULL, 'Advance request for $1000.00 - Site expenses', NULL, NULL, 2, 'inapp', 0, 'queued', 0, NULL, '2026-01-06 06:01:59', NULL, 'info', 'approval', '/ergon/advances/view/2', 'advance', 1, 'advance', 'pending', NULL, NULL, 'New Advance Request from S.Karthik', 0, NULL),
(55, NULL, 67, 72, 'system', 'info', NULL, 'Advance request for $1000.00 - Site expenses', NULL, NULL, 2, 'inapp', 0, 'queued', 0, NULL, '2026-01-06 06:01:59', NULL, 'info', 'approval', '/ergon/advances/view/2', 'advance', 1, 'advance', 'pending', NULL, NULL, 'New Advance Request from S.Karthik', 0, NULL),
(56, NULL, 67, 1, 'system', 'info', NULL, 'Advance request for $1000.00 - Site expenses', NULL, NULL, 2, 'inapp', 0, 'queued', 0, NULL, '2026-01-06 06:01:59', NULL, 'info', 'approval', '/ergon/advances/view/2', 'advance', 1, 'advance', 'pending', NULL, NULL, 'New Advance Request from S.Karthik', 0, NULL),
(57, NULL, 67, 59, 'system', 'info', NULL, 'Advance request for $1000.00 - Site expenses', NULL, NULL, 2, 'inapp', 0, 'queued', 0, NULL, '2026-01-06 06:01:59', NULL, 'info', 'approval', '/ergon/advances/view/2', 'advance', 1, 'advance', 'pending', NULL, NULL, 'New Advance Request from S.Karthik', 0, NULL),
(61, NULL, 67, 16, 'system', 'info', NULL, 'Advance request from S.Karthik - ₹1,000.00 for Site expenses', NULL, NULL, 2, 'inapp', 0, 'queued', 0, NULL, '2026-01-06 06:01:59', NULL, 'info', 'approval', 'https://bkgreenenergy.com/ergon-site/advances/view/2', 'advance', 1, 'system', NULL, NULL, NULL, 'New Advance Request', 0, NULL),
(62, NULL, 67, 72, 'system', 'info', NULL, 'Advance request from S.Karthik - ₹1,000.00 for Site expenses', NULL, NULL, 2, 'inapp', 0, 'queued', 0, NULL, '2026-01-06 06:01:59', NULL, 'info', 'approval', 'https://bkgreenenergy.com/ergon-site/advances/view/2', 'advance', 1, 'system', NULL, NULL, NULL, 'New Advance Request', 0, NULL),
(63, NULL, 67, 1, 'system', 'info', NULL, 'Advance request from S.Karthik - ₹1,000.00 for Site expenses', NULL, NULL, 2, 'inapp', 0, 'queued', 0, NULL, '2026-01-06 06:01:59', NULL, 'info', 'approval', 'https://bkgreenenergy.com/ergon-site/advances/view/2', 'advance', 1, 'system', NULL, NULL, NULL, 'New Advance Request', 0, NULL),
(64, NULL, 67, 59, 'system', 'info', NULL, 'Advance request from S.Karthik - ₹1,000.00 for Site expenses', NULL, NULL, 2, 'inapp', 0, 'queued', 0, NULL, '2026-01-06 06:01:59', NULL, 'info', 'approval', 'https://bkgreenenergy.com/ergon-site/advances/view/2', 'advance', 1, 'system', NULL, NULL, NULL, 'New Advance Request', 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `notification_audit_logs`
--

CREATE TABLE `notification_audit_logs` (
  `id` bigint(20) NOT NULL,
  `notification_uuid` char(36) NOT NULL,
  `channel` varchar(50) NOT NULL,
  `status` enum('attempted','success','failed') NOT NULL,
  `response` text DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `attempt_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notification_channels`
--

CREATE TABLE `notification_channels` (
  `id` int(11) NOT NULL,
  `channel_name` varchar(50) NOT NULL,
  `config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`config`)),
  `enabled` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notification_preferences`
--

CREATE TABLE `notification_preferences` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `channel` varchar(50) NOT NULL,
  `enabled` tinyint(1) DEFAULT 1,
  `frequency` enum('instant','daily_digest','weekly_digest') DEFAULT 'instant',
  `dnd_start` time DEFAULT NULL,
  `dnd_end` time DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notification_queue`
--

CREATE TABLE `notification_queue` (
  `id` int(11) NOT NULL,
  `event_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`event_data`)),
  `priority` int(11) DEFAULT 2,
  `status` enum('pending','processed','failed') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `processed_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notification_templates`
--

CREATE TABLE `notification_templates` (
  `id` int(11) NOT NULL,
  `template_key` varchar(100) NOT NULL,
  `locale` varchar(10) DEFAULT 'en',
  `subject` varchar(255) NOT NULL,
  `body_html` text DEFAULT NULL,
  `body_text` text NOT NULL,
  `variables` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`variables`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `projects`
--

CREATE TABLE `projects` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `budget` decimal(15,2) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `checkin_radius` int(11) DEFAULT 100,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `location_title` varchar(255) DEFAULT NULL COMMENT 'Display name for project location',
  `department_id` int(11) DEFAULT NULL,
  `place` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `projects`
--

INSERT INTO `projects` (`id`, `name`, `description`, `budget`, `latitude`, `longitude`, `checkin_radius`, `status`, `created_at`, `updated_at`, `location_title`, `department_id`, `place`) VALUES
(17, 'Athens', 'EHS', 175000.00, 9.91316200, 78.12868700, 1000, 'active', '2025-12-16 18:10:34', '2025-12-16 18:10:34', NULL, 5, 'Madurai'),
(18, 'Maidanahalli, Karnataka', 'CIVIL', 17600.00, 11.74565000, 76.72522700, 100, 'active', '2025-12-18 13:49:48', '2025-12-18 13:49:48', NULL, 5, 'Bommalapura'),
(20, 'Thoothukudi', '', NULL, 8.91260400, 77.99772000, 100, 'active', '2025-12-18 13:54:20', '2025-12-18 13:54:20', NULL, 5, 'Thoothukudi'),
(21, 'Koppal', '', NULL, 15.53388200, 76.16005500, 100, 'active', '2025-12-18 13:55:56', '2025-12-18 13:55:56', NULL, 5, 'Koppal'),
(22, 'Kariapatti', '', NULL, 9.72541800, 78.07956000, 100, 'active', '2025-12-18 13:57:54', '2025-12-18 13:57:54', NULL, 5, 'Kariapatti'),
(23, 'Parvathi Dyeing Private Limited', '', NULL, 9.73087800, 78.07827500, 500, 'active', '2025-12-24 04:30:49', '2025-12-24 04:30:49', NULL, 5, 'Kariapatti'),
(24, 'Phoenix', '', NULL, 11.72717100, 79.41159800, 500, 'active', '2025-12-28 07:03:35', '2025-12-28 07:03:35', NULL, 5, 'Ulundurpettai'),
(25, 'Green-Pro solar project', '', NULL, 11.74568800, 76.72491900, 500, 'active', '2025-12-28 07:05:54', '2025-12-29 04:32:42', NULL, 5, 'Mysore, Karnataka');

-- --------------------------------------------------------

--
-- Table structure for table `rate_limit_log`
--

CREATE TABLE `rate_limit_log` (
  `id` int(11) NOT NULL,
  `identifier` varchar(255) NOT NULL,
  `action` varchar(50) NOT NULL,
  `attempted_at` timestamp NULL DEFAULT current_timestamp(),
  `success` tinyint(1) DEFAULT 0,
  `ip_address` varchar(45) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `rate_limit_log`
--

INSERT INTO `rate_limit_log` (`id`, `identifier`, `action`, `attempted_at`, `success`, `ip_address`) VALUES
(1, '2406:7400:ca:3ffc:d057:125a:bd4:a6b3', 'login', '2025-12-02 17:07:46', 1, '2406:7400:ca:3ffc:d057:125a:bd4:a6b3'),
(2, '2405:201:e067:384e:f5dd:7908:ac95:abcd', 'login', '2025-12-04 12:19:49', 1, '2405:201:e067:384e:f5dd:7908:ac95:abcd'),
(3, '2405:201:e067:384e:f5dd:7908:ac95:abcd', 'login', '2025-12-04 14:43:30', 0, '2405:201:e067:384e:f5dd:7908:ac95:abcd'),
(4, '2405:201:e067:384e:f5dd:7908:ac95:abcd', 'login', '2025-12-04 14:43:34', 0, '2405:201:e067:384e:f5dd:7908:ac95:abcd'),
(5, '2405:201:e067:384e:f5dd:7908:ac95:abcd', 'login', '2025-12-04 14:43:36', 0, '2405:201:e067:384e:f5dd:7908:ac95:abcd'),
(6, '2405:201:e067:384e:f5dd:7908:ac95:abcd', 'login', '2025-12-04 14:43:38', 0, '2405:201:e067:384e:f5dd:7908:ac95:abcd'),
(7, '2405:201:e067:384e:f5dd:7908:ac95:abcd', 'login', '2025-12-04 14:43:42', 0, '2405:201:e067:384e:f5dd:7908:ac95:abcd'),
(8, '2405:201:e067:384e:f5dd:7908:ac95:abcd', 'login', '2025-12-04 14:43:43', 0, '2405:201:e067:384e:f5dd:7908:ac95:abcd'),
(9, '2405:201:e067:384e:f5dd:7908:ac95:abcd', 'login', '2025-12-04 14:43:58', 0, '2405:201:e067:384e:f5dd:7908:ac95:abcd'),
(10, '2405:201:e067:384e:f5dd:7908:ac95:abcd', 'login', '2025-12-04 14:44:10', 0, '2405:201:e067:384e:f5dd:7908:ac95:abcd'),
(11, '2405:201:e067:384e:f5dd:7908:ac95:abcd', 'login', '2025-12-04 14:44:18', 0, '2405:201:e067:384e:f5dd:7908:ac95:abcd'),
(12, '2405:201:e067:384e:f5dd:7908:ac95:abcd', 'login', '2025-12-04 14:44:32', 0, '2405:201:e067:384e:f5dd:7908:ac95:abcd'),
(13, '2405:201:e067:384e:f5dd:7908:ac95:abcd', 'login', '2025-12-04 14:45:31', 0, '2405:201:e067:384e:f5dd:7908:ac95:abcd'),
(14, '2405:201:e067:384e:f5dd:7908:ac95:abcd', 'login', '2025-12-04 14:45:32', 0, '2405:201:e067:384e:f5dd:7908:ac95:abcd'),
(15, '2405:201:e067:384e:f5dd:7908:ac95:abcd', 'login', '2025-12-04 14:47:20', 0, '2405:201:e067:384e:f5dd:7908:ac95:abcd'),
(16, '2405:201:e067:384e:f5dd:7908:ac95:abcd', 'login', '2025-12-04 14:47:22', 0, '2405:201:e067:384e:f5dd:7908:ac95:abcd'),
(17, '2405:201:e067:384e:f5dd:7908:ac95:abcd', 'login', '2025-12-04 14:48:05', 0, '2405:201:e067:384e:f5dd:7908:ac95:abcd'),
(18, '2405:201:e067:384e:f5dd:7908:ac95:abcd', 'login', '2025-12-04 14:48:12', 0, '2405:201:e067:384e:f5dd:7908:ac95:abcd'),
(19, '2405:201:e067:384e:f5dd:7908:ac95:abcd', 'login', '2025-12-04 14:48:18', 0, '2405:201:e067:384e:f5dd:7908:ac95:abcd'),
(20, '2405:201:e067:384e:f5dd:7908:ac95:abcd', 'login', '2025-12-04 14:59:32', 1, '2405:201:e067:384e:f5dd:7908:ac95:abcd'),
(21, '2406:7400:ca:3ffc:51bf:faf6:1735:6b9d', 'login', '2025-12-04 17:19:34', 1, '2406:7400:ca:3ffc:51bf:faf6:1735:6b9d'),
(22, '2405:201:e067:384e:74a1:e819:7a9f:ddd0', 'login', '2025-12-05 06:58:56', 1, '2405:201:e067:384e:74a1:e819:7a9f:ddd0'),
(23, '2405:201:e067:384e:64ed:7b2e:277f:ba68', 'login', '2025-12-06 06:38:15', 1, '2405:201:e067:384e:64ed:7b2e:277f:ba68'),
(24, '2405:201:e067:384e:64ed:7b2e:277f:ba68', 'login', '2025-12-06 06:39:44', 1, '2405:201:e067:384e:64ed:7b2e:277f:ba68'),
(25, '2405:201:e067:384e:64ed:7b2e:277f:ba68', 'login', '2025-12-06 06:58:21', 1, '2405:201:e067:384e:64ed:7b2e:277f:ba68'),
(26, '2405:201:e067:384e:64ed:7b2e:277f:ba68', 'login', '2025-12-06 07:35:21', 1, '2405:201:e067:384e:64ed:7b2e:277f:ba68'),
(27, '2405:201:e067:384e:d771:4cd2:5c0d:d25c', 'login', '2025-12-08 03:59:24', 1, '2405:201:e067:384e:d771:4cd2:5c0d:d25c'),
(28, '2405:201:e067:384e:d771:4cd2:5c0d:d25c', 'login', '2025-12-08 04:02:00', 1, '2405:201:e067:384e:d771:4cd2:5c0d:d25c'),
(29, '2402:3a80:18:85fb:d1e4:5001:a2b9:23b7', 'login', '2025-12-08 04:13:27', 1, '2402:3a80:18:85fb:d1e4:5001:a2b9:23b7'),
(30, '2405:201:e067:384e:d771:4cd2:5c0d:d25c', 'login', '2025-12-08 04:18:49', 0, '2405:201:e067:384e:d771:4cd2:5c0d:d25c'),
(31, '2405:201:e067:384e:d771:4cd2:5c0d:d25c', 'login', '2025-12-08 04:27:22', 1, '2405:201:e067:384e:d771:4cd2:5c0d:d25c'),
(32, '2405:201:e067:384e:d771:4cd2:5c0d:d25c', 'login', '2025-12-08 04:28:28', 1, '2405:201:e067:384e:d771:4cd2:5c0d:d25c'),
(33, '2405:201:e067:384e:d771:4cd2:5c0d:d25c', 'login', '2025-12-08 05:14:13', 1, '2405:201:e067:384e:d771:4cd2:5c0d:d25c'),
(34, '2405:201:e067:384e:d771:4cd2:5c0d:d25c', 'login', '2025-12-08 05:14:35', 1, '2405:201:e067:384e:d771:4cd2:5c0d:d25c'),
(35, '2405:201:e067:384e:d771:4cd2:5c0d:d25c', 'login', '2025-12-08 05:15:27', 1, '2405:201:e067:384e:d771:4cd2:5c0d:d25c'),
(36, '2405:201:e067:384e:d771:4cd2:5c0d:d25c', 'login', '2025-12-08 06:48:31', 1, '2405:201:e067:384e:d771:4cd2:5c0d:d25c'),
(37, '2405:201:e067:384e:d771:4cd2:5c0d:d25c', 'login', '2025-12-08 06:49:51', 1, '2405:201:e067:384e:d771:4cd2:5c0d:d25c'),
(38, '2405:201:e067:384e:d771:4cd2:5c0d:d25c', 'login', '2025-12-08 06:50:47', 0, '2405:201:e067:384e:d771:4cd2:5c0d:d25c'),
(39, '2405:201:e067:384e:d771:4cd2:5c0d:d25c', 'login', '2025-12-08 06:51:13', 1, '2405:201:e067:384e:d771:4cd2:5c0d:d25c'),
(40, '2405:201:e067:384e:34f4:2693:93b2:e6a3', 'login', '2025-12-08 06:51:29', 1, '2405:201:e067:384e:34f4:2693:93b2:e6a3'),
(41, '2405:201:e067:384e:d771:4cd2:5c0d:d25c', 'login', '2025-12-08 06:53:54', 1, '2405:201:e067:384e:d771:4cd2:5c0d:d25c'),
(42, '2405:201:e067:384e:34f4:2693:93b2:e6a3', 'login', '2025-12-08 08:32:54', 1, '2405:201:e067:384e:34f4:2693:93b2:e6a3'),
(43, '2405:201:e067:384e:d771:4cd2:5c0d:d25c', 'login', '2025-12-08 09:08:49', 0, '2405:201:e067:384e:d771:4cd2:5c0d:d25c'),
(44, '2405:201:e067:384e:d771:4cd2:5c0d:d25c', 'login', '2025-12-08 09:09:03', 0, '2405:201:e067:384e:d771:4cd2:5c0d:d25c'),
(45, '2405:201:e067:384e:d771:4cd2:5c0d:d25c', 'login', '2025-12-08 09:09:39', 0, '2405:201:e067:384e:d771:4cd2:5c0d:d25c'),
(46, '2405:201:e067:384e:d771:4cd2:5c0d:d25c', 'login', '2025-12-08 09:10:07', 1, '2405:201:e067:384e:d771:4cd2:5c0d:d25c'),
(47, '2405:201:e067:384e:b592:6485:5e8d:33c9', 'login', '2025-12-08 09:17:16', 0, '2405:201:e067:384e:b592:6485:5e8d:33c9'),
(48, '2405:201:e067:384e:b592:6485:5e8d:33c9', 'login', '2025-12-08 09:17:24', 0, '2405:201:e067:384e:b592:6485:5e8d:33c9'),
(49, '2405:201:e067:384e:b592:6485:5e8d:33c9', 'login', '2025-12-08 09:17:43', 0, '2405:201:e067:384e:b592:6485:5e8d:33c9'),
(50, '2405:201:e067:384e:b592:6485:5e8d:33c9', 'login', '2025-12-08 09:18:21', 1, '2405:201:e067:384e:b592:6485:5e8d:33c9'),
(51, '2405:201:e067:384e:b592:6485:5e8d:33c9', 'login', '2025-12-08 09:19:45', 1, '2405:201:e067:384e:b592:6485:5e8d:33c9'),
(52, '2405:201:e067:384e:b592:6485:5e8d:33c9', 'login', '2025-12-08 09:20:49', 1, '2405:201:e067:384e:b592:6485:5e8d:33c9'),
(53, '2405:201:e067:384e:856:6bd5:532f:d92b', 'login', '2025-12-08 11:53:46', 1, '2405:201:e067:384e:856:6bd5:532f:d92b'),
(54, '2405:201:e067:384e:945e:3997:9e9b:f6dc', 'login', '2025-12-09 07:15:30', 1, '2405:201:e067:384e:945e:3997:9e9b:f6dc'),
(55, '2405:201:e067:384e:945e:3997:9e9b:f6dc', 'login', '2025-12-09 07:24:28', 0, '2405:201:e067:384e:945e:3997:9e9b:f6dc'),
(56, '2405:201:e067:384e:945e:3997:9e9b:f6dc', 'login', '2025-12-09 07:24:36', 0, '2405:201:e067:384e:945e:3997:9e9b:f6dc'),
(57, '2405:201:e067:384e:945e:3997:9e9b:f6dc', 'login', '2025-12-09 07:24:52', 1, '2405:201:e067:384e:945e:3997:9e9b:f6dc'),
(58, '2405:201:e067:384e:945e:3997:9e9b:f6dc', 'login', '2025-12-09 07:25:12', 1, '2405:201:e067:384e:945e:3997:9e9b:f6dc'),
(59, '2405:201:e067:384e:945e:3997:9e9b:f6dc', 'login', '2025-12-09 07:25:25', 1, '2405:201:e067:384e:945e:3997:9e9b:f6dc'),
(60, '2405:201:e067:384e:2d58:85d9:954c:e72', 'login', '2025-12-09 07:33:37', 1, '2405:201:e067:384e:2d58:85d9:954c:e72'),
(61, '2409:40f4:101d:c986:20a8:b5ff:fe48:36f4', 'login', '2025-12-09 07:46:24', 1, '2409:40f4:101d:c986:20a8:b5ff:fe48:36f4'),
(62, '2405:201:e067:384e:945e:3997:9e9b:f6dc', 'login', '2025-12-09 11:58:57', 0, '2405:201:e067:384e:945e:3997:9e9b:f6dc'),
(63, '2405:201:e067:384e:945e:3997:9e9b:f6dc', 'login', '2025-12-09 11:59:09', 1, '2405:201:e067:384e:945e:3997:9e9b:f6dc'),
(64, '2405:201:e067:384e:85b1:6107:538a:6be', 'login', '2025-12-09 12:17:45', 1, '2405:201:e067:384e:85b1:6107:538a:6be'),
(65, '2405:201:e067:384e:945e:3997:9e9b:f6dc', 'login', '2025-12-09 12:18:09', 1, '2405:201:e067:384e:945e:3997:9e9b:f6dc'),
(66, '2409:4072:8db4:8733:15d4:713b:5018:e1c9', 'login', '2025-12-09 17:42:09', 1, '2409:4072:8db4:8733:15d4:713b:5018:e1c9'),
(67, '2402:3a80:59:5bf2:3622:8df:bd28:ffb7', 'login', '2025-12-09 17:43:28', 1, '2402:3a80:59:5bf2:3622:8df:bd28:ffb7'),
(68, '42.104.142.33', 'login', '2025-12-09 17:49:53', 1, '42.104.142.33'),
(69, '2402:3a80:59:5bf2:3622:8df:bd28:ffb7', 'login', '2025-12-09 17:50:43', 0, '2402:3a80:59:5bf2:3622:8df:bd28:ffb7'),
(70, '2402:3a80:59:5bf2:3622:8df:bd28:ffb7', 'login', '2025-12-09 17:51:14', 1, '2402:3a80:59:5bf2:3622:8df:bd28:ffb7'),
(71, '2402:3a80:59:5bf2:9132:f8e6:f8da:3937', 'login', '2025-12-09 18:30:45', 1, '2402:3a80:59:5bf2:9132:f8e6:f8da:3937'),
(72, '2402:3a80:59:5bf2:9132:f8e6:f8da:3937', 'login', '2025-12-09 18:31:21', 1, '2402:3a80:59:5bf2:9132:f8e6:f8da:3937'),
(73, '42.104.142.33', 'login', '2025-12-09 18:32:43', 1, '42.104.142.33'),
(74, '2409:4072:8db4:8733:e925:6277:40b3:dcea', 'login', '2025-12-10 02:24:02', 0, '2409:4072:8db4:8733:e925:6277:40b3:dcea'),
(75, '2409:4072:8db4:8733:e925:6277:40b3:dcea', 'login', '2025-12-10 02:24:52', 0, '2409:4072:8db4:8733:e925:6277:40b3:dcea'),
(76, '2409:4072:8db4:8733:e925:6277:40b3:dcea', 'login', '2025-12-10 02:25:07', 0, '2409:4072:8db4:8733:e925:6277:40b3:dcea'),
(77, '2409:4072:8db4:8733:e925:6277:40b3:dcea', 'login', '2025-12-10 02:25:21', 1, '2409:4072:8db4:8733:e925:6277:40b3:dcea'),
(78, '2405:201:e067:384e:d93c:cfce:b56e:be53', 'login', '2025-12-10 03:33:27', 1, '2405:201:e067:384e:d93c:cfce:b56e:be53'),
(79, '2405:201:e067:384e:d93c:cfce:b56e:be53', 'login', '2025-12-10 03:34:44', 1, '2405:201:e067:384e:d93c:cfce:b56e:be53'),
(80, '2405:201:e067:384e:d93c:cfce:b56e:be53', 'login', '2025-12-10 03:37:43', 1, '2405:201:e067:384e:d93c:cfce:b56e:be53'),
(81, '2405:201:e067:384e:cbeb:308b:3f38:668c', 'login', '2025-12-10 03:45:38', 1, '2405:201:e067:384e:cbeb:308b:3f38:668c'),
(82, '2405:201:e067:384e:cbeb:308b:3f38:668c', 'login', '2025-12-10 03:46:03', 1, '2405:201:e067:384e:cbeb:308b:3f38:668c'),
(83, '2405:201:e067:384e:cbeb:308b:3f38:668c', 'login', '2025-12-10 03:46:18', 1, '2405:201:e067:384e:cbeb:308b:3f38:668c'),
(84, '2405:201:e067:384e:b5bf:2a1e:36b3:b309', 'login', '2025-12-10 03:48:08', 1, '2405:201:e067:384e:b5bf:2a1e:36b3:b309'),
(85, '2405:201:e067:384e:b5bf:2a1e:36b3:b309', 'login', '2025-12-10 03:49:19', 1, '2405:201:e067:384e:b5bf:2a1e:36b3:b309'),
(86, '49.37.192.59', 'login', '2025-12-10 03:55:23', 0, '49.37.192.59'),
(87, '49.37.192.59', 'login', '2025-12-10 03:55:41', 0, '49.37.192.59'),
(88, '49.37.192.59', 'login', '2025-12-10 03:55:52', 1, '49.37.192.59'),
(89, '49.37.192.59', 'login', '2025-12-10 03:56:54', 1, '49.37.192.59'),
(90, '2405:201:e067:384e:b5bf:2a1e:36b3:b309', 'login', '2025-12-10 04:02:31', 1, '2405:201:e067:384e:b5bf:2a1e:36b3:b309'),
(91, '2405:201:e067:384e:b5bf:2a1e:36b3:b309', 'login', '2025-12-10 04:11:33', 1, '2405:201:e067:384e:b5bf:2a1e:36b3:b309'),
(92, '2405:201:e067:384e:5004:7f2d:7ffa:2185', 'login', '2025-12-10 04:21:44', 0, '2405:201:e067:384e:5004:7f2d:7ffa:2185'),
(93, '2405:201:e067:384e:5004:7f2d:7ffa:2185', 'login', '2025-12-10 04:23:16', 1, '2405:201:e067:384e:5004:7f2d:7ffa:2185'),
(94, '2405:201:e067:384e:d93c:cfce:b56e:be53', 'login', '2025-12-10 05:42:31', 1, '2405:201:e067:384e:d93c:cfce:b56e:be53'),
(95, '2405:201:e067:384e:d93c:cfce:b56e:be53', 'login', '2025-12-10 05:43:02', 1, '2405:201:e067:384e:d93c:cfce:b56e:be53'),
(96, '2405:201:e067:384e:d93c:cfce:b56e:be53', 'login', '2025-12-10 05:43:14', 1, '2405:201:e067:384e:d93c:cfce:b56e:be53'),
(97, '2405:201:e067:384e:7522:ca33:320a:a5c9', 'login', '2025-12-10 14:43:14', 1, '2405:201:e067:384e:7522:ca33:320a:a5c9'),
(98, '2402:3a80:20:e9e4:1c19:a6a8:de72:c02f', 'login', '2025-12-11 00:09:23', 1, '2402:3a80:20:e9e4:1c19:a6a8:de72:c02f'),
(99, '2402:3a80:20:e9e4:1c19:a6a8:de72:c02f', 'login', '2025-12-11 00:09:35', 1, '2402:3a80:20:e9e4:1c19:a6a8:de72:c02f'),
(100, '2402:3a80:20:e9e4:1c19:a6a8:de72:c02f', 'login', '2025-12-11 00:10:41', 0, '2402:3a80:20:e9e4:1c19:a6a8:de72:c02f'),
(101, '2402:3a80:20:e9e4:1c19:a6a8:de72:c02f', 'login', '2025-12-11 00:11:57', 1, '2402:3a80:20:e9e4:1c19:a6a8:de72:c02f'),
(102, '2405:201:e067:384e:b415:c907:d4dc:30b6', 'login', '2025-12-11 02:47:25', 1, '2405:201:e067:384e:b415:c907:d4dc:30b6'),
(103, '2405:201:e067:384e:b415:c907:d4dc:30b6', 'login', '2025-12-11 02:51:48', 1, '2405:201:e067:384e:b415:c907:d4dc:30b6'),
(104, '2405:201:e067:384e:b415:c907:d4dc:30b6', 'login', '2025-12-11 02:52:00', 1, '2405:201:e067:384e:b415:c907:d4dc:30b6'),
(105, '2402:3a80:48:56a6:78c0:ec58:228d:7dee', 'login', '2025-12-11 02:56:45', 1, '2402:3a80:48:56a6:78c0:ec58:228d:7dee'),
(106, '2405:201:e067:384e:95be:909:2d73:fe64', 'login', '2025-12-11 02:57:49', 1, '2405:201:e067:384e:95be:909:2d73:fe64'),
(107, '2405:201:e067:384e:d434:23b5:542b:97a', 'login', '2025-12-11 03:00:43', 1, '2405:201:e067:384e:d434:23b5:542b:97a'),
(108, '49.37.192.59', 'login', '2025-12-11 03:10:50', 0, '49.37.192.59'),
(109, '49.37.192.59', 'login', '2025-12-11 03:11:16', 0, '49.37.192.59'),
(110, '49.37.192.59', 'login', '2025-12-11 03:11:39', 0, '49.37.192.59'),
(111, '49.37.192.59', 'login', '2025-12-11 03:13:01', 1, '49.37.192.59'),
(112, '2405:201:e067:384e:d434:23b5:542b:97a', 'login', '2025-12-11 03:19:28', 1, '2405:201:e067:384e:d434:23b5:542b:97a'),
(113, '2405:201:e067:384e:95be:909:2d73:fe64', 'login', '2025-12-11 03:20:00', 1, '2405:201:e067:384e:95be:909:2d73:fe64'),
(114, '2405:201:e067:384e:f049:c900:37c7:f50d', 'login', '2025-12-11 03:49:41', 1, '2405:201:e067:384e:f049:c900:37c7:f50d'),
(115, '2405:201:e067:384e:f049:c900:37c7:f50d', 'login', '2025-12-11 03:50:43', 1, '2405:201:e067:384e:f049:c900:37c7:f50d'),
(116, '2405:201:e067:384e:f049:c900:37c7:f50d', 'login', '2025-12-11 04:03:30', 1, '2405:201:e067:384e:f049:c900:37c7:f50d'),
(117, '2405:201:e067:384e:f049:c900:37c7:f50d', 'login', '2025-12-11 04:05:27', 1, '2405:201:e067:384e:f049:c900:37c7:f50d'),
(118, '2405:201:e067:384e:ed84:93a3:490e:b515', 'login', '2025-12-11 05:34:26', 1, '2405:201:e067:384e:ed84:93a3:490e:b515'),
(119, '2405:201:e067:384e:5b9:b10c:76b8:ed4b', 'login', '2025-12-11 07:10:53', 1, '2405:201:e067:384e:5b9:b10c:76b8:ed4b'),
(120, '2405:201:e067:384e:5b9:b10c:76b8:ed4b', 'login', '2025-12-11 07:11:15', 1, '2405:201:e067:384e:5b9:b10c:76b8:ed4b'),
(121, '49.37.192.59', 'login', '2025-12-11 07:19:29', 1, '49.37.192.59'),
(122, '49.37.192.59', 'login', '2025-12-11 07:19:41', 1, '49.37.192.59'),
(123, '2405:201:e067:384e:8556:9431:c10e:26a1', 'login', '2025-12-11 07:24:27', 1, '2405:201:e067:384e:8556:9431:c10e:26a1'),
(124, '2405:201:e067:384e:5b9:b10c:76b8:ed4b', 'login', '2025-12-11 07:28:54', 1, '2405:201:e067:384e:5b9:b10c:76b8:ed4b'),
(125, '2405:201:e067:384e:5b9:b10c:76b8:ed4b', 'login', '2025-12-11 07:31:25', 1, '2405:201:e067:384e:5b9:b10c:76b8:ed4b'),
(126, '49.37.192.59', 'login', '2025-12-11 07:31:48', 1, '49.37.192.59'),
(127, '2405:201:e067:384e:8556:9431:c10e:26a1', 'login', '2025-12-11 07:41:42', 0, '2405:201:e067:384e:8556:9431:c10e:26a1'),
(128, '2405:201:e067:384e:8556:9431:c10e:26a1', 'login', '2025-12-11 07:43:20', 1, '2405:201:e067:384e:8556:9431:c10e:26a1'),
(129, '2405:201:e067:384e:8556:9431:c10e:26a1', 'login', '2025-12-11 07:52:48', 1, '2405:201:e067:384e:8556:9431:c10e:26a1'),
(130, '2405:201:e067:384e:8556:9431:c10e:26a1', 'login', '2025-12-11 07:52:59', 1, '2405:201:e067:384e:8556:9431:c10e:26a1'),
(131, '2405:201:e067:384e:ba2c:b394:794e:b1c9', 'login', '2025-12-11 07:54:13', 1, '2405:201:e067:384e:ba2c:b394:794e:b1c9'),
(132, '2405:201:e067:384e:ba2c:b394:794e:b1c9', 'login', '2025-12-11 08:11:11', 1, '2405:201:e067:384e:ba2c:b394:794e:b1c9'),
(133, '2405:201:e067:384e:ba2c:b394:794e:b1c9', 'login', '2025-12-11 08:24:09', 1, '2405:201:e067:384e:ba2c:b394:794e:b1c9'),
(134, '2405:201:e067:384e:ba2c:b394:794e:b1c9', 'login', '2025-12-11 08:27:11', 1, '2405:201:e067:384e:ba2c:b394:794e:b1c9'),
(135, '49.37.192.59', 'login', '2025-12-11 08:38:28', 1, '49.37.192.59'),
(136, '2405:201:e067:384e:117:2030:a211:8391', 'login', '2025-12-11 08:41:00', 1, '2405:201:e067:384e:117:2030:a211:8391'),
(137, '2405:201:e067:384e:1491:d9bf:f36b:64f3', 'login', '2025-12-11 12:06:36', 1, '2405:201:e067:384e:1491:d9bf:f36b:64f3'),
(138, '2405:201:e067:384e:1491:d9bf:f36b:64f3', 'login', '2025-12-11 12:10:38', 1, '2405:201:e067:384e:1491:d9bf:f36b:64f3'),
(139, '2405:201:e067:384e:f5da:8d68:12cc:2a2', 'login', '2025-12-11 12:11:43', 1, '2405:201:e067:384e:f5da:8d68:12cc:2a2'),
(140, '2405:201:e067:384e:1491:d9bf:f36b:64f3', 'login', '2025-12-11 12:12:14', 1, '2405:201:e067:384e:1491:d9bf:f36b:64f3'),
(141, '2405:201:e067:384e:f5da:8d68:12cc:2a2', 'login', '2025-12-11 12:36:46', 1, '2405:201:e067:384e:f5da:8d68:12cc:2a2'),
(142, '2405:201:e067:384e:1491:d9bf:f36b:64f3', 'login', '2025-12-11 13:53:49', 1, '2405:201:e067:384e:1491:d9bf:f36b:64f3'),
(143, '2405:201:e067:384e:5b9:b10c:76b8:ed4b', 'login', '2025-12-11 15:01:20', 0, '2405:201:e067:384e:5b9:b10c:76b8:ed4b'),
(144, '2405:201:e067:384e:5b9:b10c:76b8:ed4b', 'login', '2025-12-11 15:01:27', 1, '2405:201:e067:384e:5b9:b10c:76b8:ed4b'),
(145, '2405:201:e067:384e:5b9:b10c:76b8:ed4b', 'login', '2025-12-11 15:05:07', 1, '2405:201:e067:384e:5b9:b10c:76b8:ed4b'),
(146, '2405:201:e067:384e:5b9:b10c:76b8:ed4b', 'login', '2025-12-11 15:16:26', 1, '2405:201:e067:384e:5b9:b10c:76b8:ed4b'),
(147, '2405:201:e067:384e:cd15:5e98:2853:9cab', 'login', '2025-12-12 04:19:26', 1, '2405:201:e067:384e:cd15:5e98:2853:9cab'),
(148, '2405:201:e067:384e:cd15:5e98:2853:9cab', 'login', '2025-12-12 04:26:49', 1, '2405:201:e067:384e:cd15:5e98:2853:9cab'),
(149, '2405:201:e067:384e:86:bff2:2860:cec6', 'login', '2025-12-12 06:35:28', 1, '2405:201:e067:384e:86:bff2:2860:cec6'),
(150, '2405:201:e067:384e:d06e:ccaa:61b6:42db', 'login', '2025-12-12 11:44:35', 1, '2405:201:e067:384e:d06e:ccaa:61b6:42db'),
(151, '2405:201:e067:384e:d06e:ccaa:61b6:42db', 'login', '2025-12-12 11:44:59', 1, '2405:201:e067:384e:d06e:ccaa:61b6:42db'),
(152, '2405:201:e067:384e:d06e:ccaa:61b6:42db', 'login', '2025-12-12 11:51:49', 1, '2405:201:e067:384e:d06e:ccaa:61b6:42db'),
(153, '2405:201:e067:384e:d06e:ccaa:61b6:42db', 'login', '2025-12-12 11:59:57', 1, '2405:201:e067:384e:d06e:ccaa:61b6:42db'),
(154, '2405:201:e067:384e:86:bff2:2860:cec6', 'login', '2025-12-12 14:09:31', 1, '2405:201:e067:384e:86:bff2:2860:cec6'),
(155, '2405:201:e067:384e:d5de:ff05:f54c:dd12', 'login', '2025-12-15 03:56:23', 1, '2405:201:e067:384e:d5de:ff05:f54c:dd12'),
(156, '2405:201:e067:384e:d5de:ff05:f54c:dd12', 'login', '2025-12-15 03:57:00', 1, '2405:201:e067:384e:d5de:ff05:f54c:dd12'),
(157, '2405:201:e067:384e:d5de:ff05:f54c:dd12', 'login', '2025-12-15 03:57:09', 1, '2405:201:e067:384e:d5de:ff05:f54c:dd12'),
(158, '2405:201:e067:384e:d5de:ff05:f54c:dd12', 'login', '2025-12-15 04:11:58', 1, '2405:201:e067:384e:d5de:ff05:f54c:dd12'),
(159, '2405:201:e067:384e:f8c6:ce73:aa9c:d89a', 'login', '2025-12-15 04:28:49', 1, '2405:201:e067:384e:f8c6:ce73:aa9c:d89a'),
(160, '2405:201:e067:384e:d5de:ff05:f54c:dd12', 'login', '2025-12-15 04:42:07', 1, '2405:201:e067:384e:d5de:ff05:f54c:dd12'),
(161, '2405:201:e067:384e:d5de:ff05:f54c:dd12', 'login', '2025-12-15 04:42:32', 1, '2405:201:e067:384e:d5de:ff05:f54c:dd12'),
(162, '2405:201:e067:384e:d5de:ff05:f54c:dd12', 'login', '2025-12-15 05:46:24', 1, '2405:201:e067:384e:d5de:ff05:f54c:dd12'),
(163, '2405:201:e067:384e:d5de:ff05:f54c:dd12', 'login', '2025-12-15 05:54:51', 1, '2405:201:e067:384e:d5de:ff05:f54c:dd12'),
(164, '2405:201:e067:384e:d5de:ff05:f54c:dd12', 'login', '2025-12-15 06:01:21', 1, '2405:201:e067:384e:d5de:ff05:f54c:dd12'),
(165, '2405:201:e067:384e:d5de:ff05:f54c:dd12', 'login', '2025-12-15 06:04:01', 1, '2405:201:e067:384e:d5de:ff05:f54c:dd12'),
(166, '2405:201:e067:384e:d5de:ff05:f54c:dd12', 'login', '2025-12-15 06:06:10', 1, '2405:201:e067:384e:d5de:ff05:f54c:dd12'),
(167, '2405:201:e067:384e:f8c6:ce73:aa9c:d89a', 'login', '2025-12-15 06:08:55', 1, '2405:201:e067:384e:f8c6:ce73:aa9c:d89a'),
(168, '2405:201:e067:384e:d5de:ff05:f54c:dd12', 'login', '2025-12-15 06:09:17', 1, '2405:201:e067:384e:d5de:ff05:f54c:dd12'),
(169, '2405:201:e067:384e:d5de:ff05:f54c:dd12', 'login', '2025-12-15 06:11:08', 1, '2405:201:e067:384e:d5de:ff05:f54c:dd12'),
(170, '2405:201:e067:384e:d5de:ff05:f54c:dd12', 'login', '2025-12-15 06:21:01', 1, '2405:201:e067:384e:d5de:ff05:f54c:dd12'),
(171, '2405:201:e067:384e:f8c6:ce73:aa9c:d89a', 'login', '2025-12-15 06:32:16', 1, '2405:201:e067:384e:f8c6:ce73:aa9c:d89a'),
(172, '2405:201:e067:384e:f8c6:ce73:aa9c:d89a', 'login', '2025-12-15 06:39:37', 1, '2405:201:e067:384e:f8c6:ce73:aa9c:d89a'),
(173, '2405:201:e067:384e:f8c6:ce73:aa9c:d89a', 'login', '2025-12-15 10:44:23', 1, '2405:201:e067:384e:f8c6:ce73:aa9c:d89a'),
(174, '2405:201:e067:384e:f8c6:ce73:aa9c:d89a', 'login', '2025-12-15 10:47:45', 1, '2405:201:e067:384e:f8c6:ce73:aa9c:d89a'),
(175, '2405:201:e067:384e:f8c6:ce73:aa9c:d89a', 'login', '2025-12-15 11:08:52', 1, '2405:201:e067:384e:f8c6:ce73:aa9c:d89a'),
(176, '2405:201:e067:384e:f8c6:ce73:aa9c:d89a', 'login', '2025-12-15 11:23:28', 1, '2405:201:e067:384e:f8c6:ce73:aa9c:d89a'),
(177, '2405:201:e067:384e:f8c6:ce73:aa9c:d89a', 'login', '2025-12-15 11:32:41', 1, '2405:201:e067:384e:f8c6:ce73:aa9c:d89a'),
(178, '2405:201:e067:384e:d0db:282b:a4f7:e0c1', 'login', '2025-12-16 09:03:09', 1, '2405:201:e067:384e:d0db:282b:a4f7:e0c1'),
(179, '2402:3a80:3a:36f8:b529:2727:6ba2:63f2', 'login', '2025-12-16 18:01:09', 1, '2402:3a80:3a:36f8:b529:2727:6ba2:63f2'),
(180, '2402:3a80:3a:36f8:b529:2727:6ba2:63f2', 'login', '2025-12-16 18:01:48', 0, '2402:3a80:3a:36f8:b529:2727:6ba2:63f2'),
(181, '2402:3a80:3a:36f8:b529:2727:6ba2:63f2', 'login', '2025-12-16 18:01:57', 1, '2402:3a80:3a:36f8:b529:2727:6ba2:63f2'),
(182, '2402:3a80:3a:36f8:b529:2727:6ba2:63f2', 'login', '2025-12-16 18:02:17', 1, '2402:3a80:3a:36f8:b529:2727:6ba2:63f2'),
(183, '2402:3a80:3a:36f8:169d:c25e:779:8e8d', 'login', '2025-12-16 18:11:53', 1, '2402:3a80:3a:36f8:169d:c25e:779:8e8d'),
(184, '2402:3a80:3a:36f8:b529:2727:6ba2:63f2', 'login', '2025-12-16 18:34:10', 1, '2402:3a80:3a:36f8:b529:2727:6ba2:63f2'),
(185, '2405:201:e067:384e:d51f:5d9e:37a4:95a8', 'login', '2025-12-17 03:51:37', 1, '2405:201:e067:384e:d51f:5d9e:37a4:95a8'),
(186, '2405:201:e067:384e:d51f:5d9e:37a4:95a8', 'login', '2025-12-17 04:06:29', 1, '2405:201:e067:384e:d51f:5d9e:37a4:95a8'),
(187, '2405:201:e067:384e:d51f:5d9e:37a4:95a8', 'login', '2025-12-17 04:06:43', 1, '2405:201:e067:384e:d51f:5d9e:37a4:95a8'),
(188, '2405:201:e067:384e:1410:620f:4535:a038', 'login', '2025-12-18 03:52:09', 1, '2405:201:e067:384e:1410:620f:4535:a038'),
(189, '2405:201:e067:384e:e1c1:9949:ea8:f188', 'login', '2025-12-18 04:59:25', 1, '2405:201:e067:384e:e1c1:9949:ea8:f188'),
(190, '2405:201:e067:384e:a896:da0d:5967:9669', 'login', '2025-12-18 08:06:39', 1, '2405:201:e067:384e:a896:da0d:5967:9669'),
(191, '2405:201:e067:384e:1410:620f:4535:a038', 'login', '2025-12-18 13:44:45', 1, '2405:201:e067:384e:1410:620f:4535:a038'),
(192, '2409:40f4:10f4:1dc7:e82c:1f55:57ec:4c80', 'login', '2025-12-18 16:05:01', 1, '2409:40f4:10f4:1dc7:e82c:1f55:57ec:4c80'),
(193, '2409:40f4:10f4:1dc7:e82c:1f55:57ec:4c80', 'login', '2025-12-18 16:49:49', 1, '2409:40f4:10f4:1dc7:e82c:1f55:57ec:4c80'),
(194, '2409:40f4:10f4:1dc7:e82c:1f55:57ec:4c80', 'login', '2025-12-18 20:00:16', 1, '2409:40f4:10f4:1dc7:e82c:1f55:57ec:4c80'),
(195, '2409:40f4:10f4:1dc7:e82c:1f55:57ec:4c80', 'login', '2025-12-18 20:06:08', 1, '2409:40f4:10f4:1dc7:e82c:1f55:57ec:4c80'),
(196, '2409:40f4:10f4:1dc7:e82c:1f55:57ec:4c80', 'login', '2025-12-18 20:10:11', 1, '2409:40f4:10f4:1dc7:e82c:1f55:57ec:4c80'),
(197, '2409:40f4:10f4:1dc7:e82c:1f55:57ec:4c80', 'login', '2025-12-18 20:24:45', 1, '2409:40f4:10f4:1dc7:e82c:1f55:57ec:4c80'),
(198, '2409:40f4:10f4:1dc7:e82c:1f55:57ec:4c80', 'login', '2025-12-18 20:28:09', 1, '2409:40f4:10f4:1dc7:e82c:1f55:57ec:4c80'),
(199, '2409:40f4:10f4:1dc7:e82c:1f55:57ec:4c80', 'login', '2025-12-18 20:29:31', 1, '2409:40f4:10f4:1dc7:e82c:1f55:57ec:4c80'),
(200, '2409:40f4:10f4:1dc7:e82c:1f55:57ec:4c80', 'login', '2025-12-18 20:31:51', 1, '2409:40f4:10f4:1dc7:e82c:1f55:57ec:4c80'),
(201, '2409:40f4:10f4:1dc7:e82c:1f55:57ec:4c80', 'login', '2025-12-18 20:38:07', 1, '2409:40f4:10f4:1dc7:e82c:1f55:57ec:4c80'),
(202, '2405:201:e067:384e:a83b:55e6:fc2c:824', 'login', '2025-12-19 03:58:09', 1, '2405:201:e067:384e:a83b:55e6:fc2c:824'),
(203, '2405:201:e067:384e:a83b:55e6:fc2c:824', 'login', '2025-12-19 04:00:52', 1, '2405:201:e067:384e:a83b:55e6:fc2c:824'),
(204, '2405:201:e067:384e:a83b:55e6:fc2c:824', 'login', '2025-12-19 04:05:17', 1, '2405:201:e067:384e:a83b:55e6:fc2c:824'),
(205, '2405:201:e067:384e:a83b:55e6:fc2c:824', 'login', '2025-12-19 04:07:35', 1, '2405:201:e067:384e:a83b:55e6:fc2c:824'),
(206, '2405:201:e067:384e:708d:3632:c015:74f9', 'login', '2025-12-19 04:08:00', 1, '2405:201:e067:384e:708d:3632:c015:74f9'),
(207, '2405:201:e067:384e:a83b:55e6:fc2c:824', 'login', '2025-12-19 04:08:04', 1, '2405:201:e067:384e:a83b:55e6:fc2c:824'),
(208, '2405:201:e067:384e:708d:3632:c015:74f9', 'login', '2025-12-19 04:08:36', 1, '2405:201:e067:384e:708d:3632:c015:74f9'),
(209, '2405:201:e067:384e:708d:3632:c015:74f9', 'login', '2025-12-19 04:09:17', 0, '2405:201:e067:384e:708d:3632:c015:74f9'),
(210, '2405:201:e067:384e:708d:3632:c015:74f9', 'login', '2025-12-19 04:09:35', 0, '2405:201:e067:384e:708d:3632:c015:74f9'),
(211, '2405:201:e067:384e:a83b:55e6:fc2c:824', 'login', '2025-12-19 04:09:39', 1, '2405:201:e067:384e:a83b:55e6:fc2c:824'),
(212, '2405:201:e067:384e:a83b:55e6:fc2c:824', 'login', '2025-12-19 04:09:57', 1, '2405:201:e067:384e:a83b:55e6:fc2c:824'),
(213, '2405:201:e067:384e:708d:3632:c015:74f9', 'login', '2025-12-19 04:10:41', 1, '2405:201:e067:384e:708d:3632:c015:74f9'),
(214, '2405:201:e067:384e:a83b:55e6:fc2c:824', 'login', '2025-12-19 04:11:35', 1, '2405:201:e067:384e:a83b:55e6:fc2c:824'),
(215, '2405:201:e067:384e:a83b:55e6:fc2c:824', 'login', '2025-12-19 04:23:57', 1, '2405:201:e067:384e:a83b:55e6:fc2c:824'),
(216, '2405:201:e067:384e:a83b:55e6:fc2c:824', 'login', '2025-12-19 04:55:57', 1, '2405:201:e067:384e:a83b:55e6:fc2c:824'),
(217, '2405:201:e067:384e:a83b:55e6:fc2c:824', 'login', '2025-12-19 06:23:51', 1, '2405:201:e067:384e:a83b:55e6:fc2c:824'),
(218, '2405:201:e067:384e:a83b:55e6:fc2c:824', 'login', '2025-12-19 06:25:28', 1, '2405:201:e067:384e:a83b:55e6:fc2c:824'),
(219, '2405:201:e067:384e:a83b:55e6:fc2c:824', 'login', '2025-12-19 06:27:03', 1, '2405:201:e067:384e:a83b:55e6:fc2c:824'),
(220, '2405:201:e067:384e:a83b:55e6:fc2c:824', 'login', '2025-12-19 06:29:37', 1, '2405:201:e067:384e:a83b:55e6:fc2c:824'),
(221, '2405:201:e067:384e:a83b:55e6:fc2c:824', 'login', '2025-12-19 06:30:24', 1, '2405:201:e067:384e:a83b:55e6:fc2c:824'),
(222, '2405:201:e067:384e:a83b:55e6:fc2c:824', 'login', '2025-12-19 06:33:13', 1, '2405:201:e067:384e:a83b:55e6:fc2c:824'),
(223, '2405:201:e067:384e:708d:3632:c015:74f9', 'login', '2025-12-19 08:02:53', 1, '2405:201:e067:384e:708d:3632:c015:74f9'),
(224, '2405:201:e067:384e:708d:3632:c015:74f9', 'login', '2025-12-19 08:06:37', 1, '2405:201:e067:384e:708d:3632:c015:74f9'),
(225, '2405:201:e067:384e:708d:3632:c015:74f9', 'login', '2025-12-19 08:07:00', 1, '2405:201:e067:384e:708d:3632:c015:74f9'),
(226, '2405:201:e067:384e:a83b:55e6:fc2c:824', 'login', '2025-12-19 08:09:33', 1, '2405:201:e067:384e:a83b:55e6:fc2c:824'),
(227, '2405:201:e067:384e:708d:3632:c015:74f9', 'login', '2025-12-19 08:13:44', 1, '2405:201:e067:384e:708d:3632:c015:74f9'),
(228, '2405:201:e067:384e:708d:3632:c015:74f9', 'login', '2025-12-19 08:15:56', 1, '2405:201:e067:384e:708d:3632:c015:74f9'),
(229, '2405:201:e067:384e:1010:d37c:4644:bcc4', 'login', '2025-12-19 08:15:57', 1, '2405:201:e067:384e:1010:d37c:4644:bcc4'),
(230, '2405:201:e067:384e:1010:d37c:4644:bcc4', 'login', '2025-12-19 08:16:15', 0, '2405:201:e067:384e:1010:d37c:4644:bcc4'),
(231, '2405:201:e067:384e:1010:d37c:4644:bcc4', 'login', '2025-12-19 08:16:21', 1, '2405:201:e067:384e:1010:d37c:4644:bcc4'),
(232, '2405:201:e067:384e:708d:3632:c015:74f9', 'login', '2025-12-19 08:17:05', 1, '2405:201:e067:384e:708d:3632:c015:74f9'),
(233, '2405:201:e067:384e:1010:d37c:4644:bcc4', 'login', '2025-12-19 08:17:10', 1, '2405:201:e067:384e:1010:d37c:4644:bcc4'),
(234, '2405:201:e067:384e:708d:3632:c015:74f9', 'login', '2025-12-19 08:17:25', 1, '2405:201:e067:384e:708d:3632:c015:74f9'),
(235, '2405:201:e067:384e:708d:3632:c015:74f9', 'login', '2025-12-19 08:21:15', 1, '2405:201:e067:384e:708d:3632:c015:74f9'),
(236, '2405:201:e067:384e:708d:3632:c015:74f9', 'login', '2025-12-19 09:21:40', 1, '2405:201:e067:384e:708d:3632:c015:74f9'),
(237, '2409:40f4:1020:17b2:ccf0:b7ff:fe36:2ab0', 'login', '2025-12-19 09:42:55', 1, '2409:40f4:1020:17b2:ccf0:b7ff:fe36:2ab0'),
(238, '2409:40f4:1020:17b2:ccf0:b7ff:fe36:2ab0', 'login', '2025-12-19 09:45:42', 1, '2409:40f4:1020:17b2:ccf0:b7ff:fe36:2ab0'),
(239, '2405:201:e067:384e:5ce1:110a:d830:284b', 'login', '2025-12-19 09:56:18', 0, '2405:201:e067:384e:5ce1:110a:d830:284b'),
(240, '2405:201:e067:384e:5ce1:110a:d830:284b', 'login', '2025-12-19 09:56:43', 1, '2405:201:e067:384e:5ce1:110a:d830:284b'),
(241, '2405:201:e067:384e:708d:3632:c015:74f9', 'login', '2025-12-19 10:05:34', 1, '2405:201:e067:384e:708d:3632:c015:74f9'),
(242, '2405:201:e067:384e:2938:b423:156e:28ed', 'login', '2025-12-19 10:10:57', 1, '2405:201:e067:384e:2938:b423:156e:28ed'),
(243, '49.37.192.59', 'login', '2025-12-19 10:34:36', 1, '49.37.192.59'),
(244, '49.37.192.59', 'login', '2025-12-19 10:34:49', 1, '49.37.192.59'),
(245, '2405:201:e067:384e:708d:3632:c015:74f9', 'login', '2025-12-19 10:40:08', 1, '2405:201:e067:384e:708d:3632:c015:74f9'),
(246, '2405:201:e067:384e:708d:3632:c015:74f9', 'login', '2025-12-19 10:40:22', 1, '2405:201:e067:384e:708d:3632:c015:74f9'),
(247, '2405:201:e067:384e:2938:b423:156e:28ed', 'login', '2025-12-19 10:44:48', 1, '2405:201:e067:384e:2938:b423:156e:28ed'),
(248, '2405:201:e067:384e:2938:b423:156e:28ed', 'login', '2025-12-19 10:46:43', 1, '2405:201:e067:384e:2938:b423:156e:28ed'),
(249, '2405:201:e067:384e:708d:3632:c015:74f9', 'login', '2025-12-19 10:53:07', 1, '2405:201:e067:384e:708d:3632:c015:74f9'),
(250, '2405:201:e067:384e:2938:b423:156e:28ed', 'login', '2025-12-19 10:54:29', 1, '2405:201:e067:384e:2938:b423:156e:28ed'),
(251, '2405:201:e067:384e:708d:3632:c015:74f9', 'login', '2025-12-19 10:54:31', 1, '2405:201:e067:384e:708d:3632:c015:74f9'),
(252, '2405:201:e067:384e:5ce1:110a:d830:284b', 'login', '2025-12-19 11:52:22', 1, '2405:201:e067:384e:5ce1:110a:d830:284b'),
(253, '2409:40f4:102a:471:8000::', 'login', '2025-12-19 12:53:27', 1, '2409:40f4:102a:471:8000::'),
(254, '2405:201:e067:384e:f93c:d477:66e5:59d9', 'login', '2025-12-19 12:59:06', 1, '2405:201:e067:384e:f93c:d477:66e5:59d9'),
(255, '2405:201:e067:384e:f93c:d477:66e5:59d9', 'login', '2025-12-19 13:15:04', 1, '2405:201:e067:384e:f93c:d477:66e5:59d9'),
(256, '2405:201:e067:384e:f93c:d477:66e5:59d9', 'login', '2025-12-19 13:15:22', 1, '2405:201:e067:384e:f93c:d477:66e5:59d9'),
(257, '2405:201:e067:384e:bc32:e6e6:17fd:cae', 'login', '2025-12-22 04:43:54', 1, '2405:201:e067:384e:bc32:e6e6:17fd:cae'),
(258, '2405:201:e067:384e:95a9:c9d6:e66e:34af', 'login', '2025-12-22 04:45:55', 1, '2405:201:e067:384e:95a9:c9d6:e66e:34af'),
(259, '2409:40f2:1015:f74c:8000::', 'login', '2025-12-22 04:56:15', 1, '2409:40f2:1015:f74c:8000::'),
(260, '2409:40f2:3a:1f5a:8000::', 'login', '2025-12-22 04:59:29', 1, '2409:40f2:3a:1f5a:8000::'),
(261, '2401:4900:925a:cef9:be66:5a94:bbef:1c1', 'login', '2025-12-22 05:00:49', 0, '2401:4900:925a:cef9:be66:5a94:bbef:1c1'),
(262, '2401:4900:925a:cef9:be66:5a94:bbef:1c1', 'login', '2025-12-22 05:02:47', 0, '2401:4900:925a:cef9:be66:5a94:bbef:1c1'),
(263, '2401:4900:925a:cef9:be66:5a94:bbef:1c1', 'login', '2025-12-22 05:04:06', 0, '2401:4900:925a:cef9:be66:5a94:bbef:1c1'),
(264, '2409:40f2:3a:1f5a:8000::', 'login', '2025-12-22 05:06:02', 1, '2409:40f2:3a:1f5a:8000::'),
(265, '2409:40f4:1029:b8b:54de:f8ff:fe04:9875', 'login', '2025-12-22 05:11:50', 1, '2409:40f4:1029:b8b:54de:f8ff:fe04:9875'),
(266, '2409:40f4:1036:a2c3:8000::', 'login', '2025-12-22 05:51:53', 1, '2409:40f4:1036:a2c3:8000::'),
(267, '2409:40f4:1036:a2c3:8000::', 'login', '2025-12-22 05:52:30', 1, '2409:40f4:1036:a2c3:8000::'),
(268, '2405:201:e067:384e:956f:2702:e13a:88a9', 'login', '2025-12-22 05:55:52', 1, '2405:201:e067:384e:956f:2702:e13a:88a9'),
(269, '2401:4900:925a:cef9:be66:5a94:bbef:1c1', 'login', '2025-12-22 05:57:47', 0, '2401:4900:925a:cef9:be66:5a94:bbef:1c1'),
(270, '2409:408d:3c86:a00b::2fc8:6c00', 'login', '2025-12-22 06:02:16', 1, '2409:408d:3c86:a00b::2fc8:6c00'),
(271, '2409:40f4:1029:b8b:54de:f8ff:fe04:9875', 'login', '2025-12-22 06:02:51', 0, '2409:40f4:1029:b8b:54de:f8ff:fe04:9875'),
(272, '2409:40f4:1029:b8b:54de:f8ff:fe04:9875', 'login', '2025-12-22 06:03:48', 1, '2409:40f4:1029:b8b:54de:f8ff:fe04:9875'),
(273, '2405:201:e067:384e:4a9:d4cd:36a3:984', 'login', '2025-12-22 06:12:32', 1, '2405:201:e067:384e:4a9:d4cd:36a3:984'),
(274, '2405:201:e067:384e:956f:2702:e13a:88a9', 'login', '2025-12-22 07:09:42', 1, '2405:201:e067:384e:956f:2702:e13a:88a9'),
(275, '2405:201:e067:384e:4a9:d4cd:36a3:984', 'login', '2025-12-22 07:12:18', 1, '2405:201:e067:384e:4a9:d4cd:36a3:984'),
(276, '2405:201:e067:384e:f8c9:dca8:2732:b252', 'login', '2025-12-22 07:18:04', 0, '2405:201:e067:384e:f8c9:dca8:2732:b252'),
(277, '2405:201:e067:384e:f8c9:dca8:2732:b252', 'login', '2025-12-22 07:19:07', 1, '2405:201:e067:384e:f8c9:dca8:2732:b252'),
(278, '2409:40f4:10f8:2073:e8a5:1dff:fe9e:ab80', 'login', '2025-12-22 10:36:37', 1, '2409:40f4:10f8:2073:e8a5:1dff:fe9e:ab80'),
(279, '2405:201:e067:384e:483c:1543:3fe5:f48c', 'login', '2025-12-22 13:03:01', 1, '2405:201:e067:384e:483c:1543:3fe5:f48c'),
(280, '2409:40f2:103a:fe55:8000::', 'login', '2025-12-23 01:55:05', 1, '2409:40f2:103a:fe55:8000::'),
(281, '2409:40f4:102c:ea1a:bcb7:acff:fe1a:24a4', 'login', '2025-12-23 04:25:19', 1, '2409:40f4:102c:ea1a:bcb7:acff:fe1a:24a4'),
(282, '2409:408d:4db7:1d0c::2fc8:df06', 'login', '2025-12-23 05:08:44', 1, '2409:408d:4db7:1d0c::2fc8:df06'),
(283, '2405:201:e067:384e:f03b:98dd:c8a4:fcfa', 'login', '2025-12-23 06:05:10', 1, '2405:201:e067:384e:f03b:98dd:c8a4:fcfa'),
(284, '2409:40f2:205f:7873:8000::', 'login', '2025-12-23 06:07:17', 1, '2409:40f2:205f:7873:8000::'),
(285, '2409:40f2:12c:1d12:8000::', 'login', '2025-12-23 06:08:42', 1, '2409:40f2:12c:1d12:8000::'),
(286, '2409:40f4:102c:ea1a:bcb7:acff:fe1a:24a4', 'login', '2025-12-23 07:16:12', 1, '2409:40f4:102c:ea1a:bcb7:acff:fe1a:24a4'),
(287, '2401:4900:927e:f850:67c9:653d:b966:d393', 'login', '2025-12-23 12:51:31', 1, '2401:4900:927e:f850:67c9:653d:b966:d393'),
(288, '2409:40f2:205f:7873:8000::', 'login', '2025-12-23 13:03:42', 1, '2409:40f2:205f:7873:8000::'),
(289, '2409:40f2:30c:fe72:8000::', 'login', '2025-12-24 03:57:52', 1, '2409:40f2:30c:fe72:8000::'),
(290, '2405:201:e067:384e:c4cd:5251:c43f:a9de', 'login', '2025-12-24 04:07:53', 1, '2405:201:e067:384e:c4cd:5251:c43f:a9de'),
(291, '2405:201:e067:384e:1c7f:cd62:dbf9:9847', 'login', '2025-12-24 04:14:19', 1, '2405:201:e067:384e:1c7f:cd62:dbf9:9847'),
(292, '2405:201:e067:384e:c4cd:5251:c43f:a9de', 'login', '2025-12-24 04:37:11', 1, '2405:201:e067:384e:c4cd:5251:c43f:a9de'),
(293, '2409:40f2:23:14c2:8000::', 'login', '2025-12-24 08:46:47', 1, '2409:40f2:23:14c2:8000::'),
(294, '2405:201:e067:384e:1c7f:cd62:dbf9:9847', 'login', '2025-12-24 08:50:28', 1, '2405:201:e067:384e:1c7f:cd62:dbf9:9847'),
(295, '2405:201:e067:384e:1c7f:cd62:dbf9:9847', 'login', '2025-12-24 08:51:21', 1, '2405:201:e067:384e:1c7f:cd62:dbf9:9847'),
(296, '2405:201:e067:384e:1c7f:cd62:dbf9:9847', 'login', '2025-12-24 08:52:03', 1, '2405:201:e067:384e:1c7f:cd62:dbf9:9847'),
(297, '2405:201:e067:384e:1c7f:cd62:dbf9:9847', 'login', '2025-12-24 08:53:05', 1, '2405:201:e067:384e:1c7f:cd62:dbf9:9847'),
(298, '2405:201:e067:384e:c4cd:5251:c43f:a9de', 'login', '2025-12-24 08:53:22', 1, '2405:201:e067:384e:c4cd:5251:c43f:a9de'),
(299, '2409:40f2:4:786e:8000::', 'login', '2025-12-25 02:20:43', 1, '2409:40f2:4:786e:8000::'),
(300, '2409:40f2:1003:53bf:8000::', 'login', '2025-12-25 04:28:42', 1, '2409:40f2:1003:53bf:8000::'),
(301, '2405:201:e067:384e:98b8:c7ae:f772:9a17', 'login', '2025-12-25 04:33:05', 1, '2405:201:e067:384e:98b8:c7ae:f772:9a17'),
(302, '2405:201:e067:384e:98b8:c7ae:f772:9a17', 'login', '2025-12-25 05:13:49', 0, '2405:201:e067:384e:98b8:c7ae:f772:9a17'),
(303, '2405:201:e067:384e:98b8:c7ae:f772:9a17', 'login', '2025-12-25 05:13:54', 1, '2405:201:e067:384e:98b8:c7ae:f772:9a17'),
(304, '2405:201:e067:384e:a1c4:56d4:6e36:1725', 'login', '2025-12-25 12:08:28', 1, '2405:201:e067:384e:a1c4:56d4:6e36:1725'),
(305, '2409:40f2:2008:d70d:8000::', 'login', '2025-12-26 03:45:07', 1, '2409:40f2:2008:d70d:8000::'),
(306, '2409:40f2:12e:e1b1:8000::', 'login', '2025-12-27 03:55:34', 1, '2409:40f2:12e:e1b1:8000::'),
(307, '2405:201:e067:384e:b9da:dc5b:e51a:b6f1', 'login', '2025-12-27 06:08:50', 1, '2405:201:e067:384e:b9da:dc5b:e51a:b6f1'),
(308, '2409:40f2:304a:33bc:2071:8dff:fe19:d503', 'login', '2025-12-27 09:16:54', 1, '2409:40f2:304a:33bc:2071:8dff:fe19:d503'),
(309, '2409:40f2:304a:33bc:2071:8dff:fe19:d503', 'login', '2025-12-27 13:03:26', 1, '2409:40f2:304a:33bc:2071:8dff:fe19:d503'),
(310, '2409:40f2:3104:d936:449b:2eff:fe73:3594', 'login', '2025-12-28 03:58:37', 1, '2409:40f2:3104:d936:449b:2eff:fe73:3594'),
(311, '2409:40f2:9:e5d0:8000::', 'login', '2025-12-28 04:13:52', 1, '2409:40f2:9:e5d0:8000::'),
(312, '2405:201:e067:384e:5898:1081:4032:d9c2', 'login', '2025-12-28 05:07:33', 1, '2405:201:e067:384e:5898:1081:4032:d9c2'),
(313, '2409:40f2:301c:720f:f4fe:dfff:fe40:f04c', 'login', '2025-12-28 09:21:38', 1, '2409:40f2:301c:720f:f4fe:dfff:fe40:f04c'),
(314, '2405:201:e067:384e:2112:27f2:f581:71e', 'login', '2025-12-29 04:29:20', 1, '2405:201:e067:384e:2112:27f2:f581:71e'),
(315, '2409:40f2:103d:7d60:8000::', 'login', '2025-12-29 05:23:40', 1, '2409:40f2:103d:7d60:8000::'),
(316, '2409:40f2:307:a01:8000::', 'login', '2025-12-30 03:50:43', 1, '2409:40f2:307:a01:8000::'),
(317, '2409:40f2:300c:aca0:6c3e:ecff:fec4:4845', 'login', '2025-12-30 04:14:00', 1, '2409:40f2:300c:aca0:6c3e:ecff:fec4:4845'),
(318, '2409:40f2:3145:96f5:86c:78ff:fe88:3963', 'login', '2025-12-30 12:08:44', 1, '2409:40f2:3145:96f5:86c:78ff:fe88:3963'),
(319, '2405:201:e067:384e:30e5:20:1cc5:1ad6', 'login', '2025-12-31 03:57:05', 1, '2405:201:e067:384e:30e5:20:1cc5:1ad6'),
(320, '2405:201:e067:384e:30e5:20:1cc5:1ad6', 'login', '2025-12-31 03:59:43', 0, '2405:201:e067:384e:30e5:20:1cc5:1ad6'),
(321, '2405:201:e067:384e:30e5:20:1cc5:1ad6', 'login', '2025-12-31 03:59:55', 0, '2405:201:e067:384e:30e5:20:1cc5:1ad6'),
(322, '2405:201:e067:384e:30e5:20:1cc5:1ad6', 'login', '2025-12-31 04:00:01', 0, '2405:201:e067:384e:30e5:20:1cc5:1ad6'),
(323, '2405:201:e067:384e:30e5:20:1cc5:1ad6', 'login', '2025-12-31 04:00:04', 0, '2405:201:e067:384e:30e5:20:1cc5:1ad6'),
(324, '2405:201:e067:384e:30e5:20:1cc5:1ad6', 'login', '2025-12-31 04:00:05', 0, '2405:201:e067:384e:30e5:20:1cc5:1ad6'),
(325, '2405:201:e067:384e:30e5:20:1cc5:1ad6', 'login', '2025-12-31 04:00:09', 0, '2405:201:e067:384e:30e5:20:1cc5:1ad6'),
(326, '2405:201:e067:384e:30e5:20:1cc5:1ad6', 'login', '2025-12-31 04:00:18', 0, '2405:201:e067:384e:30e5:20:1cc5:1ad6'),
(327, '2405:201:e067:384e:30e5:20:1cc5:1ad6', 'login', '2025-12-31 04:00:30', 1, '2405:201:e067:384e:30e5:20:1cc5:1ad6'),
(328, '2405:201:e067:384e:e91f:c0cc:1b3a:a15', 'login', '2025-12-31 04:00:33', 1, '2405:201:e067:384e:e91f:c0cc:1b3a:a15'),
(329, '2409:40f2:1008:e916:8000::', 'login', '2025-12-31 04:11:11', 1, '2409:40f2:1008:e916:8000::'),
(330, '2409:40f2:3145:96f5:86c:78ff:fe88:3963', 'login', '2025-12-31 04:25:04', 1, '2409:40f2:3145:96f5:86c:78ff:fe88:3963'),
(331, '2405:201:e067:384e:e91f:c0cc:1b3a:a15', 'login', '2025-12-31 04:27:51', 1, '2405:201:e067:384e:e91f:c0cc:1b3a:a15'),
(332, '2405:201:e067:384e:e91f:c0cc:1b3a:a15', 'login', '2025-12-31 04:29:27', 0, '2405:201:e067:384e:e91f:c0cc:1b3a:a15'),
(333, '2405:201:e067:384e:e91f:c0cc:1b3a:a15', 'login', '2025-12-31 04:29:50', 0, '2405:201:e067:384e:e91f:c0cc:1b3a:a15'),
(334, '2405:201:e067:384e:e91f:c0cc:1b3a:a15', 'login', '2025-12-31 04:31:06', 0, '2405:201:e067:384e:e91f:c0cc:1b3a:a15'),
(335, '2405:201:e067:384e:e91f:c0cc:1b3a:a15', 'login', '2025-12-31 04:33:18', 1, '2405:201:e067:384e:e91f:c0cc:1b3a:a15'),
(336, '2405:201:e067:384e:e91f:c0cc:1b3a:a15', 'login', '2025-12-31 04:34:05', 1, '2405:201:e067:384e:e91f:c0cc:1b3a:a15'),
(337, '2405:201:e067:384e:e91f:c0cc:1b3a:a15', 'login', '2025-12-31 04:34:45', 1, '2405:201:e067:384e:e91f:c0cc:1b3a:a15'),
(338, '2405:201:e067:384e:e91f:c0cc:1b3a:a15', 'login', '2025-12-31 05:26:03', 1, '2405:201:e067:384e:e91f:c0cc:1b3a:a15'),
(339, '2405:201:e067:384e:e91f:c0cc:1b3a:a15', 'login', '2025-12-31 07:54:35', 1, '2405:201:e067:384e:e91f:c0cc:1b3a:a15'),
(340, '2409:40f2:3016:30e9:a059:8bff:fea5:a4e', 'login', '2025-12-31 12:21:43', 1, '2409:40f2:3016:30e9:a059:8bff:fea5:a4e'),
(341, '2405:201:e067:384e:200e:4e45:eae4:d0e3', 'login', '2026-01-01 04:46:23', 1, '2405:201:e067:384e:200e:4e45:eae4:d0e3'),
(342, '2405:201:e067:384e:a420:4f3:5bbf:c53f', 'login', '2026-01-01 05:14:16', 1, '2405:201:e067:384e:a420:4f3:5bbf:c53f'),
(343, '2405:201:e067:384e:d82b:5880:2585:3350', 'login', '2026-01-01 05:14:22', 0, '2405:201:e067:384e:d82b:5880:2585:3350'),
(344, '2405:201:e067:384e:a420:4f3:5bbf:c53f', 'login', '2026-01-01 05:14:53', 1, '2405:201:e067:384e:a420:4f3:5bbf:c53f'),
(345, '2405:201:e067:384e:dc7a:1187:5ee0:791b', 'login', '2026-01-01 05:15:59', 0, '2405:201:e067:384e:dc7a:1187:5ee0:791b'),
(346, '2405:201:e067:384e:a420:4f3:5bbf:c53f', 'login', '2026-01-01 05:16:07', 1, '2405:201:e067:384e:a420:4f3:5bbf:c53f'),
(347, '2405:201:e067:384e:dc7a:1187:5ee0:791b', 'login', '2026-01-01 05:17:24', 1, '2405:201:e067:384e:dc7a:1187:5ee0:791b'),
(348, '2405:201:e067:384e:d82b:5880:2585:3350', 'login', '2026-01-01 05:17:30', 0, '2405:201:e067:384e:d82b:5880:2585:3350'),
(349, '2405:201:e067:384e:a420:4f3:5bbf:c53f', 'login', '2026-01-01 05:17:33', 1, '2405:201:e067:384e:a420:4f3:5bbf:c53f'),
(350, '2405:201:e067:384e:d82b:5880:2585:3350', 'login', '2026-01-01 05:17:44', 0, '2405:201:e067:384e:d82b:5880:2585:3350'),
(351, '2405:201:e067:384e:a420:4f3:5bbf:c53f', 'login', '2026-01-01 05:18:49', 1, '2405:201:e067:384e:a420:4f3:5bbf:c53f'),
(352, '2405:201:e067:384e:d82b:5880:2585:3350', 'login', '2026-01-01 05:19:15', 0, '2405:201:e067:384e:d82b:5880:2585:3350'),
(353, '2405:201:e067:384e:d82b:5880:2585:3350', 'login', '2026-01-01 05:53:23', 0, '2405:201:e067:384e:d82b:5880:2585:3350'),
(354, '2405:201:e067:384e:a420:4f3:5bbf:c53f', 'login', '2026-01-01 05:56:03', 1, '2405:201:e067:384e:a420:4f3:5bbf:c53f'),
(355, '2405:201:e067:384e:a420:4f3:5bbf:c53f', 'login', '2026-01-01 05:56:14', 1, '2405:201:e067:384e:a420:4f3:5bbf:c53f'),
(356, '2405:201:e067:384e:d82b:5880:2585:3350', 'login', '2026-01-01 07:33:06', 0, '2405:201:e067:384e:d82b:5880:2585:3350'),
(357, '2405:201:e067:384e:d82b:5880:2585:3350', 'login', '2026-01-01 07:33:18', 0, '2405:201:e067:384e:d82b:5880:2585:3350'),
(358, '2405:201:e067:384e:d82b:5880:2585:3350', 'login', '2026-01-01 07:35:20', 0, '2405:201:e067:384e:d82b:5880:2585:3350'),
(359, '2405:201:e067:384e:d82b:5880:2585:3350', 'login', '2026-01-01 07:35:31', 0, '2405:201:e067:384e:d82b:5880:2585:3350'),
(360, '2405:201:e067:384e:a420:4f3:5bbf:c53f', 'login', '2026-01-01 07:40:41', 1, '2405:201:e067:384e:a420:4f3:5bbf:c53f'),
(361, '2405:201:e067:384e:e5d1:4c81:d17b:a300', 'login', '2026-01-01 08:48:46', 1, '2405:201:e067:384e:e5d1:4c81:d17b:a300'),
(362, '2405:201:e067:384e:714c:1e52:dc97:794', 'login', '2026-01-01 08:50:20', 1, '2405:201:e067:384e:714c:1e52:dc97:794'),
(363, '2409:40f2:3058:1ea7:fc89:adff:fe85:7792', 'login', '2026-01-02 03:58:40', 1, '2409:40f2:3058:1ea7:fc89:adff:fe85:7792'),
(364, '2405:201:e067:384e:d53d:a840:9145:882b', 'login', '2026-01-02 04:07:58', 1, '2405:201:e067:384e:d53d:a840:9145:882b'),
(365, '2405:201:e067:384e:d53d:a840:9145:882b', 'login', '2026-01-02 04:08:50', 1, '2405:201:e067:384e:d53d:a840:9145:882b'),
(366, '2405:201:e067:384e:144b:45:b534:dab6', 'login', '2026-01-02 04:10:00', 1, '2405:201:e067:384e:144b:45:b534:dab6'),
(367, '2405:201:e067:384e:144b:45:b534:dab6', 'login', '2026-01-02 04:39:13', 1, '2405:201:e067:384e:144b:45:b534:dab6'),
(368, '2409:40f2:128:ee26:8000::', 'login', '2026-01-02 06:20:51', 1, '2409:40f2:128:ee26:8000::'),
(369, '2409:40f2:3058:1ea7:fc89:adff:fe85:7792', 'login', '2026-01-02 06:26:14', 1, '2409:40f2:3058:1ea7:fc89:adff:fe85:7792'),
(370, '2405:201:e067:384e:144b:45:b534:dab6', 'login', '2026-01-02 06:38:36', 1, '2405:201:e067:384e:144b:45:b534:dab6'),
(371, '2405:201:e067:384e:144b:45:b534:dab6', 'login', '2026-01-02 06:41:03', 1, '2405:201:e067:384e:144b:45:b534:dab6'),
(372, '2409:40f2:3058:1ea7:fc89:adff:fe85:7792', 'login', '2026-01-02 12:49:39', 1, '2409:40f2:3058:1ea7:fc89:adff:fe85:7792'),
(373, '2409:40f2:3058:1ea7:fc89:adff:fe85:7792', 'login', '2026-01-03 04:00:40', 1, '2409:40f2:3058:1ea7:fc89:adff:fe85:7792'),
(374, '2409:40f2:3018:ce65:4cc0:62ff:fe46:96e5', 'login', '2026-01-03 12:06:53', 1, '2409:40f2:3018:ce65:4cc0:62ff:fe46:96e5'),
(375, '2409:40f2:311d:d3bf:b4c2:d7ff:fe88:5416', 'login', '2026-01-04 04:17:55', 1, '2409:40f2:311d:d3bf:b4c2:d7ff:fe88:5416'),
(376, '2409:40f2:311d:d3bf:b4c2:d7ff:fe88:5416', 'login', '2026-01-04 12:12:04', 1, '2409:40f2:311d:d3bf:b4c2:d7ff:fe88:5416'),
(377, '2409:40f2:3111:d891:d499:b6ff:fe51:2d6', 'login', '2026-01-05 04:10:41', 1, '2409:40f2:3111:d891:d499:b6ff:fe51:2d6'),
(378, '2409:40f2:30b:e067:8000::', 'login', '2026-01-05 04:20:35', 1, '2409:40f2:30b:e067:8000::'),
(379, '2409:40f2:3111:d891:d499:b6ff:fe51:2d6', 'login', '2026-01-05 13:15:15', 1, '2409:40f2:3111:d891:d499:b6ff:fe51:2d6'),
(380, '2409:40f2:3111:d891:d499:b6ff:fe51:2d6', 'login', '2026-01-06 04:10:47', 1, '2409:40f2:3111:d891:d499:b6ff:fe51:2d6'),
(381, '2405:201:e067:384e:c528:7471:dd3f:f677', 'login', '2026-01-06 05:10:44', 1, '2405:201:e067:384e:c528:7471:dd3f:f677'),
(382, '2405:201:e067:384e:b099:39a:f4fa:dacf', 'login', '2026-01-06 05:49:18', 1, '2405:201:e067:384e:b099:39a:f4fa:dacf'),
(383, '2405:201:e067:384e:b099:39a:f4fa:dacf', 'login', '2026-01-06 05:49:52', 1, '2405:201:e067:384e:b099:39a:f4fa:dacf'),
(384, '2409:40f2:1037:872a:8000::', 'login', '2026-01-06 05:58:18', 1, '2409:40f2:1037:872a:8000::'),
(385, '2409:40f4:101b:bbb7:8000::', 'login', '2026-01-06 06:00:18', 1, '2409:40f4:101b:bbb7:8000::'),
(386, '2409:40f2:3111:d891:d499:b6ff:fe51:2d6', 'login', '2026-01-06 12:30:08', 1, '2409:40f2:3111:d891:d499:b6ff:fe51:2d6'),
(387, '2409:40f2:1046:56d3:8000::', 'login', '2026-01-07 03:41:46', 1, '2409:40f2:1046:56d3:8000::'),
(388, '2409:40f2:3111:d891:d499:b6ff:fe51:2d6', 'login', '2026-01-07 04:03:32', 1, '2409:40f2:3111:d891:d499:b6ff:fe51:2d6'),
(389, '2409:40f2:3111:d891:d499:b6ff:fe51:2d6', 'login', '2026-01-07 12:42:42', 1, '2409:40f2:3111:d891:d499:b6ff:fe51:2d6'),
(390, '2409:40f2:121:8221:8000::', 'login', '2026-01-08 03:32:25', 1, '2409:40f2:121:8221:8000::'),
(391, '2405:201:e067:384e:144d:af34:ce7e:99eb', 'login', '2026-01-08 04:14:14', 1, '2405:201:e067:384e:144d:af34:ce7e:99eb'),
(392, '2409:40f2:310d:8729:7cb1:e9ff:fe1a:9a7a', 'login', '2026-01-08 04:18:45', 1, '2409:40f2:310d:8729:7cb1:e9ff:fe1a:9a7a'),
(393, '2409:40f2:310d:8729:7cb1:e9ff:fe1a:9a7a', 'login', '2026-01-08 13:32:43', 1, '2409:40f2:310d:8729:7cb1:e9ff:fe1a:9a7a'),
(394, '2409:40f2:1036:2c64:8000::', 'login', '2026-01-09 04:09:32', 1, '2409:40f2:1036:2c64:8000::'),
(395, '2405:201:e067:384e:6c8a:8c1c:db84:5701', 'login', '2026-01-09 04:24:40', 1, '2405:201:e067:384e:6c8a:8c1c:db84:5701'),
(396, '2409:40f2:310d:8729:7cb1:e9ff:fe1a:9a7a', 'login', '2026-01-09 05:01:05', 1, '2409:40f2:310d:8729:7cb1:e9ff:fe1a:9a7a'),
(397, '2409:40f2:3045:abe7:88e0:28ff:fe68:53bc', 'login', '2026-01-09 13:15:57', 1, '2409:40f2:3045:abe7:88e0:28ff:fe68:53bc'),
(398, '2409:40f2:1038:e3cf:8000::', 'login', '2026-01-10 03:28:53', 1, '2409:40f2:1038:e3cf:8000::'),
(399, '2409:40f2:3109:9a09:404d:36ff:fe6e:5db4', 'login', '2026-01-10 04:41:04', 1, '2409:40f2:3109:9a09:404d:36ff:fe6e:5db4'),
(400, '2409:40f2:200b:f40e:8000::', 'login', '2026-01-11 04:40:48', 1, '2409:40f2:200b:f40e:8000::'),
(401, '2409:40f2:3005:1ad0:1827:a8ff:fe18:d667', 'login', '2026-01-11 05:15:28', 1, '2409:40f2:3005:1ad0:1827:a8ff:fe18:d667'),
(402, '2401:4900:64f0:205e:422:9917:b70a:4e9e', 'login', '2026-01-11 07:35:13', 1, '2401:4900:64f0:205e:422:9917:b70a:4e9e'),
(403, '2409:40f4:100c:762e:8000::', 'login', '2026-01-12 04:10:21', 1, '2409:40f4:100c:762e:8000::'),
(404, '2409:40f2:121:91f5:8000::', 'login', '2026-01-12 04:27:52', 1, '2409:40f2:121:91f5:8000::'),
(405, '2409:40f2:300d:ee6b:48ce:9bff:feef:f3b9', 'login', '2026-01-12 04:50:58', 1, '2409:40f2:300d:ee6b:48ce:9bff:feef:f3b9'),
(406, '2409:40f2:304d:6b78:6494:68ff:fe44:4227', 'login', '2026-01-13 04:45:28', 1, '2409:40f2:304d:6b78:6494:68ff:fe44:4227'),
(407, '2409:40f2:3017:90cf:dcf6:64ff:fe81:f60b', 'login', '2026-01-13 13:10:07', 1, '2409:40f2:3017:90cf:dcf6:64ff:fe81:f60b'),
(408, '2405:201:e067:384e:35f5:dd79:66eb:5eef', 'login', '2026-01-14 04:07:16', 1, '2405:201:e067:384e:35f5:dd79:66eb:5eef'),
(409, '2409:40f2:3017:90cf:dcf6:64ff:fe81:f60b', 'login', '2026-01-14 05:01:14', 1, '2409:40f2:3017:90cf:dcf6:64ff:fe81:f60b'),
(410, '2405:201:e067:384e:4eac:7d36:a9d6:d725', 'login', '2026-01-17 04:39:51', 1, '2405:201:e067:384e:4eac:7d36:a9d6:d725'),
(411, '2409:40f2:1039:5a40:8000::', 'login', '2026-01-20 03:45:31', 1, '2409:40f2:1039:5a40:8000::'),
(412, '2409:40f2:2134:5a39:8000::', 'login', '2026-01-21 03:40:31', 1, '2409:40f2:2134:5a39:8000::'),
(413, '2409:40f2:340:6af9:8000::', 'login', '2026-01-22 03:53:41', 1, '2409:40f2:340:6af9:8000::'),
(414, '2409:40f2:100d:cbe6:8000::', 'login', '2026-01-23 03:34:11', 1, '2409:40f2:100d:cbe6:8000::'),
(415, '2409:40f2:45:1802:8000::', 'login', '2026-01-24 03:21:29', 1, '2409:40f2:45:1802:8000::'),
(416, '2409:40f2:104a:3390:8000::', 'login', '2026-01-25 03:30:58', 1, '2409:40f2:104a:3390:8000::'),
(417, '2409:40f2:1010:23a8:8000::', 'login', '2026-01-26 03:35:26', 1, '2409:40f2:1010:23a8:8000::'),
(418, '2409:40f4:102b:8d33:8000::', 'login', '2026-01-26 06:37:42', 1, '2409:40f4:102b:8d33:8000::'),
(419, '2409:40f4:102b:8d33:8000::', 'login', '2026-01-27 03:38:40', 1, '2409:40f4:102b:8d33:8000::');
INSERT INTO `rate_limit_log` (`id`, `identifier`, `action`, `attempted_at`, `success`, `ip_address`) VALUES
(420, '2409:40f2:2174:80c0:8000::', 'login', '2026-01-27 03:43:03', 1, '2409:40f2:2174:80c0:8000::'),
(421, '2409:40f2:2125:efc2:8000::', 'login', '2026-01-28 03:38:15', 1, '2409:40f2:2125:efc2:8000::'),
(422, '2409:40f2:100d:a4c1:8000::', 'login', '2026-01-29 03:28:53', 1, '2409:40f2:100d:a4c1:8000::'),
(423, '2409:40f2:2052:a3ba:8000::', 'login', '2026-01-30 03:35:31', 1, '2409:40f2:2052:a3ba:8000::'),
(424, '2409:40f2:4b:6930:8000::', 'login', '2026-01-31 03:32:51', 1, '2409:40f2:4b:6930:8000::'),
(425, '2409:40f2:3055:97a7:1cad:daff:fe7a:ccc3', 'login', '2026-01-31 04:46:06', 1, '2409:40f2:3055:97a7:1cad:daff:fe7a:ccc3'),
(426, '2409:40f2:205c:e008:8000::', 'login', '2026-02-02 03:44:28', 1, '2409:40f2:205c:e008:8000::'),
(427, '2409:40f2:204a:e08a:8000::', 'login', '2026-02-03 03:12:46', 1, '2409:40f2:204a:e08a:8000::'),
(428, '2409:40f2:314:6fa:8000::', 'login', '2026-02-04 03:19:38', 1, '2409:40f2:314:6fa:8000::'),
(429, '2409:40f2:312:1add:8000::', 'login', '2026-02-05 03:15:43', 1, '2409:40f2:312:1add:8000::'),
(430, '2409:40f2:1036:6d77:8000::', 'login', '2026-02-06 03:37:13', 1, '2409:40f2:1036:6d77:8000::'),
(431, '2405:201:e067:384e:13:bfd:f466:3333', 'login', '2026-02-06 11:12:33', 1, '2405:201:e067:384e:13:bfd:f466:3333'),
(432, '2405:201:e067:384e:a899:acde:494d:4045', 'login', '2026-02-06 11:21:48', 1, '2405:201:e067:384e:a899:acde:494d:4045');

-- --------------------------------------------------------

--
-- Table structure for table `security_logs`
--

CREATE TABLE `security_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `event_type` varchar(50) NOT NULL,
  `event_description` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `request_uri` varchar(500) DEFAULT NULL,
  `additional_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`additional_data`)),
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `service_history`
--

CREATE TABLE `service_history` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `attendance_id` int(11) DEFAULT NULL,
  `service_date` date NOT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `hours_worked` decimal(4,2) DEFAULT 0.00,
  `location_lat` decimal(10,8) DEFAULT NULL,
  `location_lng` decimal(11,8) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('active','completed','cancelled') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` int(11) NOT NULL,
  `company_name` varchar(255) DEFAULT 'ERGON Company',
  `company_email` varchar(255) DEFAULT '',
  `company_phone` varchar(20) DEFAULT '',
  `company_address` text DEFAULT NULL,
  `working_hours_start` time DEFAULT '09:00:00',
  `working_hours_end` time DEFAULT '18:00:00',
  `timezone` varchar(50) DEFAULT 'Asia/Kolkata',
  `base_location_lat` decimal(10,8) DEFAULT 0.00000000,
  `base_location_lng` decimal(11,8) DEFAULT 0.00000000,
  `attendance_radius` int(11) DEFAULT 200,
  `office_address` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `location_title` varchar(255) DEFAULT 'Main Office' COMMENT 'Display name for office location'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`id`, `company_name`, `company_email`, `company_phone`, `company_address`, `working_hours_start`, `working_hours_end`, `timezone`, `base_location_lat`, `base_location_lng`, `attendance_radius`, `office_address`, `created_at`, `updated_at`, `location_title`) VALUES
(1, 'Athena Solutions', '', '', NULL, '09:30:00', '19:00:00', 'Asia/Kolkata', 9.98156700, 78.14340000, 50, 'Thiruppalai, Madurai', '2025-10-30 09:48:31', '2025-12-15 11:46:17', 'AS-Head Office');

-- --------------------------------------------------------

--
-- Table structure for table `shifts`
--

CREATE TABLE `shifts` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `grace_period` int(11) DEFAULT 15 COMMENT 'Grace period in minutes',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sla_history`
--

CREATE TABLE `sla_history` (
  `id` int(11) NOT NULL,
  `daily_task_id` int(11) NOT NULL,
  `action` varchar(20) NOT NULL,
  `timestamp` timestamp NULL DEFAULT current_timestamp(),
  `duration_seconds` int(11) DEFAULT 0,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sync_errors`
--

CREATE TABLE `sync_errors` (
  `id` int(11) NOT NULL,
  `company_prefix` varchar(32) NOT NULL,
  `record_type` varchar(32) DEFAULT NULL,
  `document_number` varchar(128) DEFAULT NULL,
  `error_type` varchar(64) NOT NULL,
  `message` text DEFAULT NULL,
  `raw_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`raw_data`)),
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sync_log`
--

CREATE TABLE `sync_log` (
  `id` int(11) NOT NULL,
  `table_name` varchar(64) NOT NULL,
  `records_synced` int(11) DEFAULT 0,
  `sync_status` varchar(32) DEFAULT 'completed',
  `error_message` text DEFAULT NULL,
  `sync_started_at` timestamp NULL DEFAULT current_timestamp(),
  `sync_completed_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sync_metadata`
--

CREATE TABLE `sync_metadata` (
  `company_prefix` varchar(32) NOT NULL,
  `last_sync_invoices` timestamp NULL DEFAULT NULL,
  `last_sync_activities` timestamp NULL DEFAULT NULL,
  `last_sync_cashflow` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sync_runs`
--

CREATE TABLE `sync_runs` (
  `id` int(11) NOT NULL,
  `run_type` varchar(64) NOT NULL,
  `company_prefix` varchar(32) NOT NULL,
  `started_at` timestamp NOT NULL,
  `ended_at` timestamp NULL DEFAULT NULL,
  `rows_fetched` int(11) DEFAULT 0,
  `rows_upserted` int(11) DEFAULT 0,
  `errors_count` int(11) DEFAULT 0,
  `status` varchar(32) DEFAULT 'completed',
  `message` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tasks`
--

CREATE TABLE `tasks` (
  `id` int(11) NOT NULL,
  `title` varchar(200) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `assigned_by` int(11) NOT NULL,
  `assigned_to` int(11) NOT NULL,
  `task_type` enum('checklist','milestone','timed','ad-hoc') DEFAULT 'ad-hoc',
  `priority` enum('low','medium','high') DEFAULT 'medium',
  `deadline` datetime DEFAULT NULL,
  `progress` int(11) DEFAULT 0,
  `status` enum('assigned','in_progress','completed','blocked') DEFAULT 'assigned',
  `due_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `depends_on_task_id` int(11) DEFAULT NULL,
  `sla_hours` decimal(8,4) DEFAULT 0.2500,
  `sla_hours_part` int(11) DEFAULT 0,
  `sla_minutes_part` int(11) DEFAULT 15,
  `overall_progress` int(11) DEFAULT 0,
  `total_time_spent` decimal(6,2) DEFAULT 0.00,
  `estimated_hours` decimal(4,2) DEFAULT 0.00,
  `last_progress_update` timestamp NULL DEFAULT NULL,
  `department_id` int(11) DEFAULT NULL,
  `task_category` varchar(100) DEFAULT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `project_name` varchar(255) DEFAULT NULL,
  `follow_up_date` date DEFAULT NULL,
  `reminder_time` time DEFAULT NULL,
  `reminder_sent` tinyint(1) DEFAULT 0,
  `followup_required` tinyint(1) DEFAULT 0,
  `planned_date` date DEFAULT NULL,
  `estimated_duration` int(11) DEFAULT NULL,
  `project_id` int(11) DEFAULT NULL,
  `type` varchar(50) DEFAULT 'regular',
  `assigned_at` timestamp NULL DEFAULT NULL,
  `actual_time_seconds` int(11) DEFAULT 0,
  `progress_description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `tasks`
--

INSERT INTO `tasks` (`id`, `title`, `description`, `assigned_by`, `assigned_to`, `task_type`, `priority`, `deadline`, `progress`, `status`, `due_date`, `created_at`, `updated_at`, `depends_on_task_id`, `sla_hours`, `sla_hours_part`, `sla_minutes_part`, `overall_progress`, `total_time_spent`, `estimated_hours`, `last_progress_update`, `department_id`, `task_category`, `company_name`, `contact_person`, `contact_phone`, `project_name`, `follow_up_date`, `reminder_time`, `reminder_sent`, `followup_required`, `planned_date`, `estimated_duration`, `project_id`, `type`, `assigned_at`, `actual_time_seconds`, `progress_description`) VALUES
(30, 'MMS PILING', 'MMS PILING\r\nPile Foundations, 1.75 MTR Depth & 350 MM dia pilling and foundation along with pile cap work as per approved SOW ,GA & BOM with Civil material as per approved Grade', 1, 71, 'milestone', 'high', NULL, 0, 'in_progress', NULL, '2026-01-01 09:28:04', '2026-01-01 09:28:04', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-01', NULL, 23, 'regular', NULL, 0, NULL),
(31, 'MMS & MODULE INSTALLATION', 'MMS & MODULE INSTALLATION\r\nI & C WORK For MMS AND MODULES work as per the as per attached approved SOW ,GA & BOM', 1, 71, 'milestone', 'high', NULL, 0, 'in_progress', NULL, '2026-01-01 09:29:10', '2026-01-01 09:29:10', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-01', NULL, 23, 'regular', NULL, 0, NULL),
(32, 'I&C - AC SCOPE', 'I&C - AC SCOPE\r\n I & C WORK For AC work as per the as per attached approved SOW ,GA & BOM', 1, 71, 'milestone', 'high', NULL, 0, 'assigned', NULL, '2026-01-01 09:30:25', '2026-01-01 09:30:25', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-01', NULL, 23, 'regular', NULL, 0, NULL),
(33, 'I&C - DC SCOPE', 'I&C - DC SCOPE \r\nI & C WORK For DC work as per the as per attached approved SOW ,GA & BOM', 1, 71, 'milestone', 'high', NULL, 0, 'assigned', NULL, '2026-01-01 09:31:16', '2026-01-01 09:31:16', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-01', NULL, 23, 'regular', NULL, 0, NULL),
(34, 'FENCING - CHAIN LINK - INSTALLATION', 'FENCING - CHAIN LINK - INSTALLATION \r\nI & C WORK For Fencing work as per the as per attached approved SOW ,GA & BOM', 1, 71, 'milestone', 'high', NULL, 0, 'assigned', NULL, '2026-01-01 09:32:08', '2026-01-01 09:32:08', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-01', NULL, 23, 'regular', NULL, 0, NULL),
(35, 'HT PANEL FOUNDATION', 'HT PANEL FOUNDATION \r\nSS SIDE HT Foundation with canopy and shed as per approved dwg.', 1, 67, 'milestone', 'high', NULL, 0, 'in_progress', NULL, '2026-01-02 04:12:39', '2026-01-02 04:12:39', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 20, 'regular', NULL, 0, NULL),
(36, 'IDT FOUNDATION WORK', 'IDT FOUNDATION WORK \r\nIDT Foundation (Bus Duct Foundation) With Gravel filling & soak pit foundation', 1, 67, 'milestone', 'high', NULL, 0, 'in_progress', NULL, '2026-01-02 04:13:57', '2026-01-02 04:13:57', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 20, 'regular', NULL, 0, NULL),
(37, 'MISC. CIVIL WORK', 'MISC. CIVIL WORK\r\nLT Panel foundation with fabrication eppoxy painting with canopy shed material supply & errection', 1, 67, 'milestone', 'high', NULL, 0, 'in_progress', NULL, '2026-01-02 04:14:51', '2026-01-02 04:14:51', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 20, 'regular', NULL, 0, NULL),
(38, 'CIVIL FOUNDATION WORK', 'CIVIL FOUNDATION WORK 1.00 1,250,000.00\r\nLT & HT Panel Foundation with\r\nCanopy work', 1, 71, 'milestone', 'high', NULL, 0, 'in_progress', NULL, '2026-01-02 04:14:54', '2026-01-02 04:14:54', NULL, 0.0100, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 23, 'regular', NULL, 0, NULL),
(39, 'MISC. CIVIL WORK', 'MISC. CIVIL WORK \r\nICOG & HT Switchboard Panel foundation with fabrication eppoxy painting with canopy shed material supply & errection', 1, 67, 'milestone', 'medium', NULL, 0, 'in_progress', NULL, '2026-01-02 04:15:41', '2026-01-02 04:15:41', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 20, 'regular', NULL, 0, NULL),
(40, 'MISC. CIVIL WORK', 'MISC. CIVIL WORK \r\nIDT Fencing installation & fire extingushers arrangements & mounting', 1, 67, 'milestone', 'high', NULL, 0, 'assigned', NULL, '2026-01-02 04:17:10', '2026-01-02 04:17:10', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 20, 'regular', NULL, 0, NULL),
(41, 'IDT FOUNDATION WORK', 'IDT FOUNDATION WORK IDT Foundation work as per\r\napproved Grawing', 1, 71, 'ad-hoc', 'medium', NULL, 0, 'in_progress', NULL, '2026-01-02 04:17:36', '2026-01-02 04:17:36', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 23, 'regular', NULL, 0, NULL),
(42, 'MISC. CIVIL WORK', 'MISC. CIVIL WORK \r\nICR Gate installation', 1, 67, 'milestone', 'high', NULL, 0, 'in_progress', NULL, '2026-01-02 04:18:01', '2026-01-02 04:18:01', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 20, 'regular', NULL, 0, NULL),
(43, 'IDT FOUNDATION WORK  (Torrent Urja 17 Pvt Ltd)', 'IDT FOUNDATION WORK \r\nIDT foundation with BOT as per approved dwg.', 1, 67, 'milestone', 'medium', NULL, 0, 'in_progress', NULL, '2026-01-02 04:22:15', '2026-01-02 04:22:15', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 20, 'regular', NULL, 0, NULL),
(44, 'LT PANEL FOUNDATION (Torrent Urja 17 Pvt Ltd)', 'LT PANEL FOUNDATION \r\nLT Foundation & Bus duct foundation with canopy and shed as per approved dwg.', 1, 69, 'milestone', 'high', NULL, 0, 'in_progress', NULL, '2026-01-02 04:23:39', '2026-01-02 04:28:51', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, '', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 25, 'regular', NULL, 0, NULL),
(45, 'MMS PILING Green Pro', 'MMS PILING \r\nMMS Piling as per below Size\r\n1) Piling 300 MM dia * 1500 MM\r\ndepth\r\n2) Pile cap 300 MM dia * 150 MM\r\nheight', 1, 69, 'milestone', 'high', NULL, 0, 'in_progress', NULL, '2026-01-02 04:24:46', '2026-01-02 04:24:46', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 25, 'regular', NULL, 0, NULL),
(46, 'HT PANEL FOUNDATION (Torrent Urja 17 Pvt Ltd)', 'HT PANEL FOUNDATION \r\nHT Foundation with canopy and shed as per approved dwg', 1, 67, 'milestone', 'high', NULL, 0, 'in_progress', NULL, '2026-01-02 04:24:49', '2026-01-02 04:24:49', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 20, 'regular', NULL, 0, NULL),
(47, 'MMS PILING Pile Foundations', 'MMS PILING Pile Foundations \r\n1500MM Depth & 350 MM dia pilling and foundation along with pile cap work as per approved SOW ,GA & BOM with Civil material as per approved Grade', 1, 67, 'milestone', 'medium', NULL, 0, 'in_progress', NULL, '2026-01-02 04:36:04', '2026-01-02 04:36:04', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 24, 'regular', NULL, 0, NULL),
(48, 'MMS & MODULE INSTALLATION', 'MMS & MODULE INSTALLATION \r\nI & C WORK For MMS AND MODULES work as per the as per attached approved SOW ,GA & BOM', 1, 67, 'milestone', 'medium', NULL, 0, 'in_progress', NULL, '2026-01-02 04:37:46', '2026-01-02 04:37:46', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 24, 'regular', NULL, 0, NULL),
(49, 'I&C - AC SCOPE', 'I&C - AC SCOPE \r\nI & C WORK For AC work as per the as per attached approved SOW ,GA & BOM', 1, 67, 'milestone', 'high', NULL, 0, 'in_progress', NULL, '2026-01-02 04:41:38', '2026-01-02 04:41:38', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 24, 'regular', NULL, 0, NULL),
(50, 'I&C - DC SCOPE', 'I&C - DC SCOPE \r\nI & C WORK For DC work as per the as per attached approved SOW ,GA & BOM', 1, 67, 'milestone', 'high', NULL, 0, 'in_progress', NULL, '2026-01-02 04:42:38', '2026-01-02 04:42:38', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 24, 'regular', NULL, 0, NULL),
(51, 'CIVIL FOUNDATION WORK', 'CIVIL FOUNDATION WORK\r\nI & C WORK For ICR Foundation work as per the as per attached approved SOW ,GA & BOM a. IDT Foundation as per approved PGEL Dwg with gravel filling b. ICOG Panel foundation as per approved PGEL Dwg along with HDGI 90 Microns minimum canopy supply c. LT Panel foundations as per approved PGEL Dwg along with HDGI 90 Microns minimum canopy supply d. BOT Foundation e. Pota cabin foundation f. Main gate foundation g. Aux panel foundation & UPS DB Foundation h. Bus duct foundation', 1, 67, 'milestone', 'medium', NULL, 0, 'in_progress', NULL, '2026-01-02 04:43:39', '2026-01-02 04:43:39', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Operational Planning', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 24, 'regular', NULL, 0, NULL),
(52, 'FENCING - CHAIN LINK - INSTALLATION', 'FENCING - CHAIN LINK - INSTALLATION \r\nI & C WORK For Fencing work as per the as per attached approved SOW ,GA & BOM', 1, 67, 'milestone', 'high', NULL, 0, 'in_progress', NULL, '2026-01-02 04:44:38', '2026-01-02 04:44:38', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 24, 'regular', NULL, 0, NULL),
(53, 'I&C - MISCELLANEOUS', 'I&C - MISCELLANEOUS \r\n 1. LA Earthing installation \r\n2. WMS Installation & connection \r\n3. Module cleaning system- Robots \r\n4. Conventional street lights \r\n5. Inverter stand errection \r\n6. SCADA Installation & connection. \r\n7. Main gate errection & foundation \r\n8. Bus duct coupling', 1, 67, 'milestone', 'medium', NULL, 0, 'in_progress', NULL, '2026-01-02 04:45:54', '2026-01-02 04:45:54', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 24, 'regular', NULL, 0, NULL),
(54, 'MMS PILING', 'MMS PILING \r\nPile Foundations, 1.75 MTR Depth & 350 MM dia pilling and foundation along with pile cap work as per approved SOW ,GA & BOM with Civil material as per approved Grade', 1, 67, 'milestone', 'high', NULL, 0, 'in_progress', NULL, '2026-01-02 04:47:50', '2026-01-02 04:47:50', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 21, 'regular', NULL, 0, NULL),
(55, 'MMS INSTALLATION', 'MMS INSTALLATION\r\nMMS unloading shifting &\r\nmounting\r\nmodule unloading shifting &\r\nmounting', 1, 69, 'ad-hoc', 'high', NULL, 0, 'assigned', NULL, '2026-01-02 04:47:50', '2026-01-02 04:47:50', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 25, 'regular', NULL, 0, NULL),
(56, 'MMS & MODULE INSTALLATION', 'MMS & MODULE INSTALLATION \r\nI & C WORK For MMS AND MODULES work as per the as per attached approved SOW ,GA & BOM', 1, 67, 'milestone', 'high', NULL, 0, 'in_progress', NULL, '2026-01-02 04:48:57', '2026-01-02 04:48:57', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 21, 'regular', NULL, 0, NULL),
(57, 'I&C - AC SCOPE', 'I&C - AC SCOPE \r\nI & C WORK For AC work as per the as per attached approved SOW ,GA & BOM', 1, 67, 'milestone', 'high', NULL, 0, 'in_progress', NULL, '2026-01-02 04:53:48', '2026-01-02 04:53:48', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 21, 'regular', NULL, 0, NULL),
(58, 'I&C - DC SCOPE', 'I&C - DC SCOPE \r\nI & C WORK For DC work as per the as per attached approved SOW ,GA & BOM', 1, 67, 'milestone', 'high', NULL, 0, 'in_progress', NULL, '2026-01-02 04:57:46', '2026-01-02 04:57:46', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 21, 'regular', NULL, 0, NULL),
(59, 'CIVIL FOUNDATION WORK', 'CIVIL FOUNDATION WORK \r\nI & C WORK For ICR Foundation work as per the as per attached approved SOW ,GA & BOM', 1, 67, 'milestone', 'medium', NULL, 0, 'in_progress', NULL, '2026-01-02 04:58:36', '2026-01-02 04:58:36', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 21, 'regular', NULL, 0, NULL),
(60, 'CABLE LAYING', 'CABLE LAYING\r\nCable laying, earthing cctv, &\r\nSCADA As per as below\r\nmentioned.\r\n1. AC Cable laying as per as\r\nStandard\r\n2. DC Cable Laying as per as\r\nStandard\r\n3. Structure , Inverter & LA\r\nearthing\r\n4. MCS trench & pipe laying in PV\r\narea\r\n5. Inverter unloading mounting &\r\ncommissioning with stand casting', 1, 69, 'milestone', 'medium', NULL, 0, 'assigned', NULL, '2026-01-02 04:58:43', '2026-01-02 04:58:43', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 25, 'regular', NULL, 0, NULL),
(61, 'FENCING - CHAIN LINK - INSTALLATION', 'FENCING - CHAIN LINK - INSTALLATION \r\nI & C WORK For Fencing work as per the as per attached approved SOW ,GA & BOM', 1, 67, 'milestone', 'high', NULL, 0, 'in_progress', NULL, '2026-01-02 04:59:35', '2026-01-02 04:59:35', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 21, 'regular', NULL, 0, NULL),
(62, 'CIVIL FOUNDATION WORK', 'CIVIL FOUNDATION WORK\r\nAs per Approved Drawing', 1, 69, 'milestone', 'high', NULL, 0, 'in_progress', NULL, '2026-01-02 05:02:14', '2026-01-02 05:02:14', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 25, 'regular', NULL, 0, NULL),
(63, 'IDT FOUNDATION WORK', 'IDT FOUNDATION WORK \r\nAs per Approved Drawing', 1, 69, 'milestone', 'high', NULL, 0, 'in_progress', NULL, '2026-01-02 05:04:26', '2026-01-02 05:04:26', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 25, 'regular', NULL, 0, NULL),
(64, 'I&C - MISCELLANEOUS', 'I&C - MISCELLANEOUS\r\nRO Plant Foundation', 1, 69, 'milestone', 'high', NULL, 0, 'in_progress', NULL, '2026-01-02 05:08:32', '2026-01-02 05:08:32', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 25, 'regular', NULL, 0, NULL),
(65, 'I&C - MISCELLANEOUS', 'I&C - MISCELLANEOUS\r\nMain gate installation with supply', 1, 69, 'milestone', 'high', NULL, 0, 'in_progress', NULL, '2026-01-02 05:15:37', '2026-01-02 05:16:14', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, '', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 25, 'regular', NULL, 0, NULL),
(66, 'MCS INSTALLATION', 'MCS INSTALLATION \r\nAs per Approved Drawing', 1, 1, 'milestone', 'high', NULL, 0, 'in_progress', NULL, '2026-01-02 05:19:36', '2026-01-02 05:30:53', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, '', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 25, 'regular', NULL, 0, NULL),
(67, 'I&C - MISCELLANEOUS', 'I&C - MISCELLANEOUS \r\nSeptik tank construction', 1, 69, 'ad-hoc', 'medium', NULL, 0, 'in_progress', NULL, '2026-01-02 05:26:26', '2026-01-02 05:26:26', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, 'Process Improvement', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 25, 'regular', NULL, 0, NULL),
(68, 'I&C - MISCELLANEOUS', '&C - MISCELLANEOUS \r\n1. CCTV cable laying & Pole\r\nmounting in PV area\r\n2. Street Lighting pole mounting ,\r\ncable laying & termination in PV\r\narea\r\n3. SCADA cable laying & installtion\r\nof required sensors', 1, 69, 'milestone', 'high', NULL, 0, 'in_progress', NULL, '2026-01-02 05:29:04', '2026-01-02 05:29:57', NULL, 0.2500, 0, 15, 0, 0.00, 0.00, NULL, 5, '', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, '2026-01-02', NULL, 25, 'regular', NULL, 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `task_categories`
--

CREATE TABLE `task_categories` (
  `id` int(11) NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `department_id` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `task_categories`
--

INSERT INTO `task_categories` (`id`, `category_name`, `description`, `is_active`, `created_at`, `department_id`) VALUES
(19, 'Document Collection', 'Gathering required documents from clients', 1, '2025-10-26 21:44:23', 1),
(20, 'Portal Upload', 'Uploading details in government portals', 1, '2025-10-26 21:44:23', 1),
(21, 'Documentation', 'Document preparation and verification', 1, '2025-10-26 21:44:23', 1),
(22, 'Follow-up', 'Client and government office follow-ups', 1, '2025-10-26 21:44:23', 1),
(23, 'Document Submission', 'Physical document submission', 1, '2025-10-26 21:44:23', 1),
(24, 'Courier Services', 'Document dispatch and delivery', 1, '2025-10-26 21:44:23', 1),
(25, 'Client Meeting', 'Client consultation and meetings', 1, '2025-10-26 21:44:23', 1),
(26, 'Government Office Visit', 'Official visits and submissions', 1, '2025-10-26 21:44:23', 1),
(27, 'ESI Work', 'Employee State Insurance related tasks', 1, '2025-10-26 21:44:23', 1),
(28, 'EPF Work', 'Employee Provident Fund activities', 1, '2025-10-26 21:44:23', 1),
(29, 'Mail Checking', 'Official correspondence review', 1, '2025-10-26 21:44:23', 1),
(30, 'Document Preparation', 'Statutory document creation', 1, '2025-10-26 21:44:23', 1),
(31, 'Fees Payment', 'Government fees and charges payment', 1, '2025-10-26 21:44:23', 1),
(32, 'Attendance Collection', 'Employee attendance compilation', 1, '2025-10-26 21:44:23', 1),
(33, 'Compliance Filing', 'Regulatory compliance submissions', 1, '2025-10-26 21:44:23', 1),
(34, 'Audit Support', 'Audit documentation and support', 1, '2025-10-26 21:44:23', 1),
(43, 'Call Handling', 'Professional call answering service', 1, '2025-10-26 21:44:23', 1),
(44, 'Mail Management', 'Physical mail handling and forwarding', 1, '2025-10-26 21:44:23', 1),
(45, 'Address Services', 'Business address and registration', 1, '2025-10-26 21:44:23', 1),
(46, 'Meeting Coordination', 'Virtual meeting setup and management', 1, '2025-10-26 21:44:23', 1),
(47, 'Reception Services', 'Virtual reception and customer service', 1, '2025-10-26 21:44:23', 1),
(48, 'Document Scanning', 'Physical document digitization', 1, '2025-10-26 21:44:23', 1),
(49, 'Appointment Scheduling', 'Calendar and appointment management', 1, '2025-10-26 21:44:23', 1),
(50, 'Administrative Support', 'General administrative assistance', 1, '2025-10-26 21:44:23', 1),
(57, 'Recruitment', 'Hiring and recruitment activities', 1, '2025-10-27 09:22:00', 1),
(58, 'Training', 'Employee training and development', 1, '2025-10-27 09:22:00', 1),
(59, 'Performance Review', 'Employee performance evaluations', 1, '2025-10-27 09:22:00', 1),
(60, 'Policy Development', 'HR policy creation and updates', 1, '2025-10-27 09:22:00', 1),
(61, 'Employee Relations', 'Managing employee relations and issues', 1, '2025-10-27 09:22:00', 1),
(62, 'Compliance', 'HR compliance and regulatory tasks', 1, '2025-10-27 09:22:00', 1),
(76, 'Process Improvement', 'Improving operational processes', 1, '2025-10-27 09:22:00', 1),
(77, 'Quality Control', 'Quality assurance and control', 1, '2025-10-27 09:22:00', 1),
(78, 'Vendor Management', 'Managing vendor relationships', 1, '2025-10-27 09:22:00', 1),
(79, 'Inventory Management', 'Managing inventory and supplies', 1, '2025-10-27 09:22:00', 1),
(80, 'Logistics', 'Logistics and supply chain management', 1, '2025-10-27 09:22:00', 1),
(81, 'Facility Management', 'Managing office facilities', 1, '2025-10-27 09:22:00', 1),
(82, 'Ledger Update', 'General ledger maintenance and updates', 1, '2025-10-27 09:35:18', 1),
(83, 'Invoice Creation', 'Customer invoice generation', 1, '2025-10-27 09:35:18', 1),
(84, 'Quotation Creation', 'Price quotation preparation', 1, '2025-10-27 09:35:18', 1),
(85, 'PO Creation', 'Purchase order generation', 1, '2025-10-27 09:35:18', 1),
(86, 'PO Follow-up', 'Purchase order tracking and follow-up', 1, '2025-10-27 09:35:18', 1),
(87, 'Payment Follow-up', 'Outstanding payment collection', 1, '2025-10-27 09:35:18', 1),
(88, 'Ledger Follow-up', 'Account reconciliation and follow-up', 1, '2025-10-27 09:35:18', 1),
(89, 'GST Follow-up', 'GST compliance and filing', 1, '2025-10-27 09:35:18', 1),
(90, 'Mail Checking', 'Email correspondence and communication', 1, '2025-10-27 09:35:18', 1),
(91, 'Financial Reporting', 'Monthly and quarterly reports', 1, '2025-10-27 09:35:18', 1),
(92, 'Accounting', 'General accounting and bookkeeping', 1, '2025-10-27 09:35:18', 1),
(93, 'Budgeting', 'Budget planning and management', 1, '2025-10-27 09:35:18', 1),
(94, 'Financial Analysis', 'Financial data analysis and reporting', 1, '2025-10-27 09:35:18', 1),
(95, 'Audit', 'Internal and external audit activities', 1, '2025-10-27 09:35:18', 1),
(96, 'Tax Planning', 'Tax preparation and planning', 1, '2025-10-27 09:35:18', 1),
(97, 'Invoice Processing', 'Processing invoices and payments', 1, '2025-10-27 09:35:18', 1),
(98, 'Development', 'Software development and coding tasks', 1, '2025-10-27 09:35:18', 1),
(99, 'Testing', 'Quality assurance and testing activities', 1, '2025-10-27 09:35:18', 1),
(100, 'Bug Fixing', 'Error resolution and debugging', 1, '2025-10-27 09:35:18', 1),
(101, 'Planning', 'Project planning and architecture', 1, '2025-10-27 09:35:18', 1),
(102, 'Hosting', 'Server management and deployment', 1, '2025-10-27 09:35:18', 1),
(103, 'Maintenance', 'System maintenance and updates', 1, '2025-10-27 09:35:18', 1),
(104, 'Documentation', 'Technical documentation and guides', 1, '2025-10-27 09:35:18', 1),
(105, 'Code Review', 'Peer code review and quality checks', 1, '2025-10-27 09:35:18', 1),
(106, 'Deployment', 'Application deployment and release', 1, '2025-10-27 09:35:18', 1),
(107, 'Campaign Planning', 'Marketing campaign strategy and planning', 1, '2025-10-27 09:35:18', 1),
(108, 'Content Creation', 'Marketing content and material creation', 1, '2025-10-27 09:35:18', 1),
(109, 'Social Media Management', 'Social media posts and engagement', 1, '2025-10-27 09:35:18', 1),
(110, 'Lead Generation', 'Prospecting and lead identification', 1, '2025-10-27 09:35:18', 1),
(111, 'Client Presentation', 'Sales presentations and proposals', 1, '2025-10-27 09:35:18', 1),
(112, 'Market Research', 'Industry and competitor analysis', 1, '2025-10-27 09:35:18', 1),
(113, 'Event Planning', 'Marketing events and webinars', 1, '2025-10-27 09:35:18', 1),
(114, 'Email Marketing', 'Email campaigns and newsletters', 1, '2025-10-27 09:35:18', 1),
(115, 'Client Meeting', 'Meeting with clients and prospects', 1, '2025-10-27 09:35:18', 1),
(116, 'Proposal Writing', 'Creating sales proposals and quotes', 1, '2025-10-27 09:35:18', 1),
(117, 'Customer Support', 'Supporting existing customers', 1, '2025-10-27 09:35:18', 1),
(118, 'Bank Reconciliation', 'Comprehensive task category for Finance & Accounts department', 1, '2025-10-27 09:35:18', 1),
(119, 'Expense Tracking', 'Comprehensive task category for Finance & Accounts department', 1, '2025-10-27 09:35:18', 1),
(120, 'Petty Cash Management', 'Comprehensive task category for Finance & Accounts department', 1, '2025-10-27 09:35:18', 1),
(121, 'Vendor Payment', 'Comprehensive task category for Finance & Accounts department', 1, '2025-10-27 09:35:18', 1),
(122, 'Customer Payment Processing', 'Comprehensive task category for Finance & Accounts department', 1, '2025-10-27 09:35:18', 1),
(123, 'Cash Flow Management', 'Comprehensive task category for Finance & Accounts department', 1, '2025-10-27 09:35:18', 1),
(124, 'Investment Analysis', 'Comprehensive task category for Finance & Accounts department', 1, '2025-10-27 09:35:18', 1),
(125, 'Cost Analysis', 'Comprehensive task category for Finance & Accounts department', 1, '2025-10-27 09:35:18', 1),
(126, 'Profit & Loss Review', 'Comprehensive task category for Finance & Accounts department', 1, '2025-10-27 09:35:18', 1),
(127, 'Balance Sheet Preparation', 'Comprehensive task category for Finance & Accounts department', 1, '2025-10-27 09:35:18', 1),
(128, 'GST Filing', 'Comprehensive task category for Finance & Accounts department', 1, '2025-10-27 09:35:18', 1),
(129, 'TDS Processing', 'Comprehensive task category for Finance & Accounts department', 1, '2025-10-27 09:35:18', 1),
(130, 'Loan Management', 'Comprehensive task category for Finance & Accounts department', 1, '2025-10-27 09:35:18', 1),
(131, 'Asset Management', 'Comprehensive task category for Finance & Accounts department', 1, '2025-10-27 09:35:18', 1),
(132, 'System Analysis', 'Comprehensive task category for Information Technology department', 1, '2025-10-27 09:35:18', 1),
(133, 'Database Design', 'Comprehensive task category for Information Technology department', 1, '2025-10-27 09:35:18', 1),
(134, 'API Development', 'Comprehensive task category for Information Technology department', 1, '2025-10-27 09:35:18', 1),
(135, 'Frontend Development', 'Comprehensive task category for Information Technology department', 1, '2025-10-27 09:35:18', 1),
(136, 'Backend Development', 'Comprehensive task category for Information Technology department', 1, '2025-10-27 09:35:18', 1),
(137, 'DevOps', 'Comprehensive task category for Information Technology department', 1, '2025-10-27 09:35:18', 1),
(138, 'Cloud Management', 'Comprehensive task category for Information Technology department', 1, '2025-10-27 09:35:18', 1),
(139, 'Security Implementation', 'Comprehensive task category for Information Technology department', 1, '2025-10-27 09:35:18', 1),
(140, 'System Administration', 'Comprehensive task category for Information Technology department', 1, '2025-10-27 09:35:18', 1),
(141, 'Database Management', 'Comprehensive task category for Information Technology department', 1, '2025-10-27 09:35:18', 1),
(142, 'Security Updates', 'Comprehensive task category for Information Technology department', 1, '2025-10-27 09:35:18', 1),
(143, 'Backup Management', 'Comprehensive task category for Information Technology department', 1, '2025-10-27 09:35:18', 1),
(144, 'Network Management', 'Comprehensive task category for Information Technology department', 1, '2025-10-27 09:35:18', 1),
(145, 'User Support', 'Comprehensive task category for Information Technology department', 1, '2025-10-27 09:35:18', 1),
(146, 'Software Installation', 'Comprehensive task category for Information Technology department', 1, '2025-10-27 09:35:18', 1),
(147, 'Hardware Maintenance', 'Comprehensive task category for Information Technology department', 1, '2025-10-27 09:35:18', 1),
(148, 'Performance Monitoring', 'Comprehensive task category for Information Technology department', 1, '2025-10-27 09:35:18', 1),
(149, 'Brand Management', 'Comprehensive task category for Marketing & Sales department', 1, '2025-10-27 09:35:18', 1),
(150, 'Digital Marketing', 'Comprehensive task category for Marketing & Sales department', 1, '2025-10-27 09:35:18', 1),
(151, 'SEO/SEM', 'Comprehensive task category for Marketing & Sales department', 1, '2025-10-27 09:35:18', 1),
(152, 'Public Relations', 'Comprehensive task category for Marketing & Sales department', 1, '2025-10-27 09:35:18', 1),
(153, 'Customer Surveys', 'Comprehensive task category for Marketing & Sales department', 1, '2025-10-27 09:35:18', 1),
(154, 'Competitor Analysis', 'Comprehensive task category for Marketing & Sales department', 1, '2025-10-27 09:35:18', 1),
(155, 'Product Promotion', 'Comprehensive task category for Marketing & Sales department', 1, '2025-10-27 09:35:18', 1),
(156, 'Sales Presentation', 'Comprehensive task category for Marketing & Sales department', 1, '2025-10-27 09:35:18', 1),
(157, 'Deal Negotiation', 'Comprehensive task category for Marketing & Sales department', 1, '2025-10-27 09:35:18', 1),
(158, 'Customer Onboarding', 'Comprehensive task category for Marketing & Sales department', 1, '2025-10-27 09:35:18', 1),
(159, 'Account Management', 'Comprehensive task category for Marketing & Sales department', 1, '2025-10-27 09:35:18', 1),
(160, 'Sales Reporting', 'Comprehensive task category for Marketing & Sales department', 1, '2025-10-27 09:35:18', 1),
(161, 'CRM Management', 'Comprehensive task category for Marketing & Sales department', 1, '2025-10-27 09:35:18', 1),
(162, 'Territory Management', 'Comprehensive task category for Marketing & Sales department', 1, '2025-10-27 09:35:18', 1),
(163, 'Product Demo', 'Comprehensive task category for Marketing & Sales department', 1, '2025-10-27 09:35:18', 1),
(164, 'Contract Management', 'Comprehensive task category for Marketing & Sales department', 1, '2025-10-27 09:35:18', 1),
(165, 'Software Development', 'Default category for Information Technology department', 1, '2025-12-11 08:53:22', 14),
(166, 'System Maintenance', 'Default category for Information Technology department', 1, '2025-12-11 08:53:22', 14),
(167, 'Bug Fixes', 'Default category for Information Technology department', 1, '2025-12-11 08:53:22', 14),
(168, 'Security Updates', 'Default category for Information Technology department', 1, '2025-12-11 08:53:22', 14),
(169, 'Database Management', 'Default category for Information Technology department', 1, '2025-12-11 08:53:22', 14),
(170, 'Network Administration', 'Default category for Information Technology department', 1, '2025-12-11 08:53:22', 14),
(171, 'User Support', 'Default category for Information Technology department', 1, '2025-12-11 08:53:22', 14),
(172, 'Infrastructure', 'Default category for Information Technology department', 1, '2025-12-11 08:53:22', 14),
(173, 'Process Improvement', 'Default category for Operations department', 1, '2025-12-11 09:00:26', 5),
(174, 'Quality Control', 'Default category for Operations department', 1, '2025-12-11 09:00:26', 5),
(175, 'Vendor Management', 'Default category for Operations department', 1, '2025-12-11 09:00:26', 5),
(176, 'Logistics', 'Default category for Operations department', 1, '2025-12-11 09:00:26', 5),
(177, 'Inventory Management', 'Default category for Operations department', 1, '2025-12-11 09:00:26', 5),
(178, 'Customer Service', 'Default category for Operations department', 1, '2025-12-11 09:00:26', 5),
(179, 'Operational Planning', 'Default category for Operations department', 1, '2025-12-11 09:00:26', 5),
(180, 'Compliance', 'Default category for Operations department', 1, '2025-12-11 09:00:26', 5),
(181, 'Campaign Planning', 'Default category for Marketing & Sales department', 1, '2025-12-17 04:19:18', 15),
(182, 'Content Creation', 'Default category for Marketing & Sales department', 1, '2025-12-17 04:19:18', 15),
(183, 'Lead Generation', 'Default category for Marketing & Sales department', 1, '2025-12-17 04:19:18', 15),
(184, 'Client Follow-up', 'Default category for Marketing & Sales department', 1, '2025-12-17 04:19:18', 15),
(185, 'Market Research', 'Default category for Marketing & Sales department', 1, '2025-12-17 04:19:18', 15),
(186, 'Brand Management', 'Default category for Marketing & Sales department', 1, '2025-12-17 04:19:18', 15),
(187, 'Social Media', 'Default category for Marketing & Sales department', 1, '2025-12-17 04:19:18', 15),
(188, 'Event Planning', 'Default category for Marketing & Sales department', 1, '2025-12-17 04:19:18', 15);

-- --------------------------------------------------------

--
-- Table structure for table `task_history`
--

CREATE TABLE `task_history` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `action` varchar(50) NOT NULL,
  `old_value` text DEFAULT NULL,
  `new_value` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `task_history`
--

INSERT INTO `task_history` (`id`, `task_id`, `action`, `old_value`, `new_value`, `notes`, `created_by`, `created_at`) VALUES
(1, 1, 'created', '', 'Task created', 'Initial task creation: Test the BKGE Software', 1, '2025-12-08 06:02:04'),
(2, 1, 'created', '', 'Task created', 'Task was created with initial details', 1, '2025-12-08 06:02:04'),
(3, 1, 'updated', 'Task details', 'Task updated', 'Task details were modified', 1, '2025-12-08 06:06:16'),
(4, 2, 'created', '', 'Task created', 'Task was created with initial details', 37, '2025-12-08 06:07:51'),
(5, 3, 'created', '', 'Task created', 'Task was created with initial details', 57, '2025-12-08 08:58:35'),
(6, 4, 'created', '', 'Task created', 'Task was created with initial details', 1, '2025-12-08 10:24:06'),
(7, 4, 'updated', 'Task details', 'Task updated', 'Task details were modified', 57, '2025-12-08 10:25:03'),
(8, 4, 'updated', 'Task details', 'Task updated', 'Task details were modified', 1, '2025-12-08 10:27:17'),
(9, 5, 'created', '', 'Task created', 'Task was created with initial details', 1, '2025-12-09 10:11:14'),
(10, 5, 'updated', 'Task details', 'Task updated', 'Task details were modified', 1, '2025-12-09 10:12:36'),
(11, 6, 'created', '', 'Task created', 'Task was created with initial details', 58, '2025-12-10 04:32:51'),
(12, 4, 'updated', 'Task details', 'Task updated', 'Task details were modified', 1, '2025-12-11 03:02:08'),
(13, 7, 'created', '', 'Task created', 'Task was created with initial details', 58, '2025-12-11 03:21:59'),
(14, 7, 'updated', 'Task details', 'Task updated', 'Task details were modified', 58, '2025-12-11 03:22:24'),
(15, 7, 'updated', 'Task details', 'Task updated', 'Task details were modified', 58, '2025-12-11 03:22:37'),
(16, 8, 'created', '', 'Task created', 'Task was created with initial details', 1, '2025-12-11 08:53:57'),
(17, 8, 'updated', 'Task details', 'Task updated', 'Task details were modified', 1, '2025-12-11 08:55:17'),
(18, 9, 'created', '', 'Task created', 'Task was created with initial details', 58, '2025-12-11 09:00:50'),
(19, 10, 'created', '', 'Task created', 'Task was created with initial details', 1, '2025-12-11 13:27:26'),
(20, 10, 'updated', 'Task details', 'Task updated', 'Task details were modified', 1, '2025-12-11 13:27:51'),
(21, 10, 'updated', 'Task details', 'Task updated', 'Task details were modified', 1, '2025-12-11 13:28:19'),
(22, 11, 'created', '', 'Task created', 'Task created: Fix Notification Panel Alignment Issue | Assigned to: Unknown | Priority: Medium | Type: Ad hoc | SLA: 0.25h | Deadline: Dec 16, 2025 00:00 | Planned: Dec 16, 2025', 1, '2025-12-15 06:39:00'),
(23, 11, 'assigned', '', 'Unknown', 'Task assigned to user', 1, '2025-12-15 06:39:00'),
(24, 11, 'updated', 'Task details', 'Task updated', 'Task details modified', 1, '2025-12-15 06:39:22'),
(25, 11, 'updated', 'Task details', 'Task updated', 'Task details modified', 1, '2025-12-15 06:40:11'),
(26, 11, 'reassigned', 'Nelson', 'Nelson Raj', 'Task reassigned to different user', 1, '2025-12-15 06:40:38'),
(27, 11, 'updated', 'Task details', 'Task updated', 'Changes: Assigned: Nelson → Nelson Raj', 1, '2025-12-15 06:40:38'),
(28, 12, 'created', '', 'Task created', 'Task created: Improve Task Creation Form UI Consistency | Assigned to: Unknown | Priority: Medium | Type: Ad hoc | SLA: 0.25h | Deadline: Dec 16, 2025 00:00 | Planned: Dec 16, 2025', 1, '2025-12-15 06:43:48'),
(29, 12, 'reassigned', 'Athenas Owner', 'Nelson', 'Task reassigned to different user', 1, '2025-12-15 06:44:31'),
(30, 12, 'updated', 'Task details', 'Task updated', 'Changes: Assigned: Athenas Owner → Nelson', 1, '2025-12-15 06:44:31'),
(31, 12, 'updated', 'Task details', 'Task updated', 'Task details modified', 1, '2025-12-15 06:45:27'),
(32, 12, 'status_changed', 'Completed', 'In_progress', 'Task status updated', 1, '2025-12-15 07:08:42'),
(33, 12, 'updated', 'Task details', 'Task updated', 'Changes: Status: Completed → In_progress', 1, '2025-12-15 07:08:42'),
(34, 12, 'status_changed', 'In_progress', 'Completed', 'Task status updated', 1, '2025-12-15 07:08:59'),
(35, 12, 'updated', 'Task details', 'Task updated', 'Changes: Status: In_progress → Completed', 1, '2025-12-15 07:08:59'),
(36, 10, 'updated', 'Task details', 'Task updated', 'Task details modified', 1, '2025-12-15 10:28:07'),
(37, 13, 'created', '', 'Task created', 'Task created: Improve Project Form UI Spacing | Assigned to: Unknown | Priority: Medium | Type: Ad hoc | SLA: 0.25h | Deadline: Dec 16, 2025 00:00 | Planned: Dec 16, 2025', 1, '2025-12-16 18:16:04'),
(38, 13, 'assigned', '', 'Unknown', 'Task assigned to user', 1, '2025-12-16 18:16:04'),
(39, 14, 'created', '', 'Task created', 'Task \"Add Validation for Expense Amount Field\" created | Assigned to: Nelson | Priority: Medium | Type: Ad hoc | SLA: 0.25h | Deadline: Dec 17, 2025 00:00 | Planned: Dec 17, 2025 | Description: Ensure that the expense amount field accepts only numeric values and shows appropriate error message...', 1, '2025-12-17 04:19:44'),
(40, 14, 'assigned', 'Athenas Owner', 'Nelson', 'Task assigned by Athenas Owner to Nelson', 1, '2025-12-17 04:19:44'),
(41, 14, 'deadline_changed', 'Dec 17, 2025 00:00', 'Dec 17, 2025 00:00', 'Deadline changed from \"Dec 17, 2025 00:00\" to \"Dec 17, 2025 00:00\"', 1, '2025-12-17 04:20:49'),
(42, 14, 'updated', 'Task details', 'Task updated', 'Updated: Deadline', 1, '2025-12-17 04:20:49'),
(43, 15, 'created', '', 'Task created', 'Task \"Prepare Monthly Expense Summary Report\" created | Assigned to: Yazhini  S | Priority: Medium | Type: Ad hoc | SLA: 0.25h | Deadline: Dec 18, 2025 00:00 | Planned: Dec 18, 2025 | Description: Compile and review all expense entries for the current month, verify receipts, and prepare a consoli...', 58, '2025-12-18 17:16:22'),
(44, 15, 'deadline_changed', 'Dec 18, 2025 00:00', 'Dec 18, 2025 00:00', 'Deadline changed from \"Dec 18, 2025 00:00\" to \"Dec 18, 2025 00:00\"', 58, '2025-12-18 17:21:06'),
(45, 15, 'updated', 'Task details', 'Task updated', 'Updated: Deadline', 58, '2025-12-18 17:21:06'),
(46, 15, 'deadline_changed', 'Dec 18, 2025 00:00', 'Dec 18, 2025 00:00', 'Deadline changed from \"Dec 18, 2025 00:00\" to \"Dec 18, 2025 00:00\"', 58, '2025-12-18 17:21:35'),
(47, 15, 'updated', 'Task details', 'Task updated', 'Updated: Deadline', 58, '2025-12-18 17:21:35'),
(48, 16, 'created', '', 'Task created', 'Task \"Update Expense Module UI\" created | Assigned to: Yazhini  S | Priority: Medium | Type: Ad hoc | SLA: 0.25h | Deadline: Dec 18, 2025 00:00 | Planned: Dec 18, 2025 | Description: Review and update the expense module user interface, fix alignment issues, and ensure proper validat...', 58, '2025-12-18 17:47:49'),
(49, 15, 'deadline_changed', 'Dec 18, 2025 00:00', 'Dec 18, 2025 00:00', 'Deadline changed from \"Dec 18, 2025 00:00\" to \"Dec 18, 2025 00:00\"', 58, '2025-12-18 17:57:56'),
(50, 15, 'updated', 'Task details', 'Task updated', 'Updated: Deadline', 58, '2025-12-18 17:57:56'),
(51, 17, 'created', '', 'Task created', 'Task \"Review Expense Module UI and Fix Validation Issues\" created | Assigned to: Yazhini  S | Priority: Medium | Type: Ad hoc | SLA: 0.25h | Deadline: Dec 18, 2025 00:00 | Planned: Dec 18, 2025 | Description: Review and update the expense module user interface to improve layout consistency.\r\nFix alignment is...', 58, '2025-12-18 18:11:07'),
(52, 18, 'created', '', 'Task created', 'Task \"Update Vendor Payment Approval Screen\" created | Assigned to: Yazhini  S | Priority: Medium | Type: Ad hoc | SLA: 0.25h | Deadline: Dec 18, 2025 00:00 | Planned: Dec 18, 2025 | Description: Review and update the vendor payment approval screen to improve layout consistency and readability.', 58, '2025-12-18 18:22:20'),
(53, 19, 'created', '', 'Task created', 'Task \"Update homepage banner images\" created | Assigned to: Yazhini  S | Priority: Medium | Type: Ad hoc | SLA: 0.25h | Deadline: Dec 19, 2025 00:00 | Planned: Dec 19, 2025 | Description: Replace existing homepage banners with the new marketing images provided in the folder.', 58, '2025-12-18 19:39:06'),
(54, 20, 'created', '', 'Task created', 'Task \"Prepare Monthly Social Media Content\" created | Assigned to: Yazhini  S | Priority: Medium | Type: Ad hoc | SLA: 0.25h | Deadline: Dec 19, 2025 00:00 | Planned: Dec 19, 2025 | Description: Create 10 social media posts for the upcoming month.', 58, '2025-12-18 19:45:53'),
(55, 20, 'description_changed', 'Description updated', 'Description updated', 'Task description was modified', 37, '2025-12-18 20:02:23'),
(56, 20, 'deadline_changed', 'Dec 19, 2025 00:00', 'Dec 19, 2025 00:00', 'Deadline changed from \"Dec 19, 2025 00:00\" to \"Dec 19, 2025 00:00\"', 37, '2025-12-18 20:02:23'),
(57, 20, 'updated', 'Task details', 'Task updated', 'Updated: Description, Deadline', 37, '2025-12-18 20:02:23'),
(58, 20, 'description_changed', 'Description updated', 'Description updated', 'Task description was modified', 37, '2025-12-18 20:02:43'),
(59, 20, 'deadline_changed', 'Dec 19, 2025 00:00', 'Dec 19, 2025 00:00', 'Deadline changed from \"Dec 19, 2025 00:00\" to \"Dec 19, 2025 00:00\"', 37, '2025-12-18 20:02:43'),
(60, 20, 'updated', 'Task details', 'Task updated', 'Updated: Description, Deadline', 37, '2025-12-18 20:02:43'),
(61, 21, 'created', '', 'Task created', 'Task \"Project Creation Form UI Consistency\" created | Assigned to: Yazhini  S | Priority: Medium | Type: Ad hoc | SLA: 0.25h | Deadline: Dec 19, 2025 00:00 | Planned: Dec 19, 2025 | Description: Improve spacing, alignment, and label consistency across the project creation form for better usabil...', 1, '2025-12-19 07:40:02'),
(62, 21, 'assigned', 'Athenas Owner', 'Yazhini  S', 'Task assigned by Athenas Owner to Yazhini  S', 1, '2025-12-19 07:40:02'),
(63, 21, 'deadline_changed', 'Dec 19, 2025 00:00', 'Dec 19, 2025 00:00', 'Deadline changed from \"Dec 19, 2025 00:00\" to \"Dec 19, 2025 00:00\"', 1, '2025-12-19 07:40:12'),
(64, 21, 'sla_changed', '0.2500', '0.3', 'SLA changed from \"0.2500 hours\" to \"0.3 hours\"', 1, '2025-12-19 07:40:12'),
(65, 21, 'updated', 'Task details', 'Task updated', 'Updated: Deadline, SLA', 1, '2025-12-19 07:40:12'),
(66, 22, 'created', '', 'Task created', 'Task \"Prepare Deployment Checklist for New Release\" created | Assigned to: Yazhini  S | Priority: Medium | Type: Ad hoc | SLA: 0.33h | Deadline: Dec 19, 2025 00:00 | Planned: Dec 19, 2025 | Description: Create a checklist to ensure all mandatory steps are completed before deploying a new release.', 1, '2025-12-19 08:11:43'),
(67, 22, 'assigned', 'Athenas Owner', 'Yazhini  S', 'Task assigned by Athenas Owner to Yazhini  S', 1, '2025-12-19 08:11:43'),
(68, 23, 'created', '', 'Task created', 'Task \"Prepare Monthly Attendance & Payroll Report\" created | Assigned to: Nelson | Priority: Medium | Type: Ad hoc | SLA: 0.25h | Deadline: Dec 19, 2025 00:00 | Planned: Dec 19, 2025 | Description: Compile employee attendance data for the current month, verify leave and overtime entries, and prepa...', 58, '2025-12-19 08:16:16'),
(69, 23, 'assigned', 'Yazhini  S', 'Nelson', 'Task assigned by Yazhini  S to Nelson', 58, '2025-12-19 08:16:16'),
(70, 23, 'reassigned', 'Nelson', 'Nelson Raj', 'Task reassigned from \"Nelson\" to \"Nelson Raj\"', 37, '2025-12-19 08:20:46'),
(71, 23, 'deadline_changed', 'Dec 19, 2025 00:00', 'Dec 19, 2025 00:00', 'Deadline changed from \"Dec 19, 2025 00:00\" to \"Dec 19, 2025 00:00\"', 37, '2025-12-19 08:20:46'),
(72, 23, 'updated', 'Task details', 'Task updated', 'Updated: Assignment, Deadline', 37, '2025-12-19 08:20:46'),
(73, 23, 'title_changed', 'Prepare Monthly Attendance & Payroll Report', '1 Prepare Monthly Attendance & Payroll Report', 'Title changed from \"Prepare Monthly Attendance & Payroll Report\" to \"1 Prepare Monthly Attendance & Payroll Report\"', 57, '2025-12-19 08:44:05'),
(74, 23, 'deadline_changed', 'Dec 19, 2025 00:00', 'Dec 19, 2025 00:00', 'Deadline changed from \"Dec 19, 2025 00:00\" to \"Dec 19, 2025 00:00\"', 57, '2025-12-19 08:44:05'),
(75, 23, 'updated', 'Task details', 'Task updated', 'Updated: Title, Deadline', 57, '2025-12-19 08:44:05'),
(76, 24, 'created', '', 'Task created', 'Task \"Prepare Monthly Project Status Report\" created | Assigned to: Yazhini  S | Priority: Medium | Type: Ad hoc | SLA: 0.25h | Deadline: Dec 19, 2025 00:00 | Planned: Dec 19, 2025 | Description: Prepare and compile the monthly project status report for the assigned project.\r\nInclude progress up...', 58, '2025-12-19 08:58:06'),
(77, 24, 'deadline_changed', 'Dec 19, 2025 00:00', 'Dec 19, 2025 00:00', 'Deadline changed from \"Dec 19, 2025 00:00\" to \"Dec 19, 2025 00:00\"', 58, '2025-12-19 08:59:35'),
(78, 24, 'updated', 'Task details', 'Task updated', 'Updated: Deadline', 58, '2025-12-19 08:59:35'),
(79, 25, 'created', '', 'Task created', 'Task \"Fix Notification Alignment and Flicker Issue\" created | Assigned to: Yazhini  S | Priority: High | Type: Ad hoc | SLA: 0.28h | Deadline: Dec 19, 2025 00:00 | Planned: Dec 19, 2025 | Description: Notifications are not displaying all data properly. Alignment is inconsistent, and the content brief...', 1, '2025-12-19 11:05:53'),
(80, 25, 'assigned', 'Athenas Owner', 'Yazhini  S', 'Task assigned by Athenas Owner to Yazhini  S', 1, '2025-12-19 11:05:53'),
(81, 26, 'created', '', 'Task created', 'Task \"Prepare Monthly Attendance & Expense Report\" created | Assigned to: Yazhini  S | Priority: Medium | Type: Ad hoc | SLA: 0.25h | Deadline: Dec 19, 2025 00:00 | Planned: Dec 19, 2025 | Description: Compile and verify the monthly attendance records and site expense details for the assigned project.', 58, '2025-12-19 11:06:29'),
(82, 27, 'created', '', 'Task created', 'Task \"Collect vtm documents\" created | Assigned to: Nelson | Priority: Medium | Type: Ad hoc | SLA: 0.25h | Deadline: Dec 19, 2025 00:00 | Planned: Dec 19, 2025 | Description: Collect vtm documents', 37, '2025-12-19 13:21:56'),
(83, 28, 'created', '', 'Task created', 'Task \"update the Expenses Ledger\" created | Assigned to: Yazhini | Priority: Medium | Type: Ad hoc | SLA: 0.25h | Deadline: Dec 19, 2025 00:00 | Planned: Dec 19, 2025 | Description: update the Expenses Ledger', 37, '2025-12-19 13:25:33'),
(84, 28, 'assigned', 'Nelson', 'Yazhini', 'Task assigned by Nelson to Yazhini', 37, '2025-12-19 13:25:33'),
(85, 29, 'created', '', 'Task created', 'Task \"Collect VTM Documents\" created | Assigned to: Yazhini  S | Priority: Medium | Type: Ad hoc | SLA: 0.25h | Deadline: Jan 01, 2026 00:00 | Description: Coordinate with Anbazhagan Sir to collect details regarding the pending VTM factory documents and co...', 58, '2026-01-01 05:37:16'),
(86, 30, 'created', '', 'Task created', 'Task \"MMS PILING\" created | Assigned to: R.Ananthan | Priority: High | Type: Milestone | SLA: 0.25h | Planned: Jan 01, 2026 | Description: MMS PILING\r\nPile Foundations, 1.75 MTR Depth & 350 MM dia pilling and foundation along with pile cap...', 1, '2026-01-01 09:28:04'),
(87, 30, 'assigned', 'Athenas Owner', 'R.Ananthan', 'Task assigned by Athenas Owner to R.Ananthan', 1, '2026-01-01 09:28:04'),
(88, 31, 'created', '', 'Task created', 'Task \"MMS & MODULE INSTALLATION\" created | Assigned to: R.Ananthan | Priority: High | Type: Milestone | SLA: 0.25h | Planned: Jan 01, 2026 | Description: MMS & MODULE INSTALLATION\r\nI & C WORK For MMS AND MODULES work as per the as per attached approved S...', 1, '2026-01-01 09:29:10'),
(89, 31, 'assigned', 'Athenas Owner', 'R.Ananthan', 'Task assigned by Athenas Owner to R.Ananthan', 1, '2026-01-01 09:29:10'),
(90, 32, 'created', '', 'Task created', 'Task \"I&C - AC SCOPE\" created | Assigned to: R.Ananthan | Priority: High | Type: Milestone | SLA: 0.25h | Planned: Jan 01, 2026 | Description: I&C - AC SCOPE\r\n I & C WORK For AC work as per the as per attached approved SOW ,GA & BOM', 1, '2026-01-01 09:30:25'),
(91, 32, 'assigned', 'Athenas Owner', 'R.Ananthan', 'Task assigned by Athenas Owner to R.Ananthan', 1, '2026-01-01 09:30:25'),
(92, 33, 'created', '', 'Task created', 'Task \"I&C - DC SCOPE\" created | Assigned to: R.Ananthan | Priority: High | Type: Milestone | SLA: 0.25h | Planned: Jan 01, 2026 | Description: I&C - DC SCOPE \r\nI & C WORK For DC work as per the as per attached approved SOW ,GA & BOM', 1, '2026-01-01 09:31:16'),
(93, 33, 'assigned', 'Athenas Owner', 'R.Ananthan', 'Task assigned by Athenas Owner to R.Ananthan', 1, '2026-01-01 09:31:16'),
(94, 34, 'created', '', 'Task created', 'Task \"FENCING - CHAIN LINK - INSTALLATION\" created | Assigned to: R.Ananthan | Priority: High | Type: Milestone | SLA: 0.25h | Planned: Jan 01, 2026 | Description: FENCING - CHAIN LINK - INSTALLATION \r\nI & C WORK For Fencing work as per the as per attached approve...', 1, '2026-01-01 09:32:08'),
(95, 34, 'assigned', 'Athenas Owner', 'R.Ananthan', 'Task assigned by Athenas Owner to R.Ananthan', 1, '2026-01-01 09:32:08'),
(96, 35, 'created', '', 'Task created', 'Task \"HT PANEL FOUNDATION\" created | Assigned to: S.Karthik | Priority: High | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: HT PANEL FOUNDATION \r\nSS SIDE HT Foundation with canopy and shed as per approved dwg.', 1, '2026-01-02 04:12:39'),
(97, 35, 'assigned', 'Athenas Owner', 'S.Karthik', 'Task assigned by Athenas Owner to S.Karthik', 1, '2026-01-02 04:12:39'),
(98, 36, 'created', '', 'Task created', 'Task \"IDT FOUNDATION WORK\" created | Assigned to: S.Karthik | Priority: High | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: IDT FOUNDATION WORK \r\nIDT Foundation (Bus Duct Foundation) With Gravel filling & soak pit foundation', 1, '2026-01-02 04:13:57'),
(99, 36, 'assigned', 'Athenas Owner', 'S.Karthik', 'Task assigned by Athenas Owner to S.Karthik', 1, '2026-01-02 04:13:57'),
(100, 37, 'created', '', 'Task created', 'Task \"MISC. CIVIL WORK\" created | Assigned to: S.Karthik | Priority: High | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: MISC. CIVIL WORK\r\nLT Panel foundation with fabrication eppoxy painting with canopy shed material sup...', 1, '2026-01-02 04:14:51'),
(101, 37, 'assigned', 'Athenas Owner', 'S.Karthik', 'Task assigned by Athenas Owner to S.Karthik', 1, '2026-01-02 04:14:51'),
(102, 38, 'created', '', 'Task created', 'Task \"CIVIL FOUNDATION WORK\" created | Assigned to: R.Ananthan | Priority: High | Type: Milestone | SLA: 0.01h | Planned: Jan 02, 2026 | Description: CIVIL FOUNDATION WORK 1.00 1,250,000.00\r\nLT & HT Panel Foundation with\r\nCanopy work', 1, '2026-01-02 04:14:54'),
(103, 38, 'assigned', 'Athenas Owner', 'R.Ananthan', 'Task assigned by Athenas Owner to R.Ananthan', 1, '2026-01-02 04:14:54'),
(104, 39, 'created', '', 'Task created', 'Task \"MISC. CIVIL WORK\" created | Assigned to: S.Karthik | Priority: Medium | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: MISC. CIVIL WORK \r\nICOG & HT Switchboard Panel foundation with fabrication eppoxy painting with cano...', 1, '2026-01-02 04:15:41'),
(105, 39, 'assigned', 'Athenas Owner', 'S.Karthik', 'Task assigned by Athenas Owner to S.Karthik', 1, '2026-01-02 04:15:41'),
(106, 40, 'created', '', 'Task created', 'Task \"MISC. CIVIL WORK\" created | Assigned to: S.Karthik | Priority: High | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: MISC. CIVIL WORK \r\nIDT Fencing installation & fire extingushers arrangements & mounting', 1, '2026-01-02 04:17:10'),
(107, 40, 'assigned', 'Athenas Owner', 'S.Karthik', 'Task assigned by Athenas Owner to S.Karthik', 1, '2026-01-02 04:17:10'),
(108, 41, 'created', '', 'Task created', 'Task \"IDT FOUNDATION WORK\" created | Assigned to: R.Ananthan | Priority: Medium | Type: Ad hoc | SLA: 0.25h | Planned: Jan 02, 2026 | Description: IDT FOUNDATION WORK IDT Foundation work as per\r\napproved Grawing', 1, '2026-01-02 04:17:36'),
(109, 41, 'assigned', 'Athenas Owner', 'R.Ananthan', 'Task assigned by Athenas Owner to R.Ananthan', 1, '2026-01-02 04:17:36'),
(110, 42, 'created', '', 'Task created', 'Task \"MISC. CIVIL WORK\" created | Assigned to: S.Karthik | Priority: High | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: MISC. CIVIL WORK \r\nICR Gate installation', 1, '2026-01-02 04:18:01'),
(111, 42, 'assigned', 'Athenas Owner', 'S.Karthik', 'Task assigned by Athenas Owner to S.Karthik', 1, '2026-01-02 04:18:01'),
(112, 43, 'created', '', 'Task created', 'Task \"IDT FOUNDATION WORK  (Torrent Urja 17 Pvt Ltd)\" created | Assigned to: S.Karthik | Priority: Medium | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: IDT FOUNDATION WORK \r\nIDT foundation with BOT as per approved dwg.', 1, '2026-01-02 04:22:15'),
(113, 43, 'assigned', 'Athenas Owner', 'S.Karthik', 'Task assigned by Athenas Owner to S.Karthik', 1, '2026-01-02 04:22:15'),
(114, 44, 'created', '', 'Task created', 'Task \"LT PANEL FOUNDATION (Torrent Urja 17 Pvt Ltd)\" created | Assigned to: S.Karthik | Priority: High | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: LT PANEL FOUNDATION \r\nLT Foundation & Bus duct foundation with canopy and shed as per approved dwg.', 1, '2026-01-02 04:23:39'),
(115, 44, 'assigned', 'Athenas Owner', 'S.Karthik', 'Task assigned by Athenas Owner to S.Karthik', 1, '2026-01-02 04:23:39'),
(116, 45, 'created', '', 'Task created', 'Task \"MMS PILING Green Pro\" created | Assigned to: S.Johnkennedy | Priority: High | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: MMS PILING \r\nMMS Piling as per below Size\r\n1) Piling 300 MM dia * 1500 MM\r\ndepth\r\n2) Pile cap 300 MM...', 1, '2026-01-02 04:24:46'),
(117, 45, 'assigned', 'Athenas Owner', 'S.Johnkennedy', 'Task assigned by Athenas Owner to S.Johnkennedy', 1, '2026-01-02 04:24:46'),
(118, 46, 'created', '', 'Task created', 'Task \"HT PANEL FOUNDATION (Torrent Urja 17 Pvt Ltd)\" created | Assigned to: S.Karthik | Priority: High | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: HT PANEL FOUNDATION \r\nHT Foundation with canopy and shed as per approved dwg', 1, '2026-01-02 04:24:49'),
(119, 46, 'assigned', 'Athenas Owner', 'S.Karthik', 'Task assigned by Athenas Owner to S.Karthik', 1, '2026-01-02 04:24:49'),
(120, 44, 'reassigned', 'S.Karthik', 'S.Johnkennedy', 'Task reassigned from \"S.Karthik\" to \"S.Johnkennedy\"', 1, '2026-01-02 04:28:51'),
(121, 44, 'updated', 'Task details', 'Task updated', 'Updated: Assignment', 1, '2026-01-02 04:28:51'),
(122, 47, 'created', '', 'Task created', 'Task \"MMS PILING Pile Foundations\" created | Assigned to: S.Karthik | Priority: Medium | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: MMS PILING Pile Foundations \r\n1500MM Depth & 350 MM dia pilling and foundation along with pile cap w...', 1, '2026-01-02 04:36:04'),
(123, 47, 'assigned', 'Athenas Owner', 'S.Karthik', 'Task assigned by Athenas Owner to S.Karthik', 1, '2026-01-02 04:36:04'),
(124, 48, 'created', '', 'Task created', 'Task \"MMS & MODULE INSTALLATION\" created | Assigned to: S.Karthik | Priority: Medium | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: MMS & MODULE INSTALLATION \r\nI & C WORK For MMS AND MODULES work as per the as per attached approved ...', 1, '2026-01-02 04:37:46'),
(125, 48, 'assigned', 'Athenas Owner', 'S.Karthik', 'Task assigned by Athenas Owner to S.Karthik', 1, '2026-01-02 04:37:46'),
(126, 49, 'created', '', 'Task created', 'Task \"I&C - AC SCOPE\" created | Assigned to: S.Karthik | Priority: High | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: I&C - AC SCOPE \r\nI & C WORK For AC work as per the as per attached approved SOW ,GA & BOM', 1, '2026-01-02 04:41:38'),
(127, 49, 'assigned', 'Athenas Owner', 'S.Karthik', 'Task assigned by Athenas Owner to S.Karthik', 1, '2026-01-02 04:41:38'),
(128, 50, 'created', '', 'Task created', 'Task \"I&C - DC SCOPE\" created | Assigned to: S.Karthik | Priority: High | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: I&C - DC SCOPE \r\nI & C WORK For DC work as per the as per attached approved SOW ,GA & BOM', 1, '2026-01-02 04:42:38'),
(129, 50, 'assigned', 'Athenas Owner', 'S.Karthik', 'Task assigned by Athenas Owner to S.Karthik', 1, '2026-01-02 04:42:38'),
(130, 51, 'created', '', 'Task created', 'Task \"CIVIL FOUNDATION WORK\" created | Assigned to: S.Karthik | Priority: Medium | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: CIVIL FOUNDATION WORK\r\nI & C WORK For ICR Foundation work as per the as per attached approved SOW ,G...', 1, '2026-01-02 04:43:39'),
(131, 51, 'assigned', 'Athenas Owner', 'S.Karthik', 'Task assigned by Athenas Owner to S.Karthik', 1, '2026-01-02 04:43:39'),
(132, 52, 'created', '', 'Task created', 'Task \"FENCING - CHAIN LINK - INSTALLATION\" created | Assigned to: S.Karthik | Priority: High | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: FENCING - CHAIN LINK - INSTALLATION \r\nI & C WORK For Fencing work as per the as per attached approve...', 1, '2026-01-02 04:44:38'),
(133, 52, 'assigned', 'Athenas Owner', 'S.Karthik', 'Task assigned by Athenas Owner to S.Karthik', 1, '2026-01-02 04:44:38'),
(134, 53, 'created', '', 'Task created', 'Task \"I&C - MISCELLANEOUS\" created | Assigned to: S.Karthik | Priority: Medium | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: I&C - MISCELLANEOUS \r\n 1. LA Earthing installation \r\n2. WMS Installation & connection \r\n3. Module cl...', 1, '2026-01-02 04:45:54'),
(135, 53, 'assigned', 'Athenas Owner', 'S.Karthik', 'Task assigned by Athenas Owner to S.Karthik', 1, '2026-01-02 04:45:54'),
(136, 54, 'created', '', 'Task created', 'Task \"MMS PILING\" created | Assigned to: S.Karthik | Priority: High | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: MMS PILING \r\nPile Foundations, 1.75 MTR Depth & 350 MM dia pilling and foundation along with pile ca...', 1, '2026-01-02 04:47:50'),
(137, 54, 'assigned', 'Athenas Owner', 'S.Karthik', 'Task assigned by Athenas Owner to S.Karthik', 1, '2026-01-02 04:47:50'),
(138, 55, 'created', '', 'Task created', 'Task \"MMS INSTALLATION\" created | Assigned to: S.Johnkennedy | Priority: High | Type: Ad hoc | SLA: 0.25h | Planned: Jan 02, 2026 | Description: MMS INSTALLATION\r\nMMS unloading shifting &\r\nmounting\r\nmodule unloading shifting &\r\nmounting', 1, '2026-01-02 04:47:50'),
(139, 55, 'assigned', 'Athenas Owner', 'S.Johnkennedy', 'Task assigned by Athenas Owner to S.Johnkennedy', 1, '2026-01-02 04:47:50'),
(140, 56, 'created', '', 'Task created', 'Task \"MMS & MODULE INSTALLATION\" created | Assigned to: S.Karthik | Priority: High | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: MMS & MODULE INSTALLATION \r\nI & C WORK For MMS AND MODULES work as per the as per attached approved ...', 1, '2026-01-02 04:48:57'),
(141, 56, 'assigned', 'Athenas Owner', 'S.Karthik', 'Task assigned by Athenas Owner to S.Karthik', 1, '2026-01-02 04:48:57'),
(142, 57, 'created', '', 'Task created', 'Task \"I&C - AC SCOPE\" created | Assigned to: S.Karthik | Priority: High | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: I&C - AC SCOPE \r\nI & C WORK For AC work as per the as per attached approved SOW ,GA & BOM', 1, '2026-01-02 04:53:48'),
(143, 57, 'assigned', 'Athenas Owner', 'S.Karthik', 'Task assigned by Athenas Owner to S.Karthik', 1, '2026-01-02 04:53:48'),
(144, 58, 'created', '', 'Task created', 'Task \"I&C - DC SCOPE\" created | Assigned to: S.Karthik | Priority: High | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: I&C - DC SCOPE \r\nI & C WORK For DC work as per the as per attached approved SOW ,GA & BOM', 1, '2026-01-02 04:57:46'),
(145, 58, 'assigned', 'Athenas Owner', 'S.Karthik', 'Task assigned by Athenas Owner to S.Karthik', 1, '2026-01-02 04:57:46'),
(146, 59, 'created', '', 'Task created', 'Task \"CIVIL FOUNDATION WORK\" created | Assigned to: S.Karthik | Priority: Medium | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: CIVIL FOUNDATION WORK \r\nI & C WORK For ICR Foundation work as per the as per attached approved SOW ,...', 1, '2026-01-02 04:58:36'),
(147, 59, 'assigned', 'Athenas Owner', 'S.Karthik', 'Task assigned by Athenas Owner to S.Karthik', 1, '2026-01-02 04:58:36'),
(148, 60, 'created', '', 'Task created', 'Task \"CABLE LAYING\" created | Assigned to: S.Johnkennedy | Priority: Medium | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: CABLE LAYING\r\nCable laying, earthing cctv, &\r\nSCADA As per as below\r\nmentioned.\r\n1. AC Cable laying ...', 1, '2026-01-02 04:58:43'),
(149, 60, 'assigned', 'Athenas Owner', 'S.Johnkennedy', 'Task assigned by Athenas Owner to S.Johnkennedy', 1, '2026-01-02 04:58:43'),
(150, 61, 'created', '', 'Task created', 'Task \"FENCING - CHAIN LINK - INSTALLATION\" created | Assigned to: S.Karthik | Priority: High | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: FENCING - CHAIN LINK - INSTALLATION \r\nI & C WORK For Fencing work as per the as per attached approve...', 1, '2026-01-02 04:59:35'),
(151, 61, 'assigned', 'Athenas Owner', 'S.Karthik', 'Task assigned by Athenas Owner to S.Karthik', 1, '2026-01-02 04:59:35'),
(152, 62, 'created', '', 'Task created', 'Task \"CIVIL FOUNDATION WORK\" created | Assigned to: S.Johnkennedy | Priority: High | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: CIVIL FOUNDATION WORK\r\nAs per Approved Drawing', 1, '2026-01-02 05:02:14'),
(153, 62, 'assigned', 'Athenas Owner', 'S.Johnkennedy', 'Task assigned by Athenas Owner to S.Johnkennedy', 1, '2026-01-02 05:02:14'),
(154, 63, 'created', '', 'Task created', 'Task \"IDT FOUNDATION WORK\" created | Assigned to: S.Johnkennedy | Priority: High | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: IDT FOUNDATION WORK \r\nAs per Approved Drawing', 1, '2026-01-02 05:04:26'),
(155, 63, 'assigned', 'Athenas Owner', 'S.Johnkennedy', 'Task assigned by Athenas Owner to S.Johnkennedy', 1, '2026-01-02 05:04:26'),
(156, 64, 'created', '', 'Task created', 'Task \"I&C - MISCELLANEOUS\" created | Assigned to: S.Johnkennedy | Priority: High | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: I&C - MISCELLANEOUS\r\nRO Plant Foundation', 1, '2026-01-02 05:08:32'),
(157, 64, 'assigned', 'Athenas Owner', 'S.Johnkennedy', 'Task assigned by Athenas Owner to S.Johnkennedy', 1, '2026-01-02 05:08:32'),
(158, 65, 'created', '', 'Task created', 'Task \"I&C - MISCELLANEOUS\" created | Assigned to: S.Johnkennedy | Priority: High | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: I&C - MISCELLANEOUS\r\nMain gate installation with supply', 1, '2026-01-02 05:15:37'),
(159, 65, 'assigned', 'Athenas Owner', 'S.Johnkennedy', 'Task assigned by Athenas Owner to S.Johnkennedy', 1, '2026-01-02 05:15:37'),
(160, 66, 'created', '', 'Task created', 'Task \"MCS INSTALLATION\" created | Assigned to: Athenas Owner | Priority: High | Type: Milestone | SLA: 0.25h | Planned: Jan 02, 2026 | Description: MCS INSTALLATION \r\nAs per Approved Drawing', 1, '2026-01-02 05:19:36'),
(161, 67, 'created', '', 'Task created', 'Task \"I&C - MISCELLANEOUS\" created | Assigned to: S.Johnkennedy | Priority: Medium | Type: Ad hoc | SLA: 0.25h | Planned: Jan 02, 2026 | Description: I&C - MISCELLANEOUS \r\nSeptik tank construction', 1, '2026-01-02 05:26:26'),
(162, 67, 'assigned', 'Athenas Owner', 'S.Johnkennedy', 'Task assigned by Athenas Owner to S.Johnkennedy', 1, '2026-01-02 05:26:26'),
(163, 68, 'created', '', 'Task created', 'Task \"I&C - MISCELLANEOUS\" created | Assigned to: S.Johnkennedy | Priority: High | Type: Milestone | SLA: 0.25h | Description: &C - MISCELLANEOUS \r\n1. CCTV cable laying & Pole\r\nmounting in PV area\r\n2. Street Lighting pole mount...', 1, '2026-01-02 05:29:04'),
(164, 68, 'assigned', 'Athenas Owner', 'S.Johnkennedy', 'Task assigned by Athenas Owner to S.Johnkennedy', 1, '2026-01-02 05:29:04');

-- --------------------------------------------------------

--
-- Table structure for table `task_progress_history`
--

CREATE TABLE `task_progress_history` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `progress_from` int(11) NOT NULL DEFAULT 0,
  `progress_to` int(11) NOT NULL,
  `description` text DEFAULT NULL,
  `status_from` varchar(50) DEFAULT NULL,
  `status_to` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `task_progress_history`
--

INSERT INTO `task_progress_history` (`id`, `task_id`, `user_id`, `progress_from`, `progress_to`, `description`, `status_from`, `status_to`, `created_at`) VALUES
(1, 6, 37, 9, 25, 'Progress Description', 'in_progress', 'in_progress', '2025-12-11 03:01:03'),
(2, 10, 37, 0, 6, '^ percentage completed this task', 'assigned', 'in_progress', '2025-12-12 04:28:15'),
(3, 12, 1, 0, 23, 'Description', 'assigned', 'in_progress', '2025-12-15 06:46:04'),
(4, 12, 1, 23, 25, 'Progress Description 25', 'in_progress', 'in_progress', '2025-12-15 06:46:43'),
(5, 10, 1, 6, 10, 'Progress Level of 10% Completed', 'in_progress', 'in_progress', '2025-12-15 10:25:53'),
(6, 10, 1, 10, 13, 'Progress Level 13% completed', 'in_progress', 'in_progress', '2025-12-15 10:26:44'),
(7, 13, 1, 10, 17, '17Percentage task has been completed', 'in_progress', 'in_progress', '2025-12-16 18:17:06'),
(8, 10, 57, 18, 100, 'task completed', 'in_progress', 'completed', '2025-12-17 04:14:44'),
(9, 9, 58, 0, 100, 'Completed', 'assigned', 'completed', '2025-12-18 17:01:05'),
(10, 7, 58, 0, 100, 'Finished', 'assigned', 'completed', '2025-12-18 17:54:15'),
(11, 15, 58, 0, 100, 'Finished', 'assigned', 'completed', '2025-12-18 17:57:16'),
(12, 18, 58, 0, 100, 'Finished', 'assigned', 'completed', '2025-12-18 18:37:57'),
(13, 13, 37, 100, 100, 'Complete', 'completed', 'completed', '2025-12-18 20:41:40'),
(14, 23, 57, 0, 10, '10% task Completed', 'assigned', 'in_progress', '2025-12-19 08:44:43');

-- --------------------------------------------------------

--
-- Table structure for table `task_updates`
--

CREATE TABLE `task_updates` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `progress` int(11) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `attachment` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `time_logs`
--

CREATE TABLE `time_logs` (
  `id` int(11) NOT NULL,
  `daily_task_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action` varchar(50) NOT NULL,
  `timestamp` timestamp NOT NULL,
  `active_duration` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `employee_id` varchar(20) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(120) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('user','admin','owner','company_owner','system_admin') DEFAULT 'user',
  `is_system_admin` tinyint(1) DEFAULT 0,
  `phone` varchar(20) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `status` enum('active','inactive','suspended','terminated') DEFAULT 'active',
  `is_first_login` tinyint(1) DEFAULT 1,
  `temp_password` varchar(20) DEFAULT NULL,
  `password_reset_required` tinyint(1) DEFAULT 0,
  `last_login` datetime DEFAULT NULL,
  `last_ip` varchar(45) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female','other') DEFAULT NULL,
  `address` text DEFAULT NULL,
  `emergency_contact` varchar(20) DEFAULT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `joining_date` date DEFAULT NULL,
  `salary` decimal(10,2) DEFAULT NULL,
  `total_points` int(11) DEFAULT 0,
  `department_id` int(11) DEFAULT NULL,
  `shift_id` int(11) DEFAULT 1,
  `company_prefix` varchar(10) DEFAULT NULL,
  `current_project_id` int(11) DEFAULT NULL,
  `project_name` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `employee_id`, `name`, `email`, `password`, `role`, `is_system_admin`, `phone`, `department`, `status`, `is_first_login`, `temp_password`, `password_reset_required`, `last_login`, `last_ip`, `created_at`, `updated_at`, `date_of_birth`, `gender`, `address`, `emergency_contact`, `designation`, `joining_date`, `salary`, `total_points`, `department_id`, `shift_id`, `company_prefix`, `current_project_id`, `project_name`) VALUES
(1, 'EMP001', 'Athenas Owner', 'info@athenas.co.in', '$2y$10$GKrksmX0Pmp5DoXJ9YskPOZ0x9O192vodYSVg4mRswfgg4kNGfYUq', 'owner', 0, NULL, 'General', 'active', 0, 'owner123', 0, '2026-01-14 09:37:16', '2405:201:e067:384e:35f5:dd79:66eb:5eef', '2025-10-23 06:24:06', '2026-01-14 04:07:16', '1990-01-01', 'male', 'Test Address Update', '9999999999', 'Test Designation', '2024-01-01', 50000.00, 0, 1, 1, NULL, NULL, NULL),
(16, 'ATSO003', 'Harini M', 'harini@athenas.co.in', '$2y$10$lv3/osIeLSd2WNIYb5wVPutyHaVuLoAZLkOUnlo/vWCLqgsU6bov2', 'admin', 0, '+91 63807 95088', 'Finance & Accounts,Liaison,Marketing & Sales,Operations', 'active', 1, 'RST7498R', 1, '2025-12-24 14:23:05', '2405:201:e067:384e:1c7f:cd62:dbf9:9847', '2025-10-24 02:34:52', '2025-12-24 08:53:28', '2004-06-20', 'female', '9/A, Siva Nagar Main Road, Ramasamy Nagar, Thiruppalai, Madurai - 625014.', '+91 90801 04695', 'Administrator', '2024-06-20', 15000.00, 0, 13, 1, NULL, NULL, NULL),
(58, 'EMP016', 'Yazhini  S', 'yazhini@athenas.co.in', '$2y$10$zb0hjajdpTab/N7tPUQVFuNbrEhCvxr0L4KYIDV1WVgCofBjvkQSW', 'user', 0, '+91 63803 28692', NULL, 'active', 1, NULL, 0, '2026-02-06 16:51:48', '2405:201:e067:384e:a899:acde:494d:4045', '2025-12-01 06:13:28', '2026-02-06 11:21:48', '2004-08-24', 'female', '2/6, Pajanamadam street, Narimadu, Madurai - 02.', '+91 97919 50350', 'Accounting Administrator', '2025-10-01', 11500.00, 0, 13, 1, NULL, NULL, NULL),
(59, 'EMP017', 'Anbu', 'anbu@bkge.com', '$2y$10$YLaT/SzO4rp5VjHoxqG4BOYNifP2XnWtW0V9wQ2mzTho6bcxaOV0K', 'owner', 0, '6380795088', NULL, 'active', 1, NULL, 0, NULL, NULL, '2025-12-02 17:09:10', '2025-12-10 02:29:24', '2004-06-20', 'male', 'Vsnjsmsnl bbdmbd ksjeb.', '', 'Owner', '2025-07-01', NULL, 0, 5, 1, 'BKGE', NULL, NULL),
(67, 'EMP021', 'S.Karthik', 'smartkarthikcivil20@gmail.com', '$2y$10$0N3bpSdSPDFVoglHlIOFvOEDRK/t/R1Y3XzkjVBKYyOeNDF4oLs.m', 'user', 0, '7708858900', NULL, 'active', 1, NULL, 0, '2026-02-06 09:07:13', '2409:40f2:1036:6d77:8000::', '2025-12-19 06:09:39', '2026-02-06 03:37:13', '2000-01-05', 'male', '2/320, Urangan patty, Melur ( tk ), Madurai ( dt ), Tamilnadu, 625109.', '9486375019', 'Civil - Site Engineer', '2025-12-01', 43000.00, 0, 5, 1, NULL, NULL, NULL),
(68, 'EMP022', 'Mahesh Hebballi', 'maheshhebballi1999@gmail.com', '$2y$10$lDf5d8ZsO6dlglDq5pa4IOfFd9CWNRNxGnZ.yCuDJbk7o.gOOoJU2', 'user', 0, '', NULL, 'active', 1, NULL, 0, '2025-12-23 18:33:42', '2409:40f2:205f:7873:8000::', '2025-12-19 06:13:03', '2025-12-23 13:03:42', NULL, 'male', '', '', '', NULL, NULL, 0, NULL, 1, NULL, NULL, NULL),
(69, 'EMP023', 'S.Johnkennedy', 'johnkennedys1977@gmail.com', '$2y$10$s0YlzudBowhndCYYXwHdA.thGGlWSKL0PsaPlGF0G5iy4iczf3UuW', 'user', 0, '8320873945', NULL, 'active', 1, NULL, 0, '2026-01-31 10:16:06', '2409:40f2:3055:97a7:1cad:daff:fe7a:ccc3', '2025-12-19 06:14:52', '2026-01-31 04:46:06', '1977-01-09', 'male', '', '9360792282', 'Electrical', '2004-02-01', 45000.00, 0, NULL, 1, NULL, NULL, NULL),
(70, 'EMP024', 'S.Senguttuvan', 'Senguttuvandeva@gmail.com', '$2y$10$J6.9pIbA2m4BMwyCPZABeeHUIKnaNMLPw6.1wJYeFlRP/lYqDw4WS', 'user', 0, '7339342051', NULL, 'active', 1, NULL, 0, '2025-12-23 18:21:31', '2401:4900:927e:f850:67c9:653d:b966:d393', '2025-12-19 06:21:36', '2025-12-23 12:51:31', '2000-09-24', 'male', '2/265,urangan,patty,melur(tk),madurai(dt),tamilnadu,625109', '', 'Civil', NULL, 1800.00, 0, 5, 1, NULL, NULL, NULL),
(71, 'EMP025', 'R.Ananthan', 'Ananthanvivek35@gmail.com', '$2y$10$1TLYHlkqifACH0ArqHCrtOBIxeQU1SAJHBPb7gr3FI9LzZpFC3YQO', 'user', 0, '', NULL, 'active', 1, NULL, 0, '2025-12-24 10:07:11', '2405:201:e067:384e:c4cd:5251:c43f:a9de', '2025-12-19 06:35:25', '2025-12-24 04:37:11', NULL, '', '', '', '', NULL, NULL, 0, 5, 1, NULL, NULL, NULL),
(72, 'EMP026', 'Leo', 'leo@gmail.com', '$2y$10$AAEyp/yfqpp1ly0cBdNe/uehT.abDxiLekmrZaqkwbt0uwUZ/G8y.', 'admin', 0, '9847934923', NULL, 'active', 1, NULL, 0, '2025-12-31 10:04:45', '2405:201:e067:384e:e91f:c0cc:1b3a:a15', '2025-12-31 04:32:51', '2025-12-31 04:34:45', '2000-12-12', 'male', 'Madurai', '9429293339', 'HR', '2025-10-01', 15000.00, 0, 1, 1, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_badges`
--

CREATE TABLE `user_badges` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `badge_id` int(11) NOT NULL,
  `awarded_on` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_departments`
--

CREATE TABLE `user_departments` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `department_id` int(11) NOT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_devices`
--

CREATE TABLE `user_devices` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `fcm_token` varchar(255) NOT NULL,
  `device_type` enum('android','ios','web') DEFAULT 'android',
  `device_info` text DEFAULT NULL,
  `last_active` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_ledgers`
--

CREATE TABLE `user_ledgers` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `reference_type` varchar(50) NOT NULL,
  `reference_id` int(11) NOT NULL,
  `entry_type` varchar(50) NOT NULL,
  `direction` varchar(10) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `balance_after` decimal(12,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_ledgers`
--

INSERT INTO `user_ledgers` (`id`, `user_id`, `reference_type`, `reference_id`, `entry_type`, `direction`, `amount`, `balance_after`, `created_at`) VALUES
(1, 57, 'advance', 4, 'advance', 'credit', 1500.00, 1500.00, '2025-12-09 14:52:49'),
(2, 57, 'expense', 13, 'expense', 'debit', 500.00, 1000.00, '2025-12-09 14:55:39'),
(3, 57, 'expense', 9, 'expense', 'debit', 500.00, 500.00, '2025-12-09 18:16:50'),
(4, 37, 'expense', 2, 'expense', 'debit', 810.00, -810.00, '2025-12-09 18:17:27'),
(5, 37, 'advance', 5, 'advance', 'credit', 1000.00, 190.00, '2025-12-09 18:30:18'),
(6, 37, 'expense', 15, 'expense', 'debit', 1000.00, -810.00, '2025-12-11 03:21:39'),
(7, 1, 'expense', 14, 'expense', 'debit', 123456.00, -123456.00, '2025-12-11 03:39:00'),
(8, 57, 'expense', 16, 'expense', 'debit', 10000.00, -9500.00, '2025-12-11 03:44:42'),
(9, 58, 'advance', 7, 'advance', 'credit', 1500.00, 1500.00, '2025-12-11 07:33:46'),
(10, 37, 'expense', 17, 'expense', 'debit', 723.00, -1533.00, '2025-12-16 18:49:11'),
(11, 37, 'advance', 2, 'advance', 'credit', 12000.00, 10467.00, '2025-12-17 04:41:18'),
(12, 57, 'advance', 10, 'advance', 'credit', 2000.00, -7500.00, '2025-12-18 20:23:48');

-- --------------------------------------------------------

--
-- Table structure for table `user_points`
--

CREATE TABLE `user_points` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `points` int(11) NOT NULL,
  `reason` varchar(200) NOT NULL,
  `reference_type` enum('task','attendance','workflow','bonus') DEFAULT 'task',
  `reference_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_preferences`
--

CREATE TABLE `user_preferences` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `preference_key` varchar(50) NOT NULL,
  `preference_value` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_projects`
--

CREATE TABLE `user_projects` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `assigned_at` timestamp NULL DEFAULT current_timestamp(),
  `status` enum('active','inactive','completed') DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_sessions`
--

CREATE TABLE `user_sessions` (
  `id` varchar(128) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `accounts`
--
ALTER TABLE `accounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `account_code` (`account_code`);

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_activity` (`user_id`,`created_at`),
  ADD KEY `idx_activity_type` (`activity_type`);

--
-- Indexes for table `admin_positions`
--
ALTER TABLE `admin_positions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_admin` (`user_id`),
  ADD KEY `assigned_by` (`assigned_by`);

--
-- Indexes for table `advances`
--
ALTER TABLE `advances`
  ADD PRIMARY KEY (`id`),
  ADD KEY `project_id` (`project_id`);

--
-- Indexes for table `approvals`
--
ALTER TABLE `approvals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `requested_by` (`requested_by`),
  ADD KEY `approved_by` (`approved_by`);

--
-- Indexes for table `approved_expenses`
--
ALTER TABLE `approved_expenses`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `attendance`
--
ALTER TABLE `attendance`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_project_id` (`project_id`);

--
-- Indexes for table `attendance_conflicts`
--
ALTER TABLE `attendance_conflicts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_attendance_id` (`attendance_id`),
  ADD KEY `idx_resolved` (`resolved`);

--
-- Indexes for table `attendance_corrections`
--
ALTER TABLE `attendance_corrections`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `attendance_id` (`attendance_id`),
  ADD KEY `approved_by` (`approved_by`);

--
-- Indexes for table `attendance_logs`
--
ALTER TABLE `attendance_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `attendance_rules`
--
ALTER TABLE `attendance_rules`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_module` (`user_id`,`module`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `badge_definitions`
--
ALTER TABLE `badge_definitions`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `chart_stats`
--
ALTER TABLE `chart_stats`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_prefix` (`company_prefix`);

--
-- Indexes for table `circulars`
--
ALTER TABLE `circulars`
  ADD PRIMARY KEY (`id`),
  ADD KEY `posted_by` (`posted_by`);

--
-- Indexes for table `contacts`
--
ALTER TABLE `contacts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `daily_performance`
--
ALTER TABLE `daily_performance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_date` (`user_id`,`date`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_date` (`date`);

--
-- Indexes for table `daily_planner`
--
ALTER TABLE `daily_planner`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_daily_planner_user_date` (`user_id`,`plan_date`),
  ADD KEY `idx_daily_planner_department` (`department_id`),
  ADD KEY `idx_planner_status` (`completion_status`);

--
-- Indexes for table `daily_planners`
--
ALTER TABLE `daily_planners`
  ADD PRIMARY KEY (`id`),
  ADD KEY `department_id` (`department_id`),
  ADD KEY `idx_user_date` (`user_id`,`plan_date`),
  ADD KEY `idx_status` (`completion_status`);

--
-- Indexes for table `daily_planner_audit`
--
ALTER TABLE `daily_planner_audit`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_action` (`user_id`,`action`),
  ADD KEY `idx_date` (`target_date`);

--
-- Indexes for table `daily_plans`
--
ALTER TABLE `daily_plans`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_date` (`user_id`,`plan_date`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_date` (`plan_date`),
  ADD KEY `idx_department` (`department_id`),
  ADD KEY `idx_followup` (`is_followup`,`followup_id`);

--
-- Indexes for table `daily_tasks`
--
ALTER TABLE `daily_tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_daily_tasks_user_date` (`user_id`,`scheduled_date`),
  ADD KEY `idx_daily_tasks_status` (`status`),
  ADD KEY `idx_daily_tasks_start_time` (`start_time`),
  ADD KEY `idx_original_task_id` (`original_task_id`),
  ADD KEY `idx_rollover_source` (`rollover_source_date`),
  ADD KEY `idx_user_task_date` (`user_id`,`original_task_id`,`scheduled_date`),
  ADD KEY `idx_user_date` (`user_id`,`scheduled_date`),
  ADD KEY `idx_status_timer` (`status`,`start_time`),
  ADD KEY `idx_sla_end_time` (`sla_end_time`),
  ADD KEY `idx_pause_start_time` (`pause_start_time`);

--
-- Indexes for table `daily_task_history`
--
ALTER TABLE `daily_task_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_daily_task_id` (`daily_task_id`);

--
-- Indexes for table `daily_task_updates`
--
ALTER TABLE `daily_task_updates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_plan_id` (`plan_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `daily_workflow_status`
--
ALTER TABLE `daily_workflow_status`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_date` (`user_id`,`workflow_date`),
  ADD KEY `idx_workflow_date` (`workflow_date`);

--
-- Indexes for table `dashboard_stats`
--
ALTER TABLE `dashboard_stats`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_prefix` (`company_prefix`),
  ADD KEY `idx_generated_at` (`generated_at`);

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `head_id` (`head_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `enabled_modules`
--
ALTER TABLE `enabled_modules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `module_name` (`module_name`),
  ADD KEY `idx_module_status` (`module_name`,`status`);

--
-- Indexes for table `evening_updates`
--
ALTER TABLE `evening_updates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `planner_id` (`planner_id`),
  ADD KEY `task_id` (`task_id`),
  ADD KEY `idx_user_date` (`user_id`,`date`);

--
-- Indexes for table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_expenses_status` (`status`),
  ADD KEY `project_id` (`project_id`);

--
-- Indexes for table `finance_customer`
--
ALTER TABLE `finance_customer`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `finance_customershippingaddress`
--
ALTER TABLE `finance_customershippingaddress`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_customer_id` (`customer_id`),
  ADD KEY `idx_is_default` (`is_default`);

--
-- Indexes for table `finance_invoices`
--
ALTER TABLE `finance_invoices`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `finance_payments`
--
ALTER TABLE `finance_payments`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `finance_purchase_orders`
--
ALTER TABLE `finance_purchase_orders`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `finance_quotations`
--
ALTER TABLE `finance_quotations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `followups`
--
ALTER TABLE `followups`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_task_id` (`task_id`);

--
-- Indexes for table `followup_history`
--
ALTER TABLE `followup_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_followup_id` (`followup_id`);

--
-- Indexes for table `funnel_stats`
--
ALTER TABLE `funnel_stats`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_prefix` (`company_prefix`);

--
-- Indexes for table `journal_entries`
--
ALTER TABLE `journal_entries`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `journal_entry_lines`
--
ALTER TABLE `journal_entry_lines`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_journal_entry` (`journal_entry_id`),
  ADD KEY `idx_account` (`account_id`);

--
-- Indexes for table `leaves`
--
ALTER TABLE `leaves`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_leaves_status_date` (`status`,`start_date`);

--
-- Indexes for table `login_attempts`
--
ALTER TABLE `login_attempts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ip` (`ip_address`),
  ADD KEY `idx_blocked` (`blocked_until`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_module_type` (`module_type`),
  ADD KEY `idx_status_change` (`status_change`),
  ADD KEY `idx_reminder_date` (`reminder_date`),
  ADD KEY `idx_uuid` (`uuid`),
  ADD KEY `idx_status_priority` (`status`,`priority`),
  ADD KEY `idx_expires` (`expires_at`);

--
-- Indexes for table `notification_audit_logs`
--
ALTER TABLE `notification_audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notification_uuid` (`notification_uuid`),
  ADD KEY `idx_attempt_at` (`attempt_at`);

--
-- Indexes for table `notification_channels`
--
ALTER TABLE `notification_channels`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `channel_name` (`channel_name`);

--
-- Indexes for table `notification_preferences`
--
ALTER TABLE `notification_preferences`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_channel` (`user_id`,`channel`);

--
-- Indexes for table `notification_queue`
--
ALTER TABLE `notification_queue`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `notification_templates`
--
ALTER TABLE `notification_templates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_template_locale` (`template_key`,`locale`);

--
-- Indexes for table `projects`
--
ALTER TABLE `projects`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_department` (`department_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `rate_limit_log`
--
ALTER TABLE `rate_limit_log`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `security_logs`
--
ALTER TABLE `security_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_event` (`event_type`),
  ADD KEY `idx_ip` (`ip_address`),
  ADD KEY `idx_created` (`created_at`);

--
-- Indexes for table `service_history`
--
ALTER TABLE `service_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `project_id` (`project_id`),
  ADD KEY `attendance_id` (`attendance_id`),
  ADD KEY `idx_user_project_date` (`user_id`,`project_id`,`service_date`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `shifts`
--
ALTER TABLE `shifts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sla_history`
--
ALTER TABLE `sla_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_daily_task_id` (`daily_task_id`),
  ADD KEY `idx_sla_history_task` (`daily_task_id`);

--
-- Indexes for table `sync_errors`
--
ALTER TABLE `sync_errors`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sync_log`
--
ALTER TABLE `sync_log`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sync_metadata`
--
ALTER TABLE `sync_metadata`
  ADD PRIMARY KEY (`company_prefix`);

--
-- Indexes for table `sync_runs`
--
ALTER TABLE `sync_runs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `assigned_by` (`assigned_by`),
  ADD KEY `idx_assigned_to` (`assigned_to`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_priority` (`priority`),
  ADD KEY `idx_tasks_due_date` (`due_date`),
  ADD KEY `idx_tasks_assigned_to` (`assigned_to`),
  ADD KEY `idx_tasks_status` (`status`),
  ADD KEY `idx_tasks_deadline` (`deadline`);

--
-- Indexes for table `task_categories`
--
ALTER TABLE `task_categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_department` (`department_id`);

--
-- Indexes for table `task_history`
--
ALTER TABLE `task_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_task_id` (`task_id`);

--
-- Indexes for table `task_progress_history`
--
ALTER TABLE `task_progress_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_task_id` (`task_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `task_updates`
--
ALTER TABLE `task_updates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_task_id` (`task_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `time_logs`
--
ALTER TABLE `time_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_daily_task_id` (`daily_task_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_time_logs_task` (`daily_task_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `employee_id` (`employee_id`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_role` (`role`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_employee_id` (`employee_id`),
  ADD KEY `idx_users_system_admin` (`is_system_admin`),
  ADD KEY `idx_users_email` (`email`),
  ADD KEY `idx_users_employee_id` (`employee_id`);

--
-- Indexes for table `user_badges`
--
ALTER TABLE `user_badges`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_badge` (`user_id`,`badge_id`),
  ADD KEY `badge_id` (`badge_id`),
  ADD KEY `idx_user_badges` (`user_id`);

--
-- Indexes for table `user_departments`
--
ALTER TABLE `user_departments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_dept` (`user_id`,`department_id`),
  ADD KEY `department_id` (`department_id`);

--
-- Indexes for table `user_devices`
--
ALTER TABLE `user_devices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_token` (`user_id`,`fcm_token`);

--
-- Indexes for table `user_ledgers`
--
ALTER TABLE `user_ledgers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `user_points`
--
ALTER TABLE `user_points`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_points` (`user_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `user_preferences`
--
ALTER TABLE `user_preferences`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_pref` (`user_id`,`preference_key`);

--
-- Indexes for table `user_projects`
--
ALTER TABLE `user_projects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_project` (`user_id`,`project_id`),
  ADD KEY `project_id` (`project_id`);

--
-- Indexes for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `accounts`
--
ALTER TABLE `accounts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `admin_positions`
--
ALTER TABLE `admin_positions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `advances`
--
ALTER TABLE `advances`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `approvals`
--
ALTER TABLE `approvals`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `approved_expenses`
--
ALTER TABLE `approved_expenses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `attendance`
--
ALTER TABLE `attendance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=120;

--
-- AUTO_INCREMENT for table `attendance_conflicts`
--
ALTER TABLE `attendance_conflicts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `attendance_corrections`
--
ALTER TABLE `attendance_corrections`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `attendance_logs`
--
ALTER TABLE `attendance_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=54;

--
-- AUTO_INCREMENT for table `attendance_rules`
--
ALTER TABLE `attendance_rules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `badge_definitions`
--
ALTER TABLE `badge_definitions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `chart_stats`
--
ALTER TABLE `chart_stats`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `circulars`
--
ALTER TABLE `circulars`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `contacts`
--
ALTER TABLE `contacts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `daily_performance`
--
ALTER TABLE `daily_performance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `daily_planner`
--
ALTER TABLE `daily_planner`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `daily_planners`
--
ALTER TABLE `daily_planners`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `daily_planner_audit`
--
ALTER TABLE `daily_planner_audit`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `daily_plans`
--
ALTER TABLE `daily_plans`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `daily_tasks`
--
ALTER TABLE `daily_tasks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `daily_task_history`
--
ALTER TABLE `daily_task_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=92;

--
-- AUTO_INCREMENT for table `daily_task_updates`
--
ALTER TABLE `daily_task_updates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `daily_workflow_status`
--
ALTER TABLE `daily_workflow_status`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dashboard_stats`
--
ALTER TABLE `dashboard_stats`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `enabled_modules`
--
ALTER TABLE `enabled_modules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=47;

--
-- AUTO_INCREMENT for table `evening_updates`
--
ALTER TABLE `evening_updates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `followups`
--
ALTER TABLE `followups`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `followup_history`
--
ALTER TABLE `followup_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `funnel_stats`
--
ALTER TABLE `funnel_stats`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `journal_entries`
--
ALTER TABLE `journal_entries`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `journal_entry_lines`
--
ALTER TABLE `journal_entry_lines`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `leaves`
--
ALTER TABLE `leaves`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `login_attempts`
--
ALTER TABLE `login_attempts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=65;

--
-- AUTO_INCREMENT for table `notification_audit_logs`
--
ALTER TABLE `notification_audit_logs`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notification_channels`
--
ALTER TABLE `notification_channels`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notification_preferences`
--
ALTER TABLE `notification_preferences`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notification_queue`
--
ALTER TABLE `notification_queue`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notification_templates`
--
ALTER TABLE `notification_templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `projects`
--
ALTER TABLE `projects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `rate_limit_log`
--
ALTER TABLE `rate_limit_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=433;

--
-- AUTO_INCREMENT for table `security_logs`
--
ALTER TABLE `security_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `service_history`
--
ALTER TABLE `service_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `shifts`
--
ALTER TABLE `shifts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sla_history`
--
ALTER TABLE `sla_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sync_errors`
--
ALTER TABLE `sync_errors`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sync_log`
--
ALTER TABLE `sync_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sync_runs`
--
ALTER TABLE `sync_runs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=69;

--
-- AUTO_INCREMENT for table `task_categories`
--
ALTER TABLE `task_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=189;

--
-- AUTO_INCREMENT for table `task_history`
--
ALTER TABLE `task_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=165;

--
-- AUTO_INCREMENT for table `task_progress_history`
--
ALTER TABLE `task_progress_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `task_updates`
--
ALTER TABLE `task_updates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `time_logs`
--
ALTER TABLE `time_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=73;

--
-- AUTO_INCREMENT for table `user_badges`
--
ALTER TABLE `user_badges`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_departments`
--
ALTER TABLE `user_departments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_devices`
--
ALTER TABLE `user_devices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_ledgers`
--
ALTER TABLE `user_ledgers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `user_points`
--
ALTER TABLE `user_points`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_preferences`
--
ALTER TABLE `user_preferences`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_projects`
--
ALTER TABLE `user_projects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD CONSTRAINT `activity_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `admin_positions`
--
ALTER TABLE `admin_positions`
  ADD CONSTRAINT `admin_positions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `admin_positions_ibfk_2` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `advances`
--
ALTER TABLE `advances`
  ADD CONSTRAINT `advances_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `approvals`
--
ALTER TABLE `approvals`
  ADD CONSTRAINT `approvals_ibfk_1` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `approvals_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `attendance`
--
ALTER TABLE `attendance`
  ADD CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `attendance_corrections`
--
ALTER TABLE `attendance_corrections`
  ADD CONSTRAINT `attendance_corrections_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `attendance_corrections_ibfk_2` FOREIGN KEY (`attendance_id`) REFERENCES `attendance` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `attendance_corrections_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `circulars`
--
ALTER TABLE `circulars`
  ADD CONSTRAINT `circulars_ibfk_1` FOREIGN KEY (`posted_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `daily_planner`
--
ALTER TABLE `daily_planner`
  ADD CONSTRAINT `daily_planner_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `daily_planner_ibfk_2` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `daily_planners`
--
ALTER TABLE `daily_planners`
  ADD CONSTRAINT `daily_planners_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `daily_planners_ibfk_2` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `daily_plans`
--
ALTER TABLE `daily_plans`
  ADD CONSTRAINT `daily_plans_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `daily_plans_ibfk_2` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `daily_task_updates`
--
ALTER TABLE `daily_task_updates`
  ADD CONSTRAINT `daily_task_updates_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `daily_plans` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `daily_workflow_status`
--
ALTER TABLE `daily_workflow_status`
  ADD CONSTRAINT `daily_workflow_status_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `departments`
--
ALTER TABLE `departments`
  ADD CONSTRAINT `departments_ibfk_1` FOREIGN KEY (`head_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `evening_updates`
--
ALTER TABLE `evening_updates`
  ADD CONSTRAINT `evening_updates_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `evening_updates_ibfk_2` FOREIGN KEY (`planner_id`) REFERENCES `daily_planner` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `evening_updates_ibfk_3` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `expenses`
--
ALTER TABLE `expenses`
  ADD CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `leaves`
--
ALTER TABLE `leaves`
  ADD CONSTRAINT `leaves_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notification_preferences`
--
ALTER TABLE `notification_preferences`
  ADD CONSTRAINT `notification_preferences_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `service_history`
--
ALTER TABLE `service_history`
  ADD CONSTRAINT `service_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `service_history_ibfk_2` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `service_history_ibfk_3` FOREIGN KEY (`attendance_id`) REFERENCES `attendance` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `tasks`
--
ALTER TABLE `tasks`
  ADD CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tasks_ibfk_2` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `task_updates`
--
ALTER TABLE `task_updates`
  ADD CONSTRAINT `task_updates_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `task_updates_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_badges`
--
ALTER TABLE `user_badges`
  ADD CONSTRAINT `user_badges_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_badges_ibfk_2` FOREIGN KEY (`badge_id`) REFERENCES `badge_definitions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_departments`
--
ALTER TABLE `user_departments`
  ADD CONSTRAINT `user_departments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_departments_ibfk_2` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_devices`
--
ALTER TABLE `user_devices`
  ADD CONSTRAINT `user_devices_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_points`
--
ALTER TABLE `user_points`
  ADD CONSTRAINT `user_points_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_projects`
--
ALTER TABLE `user_projects`
  ADD CONSTRAINT `user_projects_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_projects_ibfk_2` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
