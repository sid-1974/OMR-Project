<?php
// Enable CORS for React frontend local development
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE, PUT");

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$host = 'localhost';
$user = 'root';
$pass = 'admin123';
$dbname = 'omr_scanner'; // Standard database for OMR scanning
$charset = 'utf8mb4';

try {
    // Connect without specifying database first (to handle auto-creation)
    $dsn = "mysql:host=$host;charset=$charset";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    $pdo = new PDO($dsn, $user, $pass, $options);

    // Auto-create database if missing
    $pdo->query("CREATE DATABASE IF NOT EXISTS `$dbname`");
    $pdo->query("USE `$dbname`");

    // Auto-initialize OMR scanning tables
    createOMRTablesIfNotExist($pdo);

    // Auto-reset auto-increment sequence counters to prevent gaps on deletions
    resetAllAutoIncrements($pdo);
} catch (\PDOException $e) {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $e->getMessage()
    ]);
    exit();
}

/**
 * Creates the required OMR tables dynamically in the current database if they are missing.
 */
function createOMRTablesIfNotExist($pdo)
{
    // Migration: ensure AUTO_INCREMENT is present on omr_templates.id
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `omr_templates` LIKE 'id'");
        $col = $stmt->fetch();
        if ($col && strpos($col['Extra'], 'auto_increment') === false) {
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
            $pdo->exec("ALTER TABLE `omr_templates` MODIFY COLUMN `id` INT AUTO_INCREMENT");
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
        }
    } catch (\PDOException $e) {
        // Ignore if table does not exist
    }

    // Migration: rename sheet_number to omr_id in scanned_sheets if present
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `scanned_sheets` LIKE 'sheet_number'");
        if ($stmt->fetch()) {
            $pdo->exec("ALTER TABLE `scanned_sheets` CHANGE `sheet_number` `omr_id` VARCHAR(50) DEFAULT NULL");
        }
    } catch (\PDOException $e) {
        // Ignore if table does not exist
    }

    // Migration: add pattern column to answer_keys if missing
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `answer_keys` LIKE 'pattern'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE `answer_keys` ADD COLUMN `pattern` VARCHAR(10) NOT NULL DEFAULT 'A'");
        }
    } catch (\PDOException $e) {
        // Ignore if table does not exist
    }

    // Migration: add pattern column to scanned_sheets if missing
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `scanned_sheets` LIKE 'pattern'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE `scanned_sheets` ADD COLUMN `pattern` VARCHAR(10) NOT NULL DEFAULT 'A'");
        }
    } catch (\PDOException $e) {
        // Ignore if table does not exist
    }

    // Migration: add qpcode_config column to omr_templates if missing
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `omr_templates` LIKE 'qpcode_config'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE `omr_templates` ADD COLUMN `qpcode_config` JSON DEFAULT NULL");
        }
    } catch (\PDOException $e) {
        // Ignore if table does not exist
    }

    // Migration: add qpcode column to answer_keys if missing
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `answer_keys` LIKE 'qpcode'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE `answer_keys` ADD COLUMN `qpcode` VARCHAR(50) DEFAULT NULL");
        }
    } catch (\PDOException $e) {
        // Ignore if table does not exist
    }

    // Migration: add qpcode column to scanned_sheets if missing
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `scanned_sheets` LIKE 'qpcode'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE `scanned_sheets` ADD COLUMN `qpcode` VARCHAR(50) DEFAULT NULL");
        }
    } catch (\PDOException $e) {
        // Ignore if table does not exist
    }

    // Migration: add qpcode column to evaluation_results if missing
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `evaluation_results` LIKE 'qpcode'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE `evaluation_results` ADD COLUMN `qpcode` VARCHAR(50) DEFAULT NULL");
        }
    } catch (\PDOException $e) {
        // Ignore if table does not exist
    }

    // Migration: rename scanned_sheet_id to omr_id in student_responses
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `student_responses` LIKE 'scanned_sheet_id'");
        if ($stmt->fetch()) {
            // Attempt to drop standard foreign key names before changing column
            try { $pdo->exec("ALTER TABLE `student_responses` DROP FOREIGN KEY `student_responses_ibfk_1`"); } catch (\Exception $e) {}
            $pdo->exec("ALTER TABLE `student_responses` CHANGE `scanned_sheet_id` `omr_id` VARCHAR(50) NOT NULL");
        }
    } catch (\PDOException $e) {
        // Ignore if table does not exist
    }

    // Migration: rename scanned_sheet_id to omr_id in evaluation_results
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `evaluation_results` LIKE 'scanned_sheet_id'");
        if ($stmt->fetch()) {
            // Attempt to drop standard foreign key names before changing column
            try { $pdo->exec("ALTER TABLE `evaluation_results` DROP FOREIGN KEY `evaluation_results_ibfk_1`"); } catch (\Exception $e) {}
            // We NO LONGER rename it, because we actually need scanned_sheet_id.
            // But if it was already renamed to omr_id, we need to add it back!
        }
    } catch (\PDOException $e) {}

    // Migration: Add scanned_sheet_id BACK to student_responses and evaluation_results
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `student_responses` LIKE 'scanned_sheet_id'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE `student_responses` ADD COLUMN `scanned_sheet_id` INT NOT NULL DEFAULT 0");
            $pdo->exec("UPDATE `student_responses` sr JOIN `scanned_sheets` ss ON sr.omr_id = ss.omr_id SET sr.scanned_sheet_id = ss.id WHERE sr.scanned_sheet_id = 0");
        }
        
        $stmt = $pdo->query("SHOW COLUMNS FROM `evaluation_results` LIKE 'scanned_sheet_id'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE `evaluation_results` ADD COLUMN `scanned_sheet_id` INT NOT NULL DEFAULT 0");
            $pdo->exec("UPDATE `evaluation_results` er JOIN `scanned_sheets` ss ON er.omr_id = ss.omr_id SET er.scanned_sheet_id = ss.id WHERE er.scanned_sheet_id = 0");
        }
    } catch (\PDOException $e) {}

    // OMR Templates
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `omr_templates` (
          `id` INT AUTO_INCREMENT PRIMARY KEY,
          `name` VARCHAR(100) NOT NULL,
          `blank_image_path` VARCHAR(255) NOT NULL,
          `width` INT NOT NULL,
          `height` INT NOT NULL,
          `anchors_json` JSON NOT NULL,
          `regno_config` JSON DEFAULT NULL,
          `sheetno_config` JSON DEFAULT NULL,
          `qpcode_config` JSON DEFAULT NULL,
          `questions_config` JSON NOT NULL,
          `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    // Answer Keys
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `answer_keys` (
          `id` INT AUTO_INCREMENT PRIMARY KEY,
          `template_id` INT NOT NULL,
          `pattern` VARCHAR(10) NOT NULL DEFAULT 'A',
          `qpcode` VARCHAR(50) DEFAULT NULL,
          `question_number` INT NOT NULL,
          `correct_option` CHAR(5) NOT NULL,
          FOREIGN KEY (`template_id`) REFERENCES `omr_templates`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    // Scanned Student Sheets
    $pdo->exec("
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
    ");

    // Student Responses
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `student_responses` (
          `id` INT AUTO_INCREMENT PRIMARY KEY,
          `omr_id` VARCHAR(50) NOT NULL,
          `question_number` INT NOT NULL,
          `selected_option` VARCHAR(5) DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    // Evaluation Results
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `evaluation_results` (
          `id` INT AUTO_INCREMENT PRIMARY KEY,
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
    ");
}

/**
 * Automatically resets the AUTO_INCREMENT value of all tables to MAX(id) + 1 (or 1 if empty)
 * to ensure that deleted records do not leave sequence gaps for subsequent inserts.
 */
function resetAllAutoIncrements($pdo) {
    $tables = [
        'omr_templates',
        'answer_keys',
        'scanned_sheets',
        'student_responses',
        'evaluation_results'
    ];
    foreach ($tables as $table) {
        try {
            $pdo->exec("ALTER TABLE `$table` AUTO_INCREMENT = 1");
        } catch (\PDOException $e) {
            // Ignore error if table doesn't exist yet or is inaccessible
        }
    }
}
?>
