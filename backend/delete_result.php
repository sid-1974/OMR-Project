<?php
require_once 'db_connect.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['student_regno']) || !isset($data['sheet_number'])) {
    echo json_encode(['success' => false, 'message' => 'Missing student_regno or sheet_number (omr_id)']);
    exit();
}

$regno = $data['student_regno'];
$omrid = $data['sheet_number'];

try {
    $pdo->beginTransaction();

    // 1. Delete from evaluation_results
    $stmt1 = $pdo->prepare("DELETE FROM `evaluation_results` WHERE student_regno = ? AND omr_id = ?");
    $stmt1->execute([$regno, $omrid]);

    // 2. Delete from student_responses
    $stmt2 = $pdo->prepare("DELETE FROM `student_responses` WHERE omr_id = ?");
    $stmt2->execute([$omrid]);

    // 3. Delete from scanned_sheets
    $stmt3 = $pdo->prepare("DELETE FROM `scanned_sheets` WHERE student_regno = ? AND omr_id = ?");
    $stmt3->execute([$regno, $omrid]);

    $pdo->commit();

    echo json_encode(['success' => true, 'message' => 'Record deleted successfully from all related tables.']);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(['success' => false, 'message' => 'Failed to delete record: ' . $e->getMessage()]);
}
?>
