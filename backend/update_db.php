<?php
require_once 'db_connect.php';
try {
    $pdo->exec("ALTER TABLE omr_templates ADD COLUMN qpcode VARCHAR(255) DEFAULT NULL AFTER sheetno_config");
    echo "Column added successfully";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
