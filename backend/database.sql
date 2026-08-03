CREATE DATABASE IF NOT EXISTS `omr_scanner`;
USE `omr_scanner`;

-- Template Parents (Groups)
CREATE TABLE IF NOT EXISTS `templates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- OMR Templates (Designs / QPCodes)
CREATE TABLE IF NOT EXISTS `omr_templates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `template_id` INT DEFAULT NULL,
  `name` VARCHAR(100) NOT NULL,
  `blank_image_path` VARCHAR(255) NOT NULL,
  `width` INT NOT NULL,
  `height` INT NOT NULL,
  `anchors_json` JSON NOT NULL,
  `regno_config` JSON DEFAULT NULL,
  `sheetno_config` JSON DEFAULT NULL,
  `qpcode` VARCHAR(255) DEFAULT NULL,
  `qpcode_config` JSON DEFAULT NULL,
  `questions_config` JSON NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Answer Keys (Correct Responses for Template)
CREATE TABLE IF NOT EXISTS `answer_keys` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `template_id` INT NOT NULL,
  `pattern` VARCHAR(10) NOT NULL DEFAULT 'A',
  `qpcode` VARCHAR(50) DEFAULT NULL,
  `question_number` INT NOT NULL,
  `correct_option` CHAR(5) NOT NULL, -- Supporting multi-answers if needed, e.g. 'A', 'B', etc.
  FOREIGN KEY (`template_id`) REFERENCES `omr_templates`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Scanned Student Sheets
CREATE TABLE IF NOT EXISTS `scanned_sheets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `template_id` INT NOT NULL,
  `pattern` VARCHAR(10) NOT NULL DEFAULT 'A',
  `qpcode` VARCHAR(50) DEFAULT NULL,
  `omr_id` VARCHAR(50) DEFAULT NULL,
  `student_regno` VARCHAR(50) DEFAULT NULL,
  `raw_image_path` VARCHAR(255) NOT NULL,
  `aligned_image_path` VARCHAR(255) NOT NULL,
  `status` ENUM('pending_approval', 'approved') DEFAULT 'pending_approval',
  `scanned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`template_id`) REFERENCES `omr_templates`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Scanned Student Responses
CREATE TABLE IF NOT EXISTS `student_responses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `scanned_sheet_id` INT NOT NULL,
  `omr_id` VARCHAR(50) NOT NULL,
  `question_number` INT NOT NULL,
  `selected_option` VARCHAR(5) DEFAULT NULL -- 'A', 'B', 'C', 'D', 'MULT', 'BLANK'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Comparison Results
CREATE TABLE IF NOT EXISTS `evaluation_results` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `scanned_sheet_id` INT NOT NULL,
  `omr_id` VARCHAR(50) NOT NULL,
  `qpcode` VARCHAR(50) DEFAULT NULL,
  `student_regno` VARCHAR(50) NOT NULL,
  `total_questions` INT NOT NULL,
  `correct_answers` INT NOT NULL,
  `wrong_answers` INT NOT NULL,
  `blank_answers` INT NOT NULL,
  `score` DECIMAL(5,2) NOT NULL,
  `evaluated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
