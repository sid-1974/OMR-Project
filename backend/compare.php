<?php
require_once 'db_connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed. Use GET.']);
    exit();
}

$template_id = isset($_GET['template_id']) ? intval($_GET['template_id']) : 0;

if ($template_id <= 0) {
    echo json_encode(['success' => false, 'message' => 'Valid template_id is required.']);
    exit();
}

try {
    // 1. Fetch template questions and correct answers
    $key_stmt = $pdo->prepare("
        SELECT question_number, correct_option, pattern, qpcode 
        FROM `answer_keys` 
        WHERE template_id = :template_id 
        ORDER BY question_number ASC
    ");
    $key_stmt->execute([':template_id' => $template_id]);
    $keys = $key_stmt->fetchAll();
    
    if (count($keys) === 0) {
        echo json_encode([
            'success' => false,
            'message' => 'No answer key has been set for this template yet. Please configure the answer key first.'
        ]);
        exit();
    }

    // Map answer key by pattern and qpcode
    $answer_key_map = [];
    foreach ($keys as $k) {
        $p = $k['pattern'];
        $qpc = empty($k['qpcode']) ? 'default' : $k['qpcode'];
        $q = $k['question_number'];
        if (!isset($answer_key_map[$p])) {
            $answer_key_map[$p] = [];
        }
        if (!isset($answer_key_map[$p][$qpc])) {
            $answer_key_map[$p][$qpc] = [];
        }
        $answer_key_map[$p][$qpc][$q] = $k['correct_option'];
    }

    // 2. Fetch evaluation results
    $eval_stmt = $pdo->prepare("
        SELECT er.*, ss.id as scanned_sheet_id, ss.omr_id, ss.omr_id AS sheet_number, ss.aligned_image_path, ss.raw_image_path, ss.pattern
        FROM `evaluation_results` er
        JOIN `scanned_sheets` ss ON er.omr_id = ss.omr_id
        WHERE ss.template_id = :template_id
        ORDER BY er.score DESC, er.student_regno ASC
    ");
    $eval_stmt->execute([':template_id' => $template_id]);
    $students = $eval_stmt->fetchAll();

    // 3. For each student, fetch their detailed question responses
    $detailed_results = [];
    foreach ($students as $student) {
        $resp_stmt = $pdo->prepare("
            SELECT question_number, selected_option 
            FROM `student_responses` 
            WHERE omr_id = :omr_id
            ORDER BY question_number ASC
        ");
        $resp_stmt->execute([':omr_id' => $student['omr_id']]);
        $responses = $resp_stmt->fetchAll();

        $response_map = [];
        foreach ($responses as $r) {
            $response_map[$r['question_number']] = $r['selected_option'];
        }

        // Build question-wise correctness array based on student's sheet pattern
        $student_pattern = isset($student['pattern']) ? $student['pattern'] : 'A';
        $student_qpcode = empty($student['qpcode']) ? 'default' : $student['qpcode'];
        
        $student_answer_key = [];
        if (isset($answer_key_map[$student_pattern][$student_qpcode])) {
            $student_answer_key = $answer_key_map[$student_pattern][$student_qpcode];
        } else if (isset($answer_key_map[$student_pattern]['default'])) {
            $student_answer_key = $answer_key_map[$student_pattern]['default']; // fallback
        }

        $comparison_matrix = [];
        foreach ($student_answer_key as $q_num => $correct_opt) {
            $sel_opt = isset($response_map[$q_num]) ? $response_map[$q_num] : 'BLANK';
            $is_correct = ($sel_opt === $correct_opt);
            
            $comparison_matrix[] = [
                'question_number' => $q_num,
                'correct_option' => $correct_opt,
                'selected_option' => $sel_opt,
                'is_correct' => $is_correct
            ];
        }

        $detailed_results[] = [
            'scanned_sheet_id' => $student['scanned_sheet_id'],
            'student_regno' => $student['student_regno'],
            'omr_id' => $student['omr_id'],
            'sheet_number' => $student['sheet_number'],
            'pattern' => $student_pattern,
            'raw_image_path' => $student['raw_image_path'],
            'aligned_image_path' => $student['aligned_image_path'],
            'total_questions' => $student['total_questions'],
            'correct_answers' => $student['correct_answers'],
            'wrong_answers' => $student['wrong_answers'],
            'blank_answers' => $student['blank_answers'],
            'score' => $student['score'],
            'evaluated_at' => $student['evaluated_at'],
            'comparison_matrix' => $comparison_matrix
        ];
    }

    echo json_encode([
        'success' => true,
        'answer_key' => $keys,
        'results' => $detailed_results
    ]);

} catch (\PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
