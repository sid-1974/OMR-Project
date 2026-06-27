<?php
require_once 'db_connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed. Use POST.']);
    exit();
}

$scanned_sheet_id = isset($_POST['scanned_sheet_id']) ? intval($_POST['scanned_sheet_id']) : 0;
$omr_id = isset($_POST['omr_id']) ? trim($_POST['omr_id']) : (isset($_POST['sheet_number']) ? trim($_POST['sheet_number']) : '');
$student_regno = isset($_POST['student_regno']) ? trim($_POST['student_regno']) : '';
$status = isset($_POST['status']) ? trim($_POST['status']) : 'approved';
$pattern = isset($_POST['pattern']) ? trim($_POST['pattern']) : 'A';
if (empty($pattern)) {
    $pattern = 'A';
}
$qpcode = isset($_POST['qpcode']) ? trim($_POST['qpcode']) : null;
if ($qpcode === '') {
    $qpcode = null;
}
$responses_json = isset($_POST['responses']) ? $_POST['responses'] : '';

if ($scanned_sheet_id <= 0 || empty($responses_json)) {
    echo json_encode(['success' => false, 'message' => 'Missing scanned_sheet_id or responses.']);
    exit();
}

$responses = json_decode($responses_json, true);
if (!is_array($responses)) {
    echo json_encode(['success' => false, 'message' => 'Responses must be a valid JSON array.']);
    exit();
}

// Handle Aligned Image File Upload
$aligned_image_path = '';
if (isset($_FILES['aligned_image']) && $_FILES['aligned_image']['error'] === UPLOAD_ERR_OK) {
    $file_tmp = $_FILES['aligned_image']['tmp_name'];
    $file_name = $_FILES['aligned_image']['name'];
    $file_ext = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));
    
    $upload_dir = 'uploads/aligned/';
    if (!file_exists($upload_dir)) {
         mkdir($upload_dir, 0777, true);
    }
    
    $unique_filename = uniqid('aligned_', true) . '.' . $file_ext;
    $aligned_image_path = $upload_dir . $unique_filename;
    
    if (!move_uploaded_file($file_tmp, $aligned_image_path)) {
         echo json_encode(['success' => false, 'message' => 'Failed to save aligned image.']);
         exit();
    }
}

try {
    // Check if scanned sheet exists
    $stmt = $pdo->prepare("SELECT template_id FROM `scanned_sheets` WHERE id = :id");
    $stmt->execute([':id' => $scanned_sheet_id]);
    $sheet_info = $stmt->fetch();
    
    if (!$sheet_info) {
        echo json_encode(['success' => false, 'message' => 'Scanned sheet record not found.']);
        exit();
    }
    
    $template_id = $sheet_info['template_id'];

    $pdo->beginTransaction();

    // Update scanned_sheets details
    if (!empty($aligned_image_path)) {
        $upd = $pdo->prepare("
            UPDATE `scanned_sheets` 
            SET omr_id = :omr_id, qpcode = :qpcode, student_regno = :student_regno, aligned_image_path = :aligned_image_path, status = :status, pattern = :pattern 
            WHERE id = :id
        ");
        $upd->execute([
            ':omr_id' => $omr_id,
            ':qpcode' => $qpcode,
            ':student_regno' => $student_regno,
            ':aligned_image_path' => $aligned_image_path,
            ':status' => $status,
            ':pattern' => $pattern,
            ':id' => $scanned_sheet_id
        ]);
    } else {
        $upd = $pdo->prepare("
            UPDATE `scanned_sheets` 
            SET omr_id = :omr_id, qpcode = :qpcode, student_regno = :student_regno, status = :status, pattern = :pattern 
            WHERE id = :id
        ");
        $upd->execute([
            ':omr_id' => $omr_id,
            ':qpcode' => $qpcode,
            ':student_regno' => $student_regno,
            ':status' => $status,
            ':pattern' => $pattern,
            ':id' => $scanned_sheet_id
        ]);
    }

    // Clear previous responses
    $del = $pdo->prepare("DELETE FROM `student_responses` WHERE omr_id = :omr_id");
    $del->execute([':omr_id' => $omr_id]);

    // Insert student responses
    $ins = $pdo->prepare("
        INSERT INTO `student_responses` (omr_id, question_number, selected_option) 
        VALUES (:omr_id, :question_number, :selected_option)
    ");

    foreach ($responses as $resp) {
        $q_num = intval($resp['question_number']);
        $sel_opt = trim(strtoupper($resp['selected_option']));
        $ins->execute([
            ':omr_id' => $omr_id,
            ':question_number' => $q_num,
            ':selected_option' => $sel_opt
        ]);
    }

    // Evaluate score in real-time if answer key exists
    if ($qpcode === null) {
        $key_stmt = $pdo->prepare("SELECT question_number, correct_option FROM `answer_keys` WHERE template_id = :template_id AND pattern = :pattern AND (qpcode IS NULL OR qpcode = '')");
        $key_stmt->execute([':template_id' => $template_id, ':pattern' => $pattern]);
    } else {
        $key_stmt = $pdo->prepare("SELECT question_number, correct_option FROM `answer_keys` WHERE template_id = :template_id AND pattern = :pattern AND qpcode = :qpcode");
        $key_stmt->execute([':template_id' => $template_id, ':pattern' => $pattern, ':qpcode' => $qpcode]);
    }
    $keys = $key_stmt->fetchAll();

    if (count($keys) > 0) {
        // Map correct options by question number
        $correct_map = [];
        foreach ($keys as $k) {
            $correct_map[$k['question_number']] = $k['correct_option'];
        }

        $correct_count = 0;
        $wrong_count = 0;
        $blank_count = 0;
        $total_questions = count($keys);

        foreach ($responses as $resp) {
            $q_num = intval($resp['question_number']);
            $sel_opt = trim(strtoupper($resp['selected_option']));

            if (isset($correct_map[$q_num])) {
                $correct_opt = $correct_map[$q_num];
                if ($sel_opt === 'BLANK' || empty($sel_opt)) {
                    $blank_count++;
                } else if ($sel_opt === $correct_opt) {
                    $correct_count++;
                } else {
                    $wrong_count++;
                }
            }
        }

        // Calculate score (assume 1 mark per correct answer, 0 for wrong/blank. Can be customized.)
        $score = $correct_count; // standard scoring

        // Save or update evaluation results
        $eval_del = $pdo->prepare("DELETE FROM `evaluation_results` WHERE omr_id = :omr_id");
        $eval_del->execute([':omr_id' => $omr_id]);

        $eval_ins = $pdo->prepare("
            INSERT INTO `evaluation_results` (omr_id, qpcode, student_regno, total_questions, correct_answers, wrong_answers, blank_answers, score) 
            VALUES (:omr_id, :qpcode, :student_regno, :total_questions, :correct_answers, :wrong_answers, :blank_answers, :score)
        ");
        $eval_ins->execute([
            ':omr_id' => $omr_id,
            ':qpcode' => $qpcode,
            ':student_regno' => $student_regno,
            ':total_questions' => $total_questions,
            ':correct_answers' => $correct_count,
            ':wrong_answers' => $wrong_count,
            ':blank_answers' => $blank_count,
            ':score' => $score
        ]);
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Responses saved and evaluated successfully.',
        'scanned_sheet_id' => $scanned_sheet_id
    ]);

} catch (\Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // Clean up uploaded aligned image if transaction failed
    if (!empty($aligned_image_path) && file_exists($aligned_image_path)) {
        unlink($aligned_image_path);
    }
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>
