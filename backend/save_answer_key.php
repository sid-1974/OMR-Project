<?php
require_once 'db_connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed. Use POST.']);
    exit();
}

// Read raw JSON input
$input = json_decode(file_get_contents('php://input'), true);

$template_id = isset($input['template_id']) ? intval($input['template_id']) : 0;
$answers = isset($input['answers']) ? $input['answers'] : null; // Expect array of ['question_number' => X, 'correct_option' => Y]

if ($template_id <= 0 || !is_array($answers)) {
    echo json_encode(['success' => false, 'message' => 'Invalid template_id or answers array.']);
    exit();
}

try {
    // Verify template exists
    $chk = $pdo->prepare("SELECT id FROM `omr_templates` WHERE id = :id");
    $chk->execute([':id' => $template_id]);
    if (!$chk->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Template does not exist.']);
        exit();
    }

    $pdo->beginTransaction();

    // Clear previous keys for this template
    $del = $pdo->prepare("DELETE FROM `answer_keys` WHERE template_id = :template_id");
    $del->execute([':template_id' => $template_id]);

    // Insert new answer keys
    $ins = $pdo->prepare("
        INSERT INTO `answer_keys` (template_id, question_number, correct_option) 
        VALUES (:template_id, :question_number, :correct_option)
    ");

    foreach ($answers as $ans) {
        $q_num = intval($ans['question_number']);
        $c_opt = trim(strtoupper($ans['correct_option']));
        
        if ($q_num > 0 && !empty($c_opt)) {
            $ins->execute([
                ':template_id' => $template_id,
                ':question_number' => $q_num,
                ':correct_option' => $c_opt
            ]);
        }
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Answer keys saved successfully.'
    ]);
} catch (\Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>
