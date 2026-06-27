<?php
require_once 'db_connect.php';

header('Content-Type: application/json');

$template_id = $_GET['template_id'] ?? null;

if (!$template_id) {
    echo json_encode(['success' => false, 'message' => 'Template ID is required']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT DISTINCT qpcode FROM answer_keys WHERE template_id = ? AND qpcode IS NOT NULL AND qpcode != '' ORDER BY qpcode ASC");
    $stmt->execute([$template_id]);
    $qpcodes = $stmt->fetchAll(PDO::FETCH_COLUMN);

    echo json_encode([
        'success' => true,
        'qpcodes' => $qpcodes
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
