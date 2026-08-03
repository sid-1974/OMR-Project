<?php
require_once 'db_connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed. Use GET.']);
    exit();
}

$template_id = isset($_GET['template_id']) ? intval($_GET['template_id']) : 0;
$qpcode = isset($_GET['qpcode']) ? trim($_GET['qpcode']) : '';
$page = isset($_GET['page']) ? intval($_GET['page']) : 1;
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;

if ($page < 1) $page = 1;
if ($limit < 1) $limit = 20;
$offset = ($page - 1) * $limit;

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

    // 2. Fetch all scores for global stats and pagination
    $stats_sql = "
        SELECT er.score, er.total_questions 
        FROM `evaluation_results` er 
        JOIN `scanned_sheets` ss ON er.omr_id = ss.omr_id 
        WHERE ss.template_id = :template_id
    ";
    $params = [':template_id' => $template_id];
    
    if ($qpcode !== '') {
        $stats_sql .= " AND ss.qpcode = :qpcode";
        $params[':qpcode'] = $qpcode;
    }
    
    $stats_stmt = $pdo->prepare($stats_sql);
    $stats_stmt->execute($params);
    $all_stats = $stats_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $total_records = count($all_stats);
    $total_pages = ceil($total_records / $limit);
    
    $global_max = 0;
    $global_min = 0;
    $global_avg = 0;
    $global_pass = 0;
    
    if ($total_records > 0) {
        $sum = 0;
        $scores = [];
        foreach($all_stats as $st) {
            $s = (float)$st['score'];
            $scores[] = $s;
            $sum += $s;
            
            $pass_thresh = (float)$st['total_questions'] * 0.4;
            if ($s >= $pass_thresh) {
                $global_pass++;
            }
        }
        $global_max = max($scores);
        $global_min = min($scores);
        $global_avg = round($sum / $total_records, 2);
    }
    
    $global_pass_percentage = $total_records > 0 ? round(($global_pass / $total_records) * 100, 1) : 0;
    
    $global_stats_arr = [
        'count' => $total_records,
        'maxScore' => $global_max,
        'minScore' => $global_min,
        'avgScore' => number_format($global_avg, 2),
        'passPercentage' => number_format($global_pass_percentage, 1)
    ];

    // 3. Fetch evaluation results paginated
    $eval_sql = "
        SELECT er.*, ss.id as scanned_sheet_id, ss.omr_id, ss.omr_id AS sheet_number, ss.aligned_image_path, ss.raw_image_path, ss.pattern, ss.qpcode
        FROM `evaluation_results` er
        JOIN `scanned_sheets` ss ON er.omr_id = ss.omr_id
        WHERE ss.template_id = :template_id
    ";
    
    if ($qpcode !== '') {
        $eval_sql .= " AND ss.qpcode = :qpcode";
    }
    
    // Use string concatenation for LIMIT and OFFSET as parameter binding can be tricky with them in some PDO configs
    $eval_sql .= " ORDER BY er.score DESC, er.student_regno ASC LIMIT " . (int)$limit . " OFFSET " . (int)$offset;

    $eval_stmt = $pdo->prepare($eval_sql);
    $eval_stmt->execute($params);
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
        $mult_count = 0;
        foreach ($student_answer_key as $q_num => $correct_opt) {
            $sel_opt = isset($response_map[$q_num]) ? $response_map[$q_num] : 'BLANK';
            $is_correct = ($sel_opt === $correct_opt);
            
            if ($sel_opt === 'MULT') {
                $mult_count++;
            }
            
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
            'qpcode' => $student['qpcode'],
            'raw_image_path' => $student['raw_image_path'],
            'aligned_image_path' => $student['aligned_image_path'],
            'total_questions' => $student['total_questions'],
            'correct_answers' => $student['correct_answers'],
            'wrong_answers' => $student['wrong_answers'],
            'blank_answers' => $student['blank_answers'],
            'multiple_answers' => $mult_count,
            'score' => $student['score'],
            'evaluated_at' => $student['evaluated_at'],
            'comparison_matrix' => $comparison_matrix
        ];
    }

    echo json_encode([
        'success' => true,
        'answer_key' => $keys,
        'results' => $detailed_results,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int)$total_records,
            'total_pages' => (int)$total_pages
        ],
        'global_stats' => $global_stats_arr
    ]);

} catch (\PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
