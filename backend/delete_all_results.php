<?php
require_once 'db_connect.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['template_id'])) {
    echo json_encode(['success' => false, 'message' => 'Missing template_id']);
    exit();
}

$template_id = $data['template_id'];
$qpcode = isset($data['qpcode']) ? $data['qpcode'] : '';

try {
    $pdo->beginTransaction();

    if ($qpcode !== '') {
        // 1. Delete from student_responses
        $stmt2 = $pdo->prepare("DELETE FROM `student_responses` WHERE omr_id IN (SELECT omr_id FROM `scanned_sheets` WHERE template_id = ? AND qpcode = ?)");
        $stmt2->execute([$template_id, $qpcode]);

        // 2. Delete from evaluation_results
        $stmt1 = $pdo->prepare("DELETE FROM `evaluation_results` WHERE omr_id IN (SELECT omr_id FROM `scanned_sheets` WHERE template_id = ? AND qpcode = ?)");
        $stmt1->execute([$template_id, $qpcode]);

        // 3. Delete from scanned_sheets
        $stmt3 = $pdo->prepare("DELETE FROM `scanned_sheets` WHERE template_id = ? AND qpcode = ?");
        $stmt3->execute([$template_id, $qpcode]);
    } else {
        // 1. Delete from student_responses
        $stmt2 = $pdo->prepare("DELETE FROM `student_responses` WHERE omr_id IN (SELECT omr_id FROM `scanned_sheets` WHERE template_id = ?)");
        $stmt2->execute([$template_id]);

        // 2. Delete from evaluation_results
        $stmt1 = $pdo->prepare("DELETE FROM `evaluation_results` WHERE omr_id IN (SELECT omr_id FROM `scanned_sheets` WHERE template_id = ?)");
        $stmt1->execute([$template_id]);

        // 3. Delete from scanned_sheets
        $stmt3 = $pdo->prepare("DELETE FROM `scanned_sheets` WHERE template_id = ?");
        $stmt3->execute([$template_id]);
    }

    $pdo->commit();

    echo json_encode(['success' => true, 'message' => 'All results deleted successfully.']);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(['success' => false, 'message' => 'Failed to delete results: ' . $e->getMessage()]);
}
?>
