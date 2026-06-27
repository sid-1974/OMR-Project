<?php
require_once 'db_connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed. Use GET.']);
    exit();
}

try {
    // If a specific design ID is requested, fetch its details
    if (isset($_GET['id'])) {
        $id = intval($_GET['id']);
        $stmt = $pdo->prepare("SELECT * FROM `omr_templates` WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $template = $stmt->fetch();
        
        if ($template) {
            // Check if there is an associated answer key
            $pattern = isset($_GET['pattern']) ? trim($_GET['pattern']) : 'A';
            if (empty($pattern)) {
                $pattern = 'A';
            }
            $qpcode = isset($_GET['qpcode']) ? trim($_GET['qpcode']) : null;
            
            if ($qpcode !== null && $qpcode !== '') {
                $key_stmt = $pdo->prepare("SELECT question_number, correct_option FROM `answer_keys` WHERE template_id = :template_id AND pattern = :pattern AND qpcode = :qpcode ORDER BY question_number ASC");
                $key_stmt->execute([':template_id' => $id, ':pattern' => $pattern, ':qpcode' => $qpcode]);
            } else {
                $key_stmt = $pdo->prepare("SELECT question_number, correct_option FROM `answer_keys` WHERE template_id = :template_id AND pattern = :pattern AND (qpcode IS NULL OR qpcode = '') ORDER BY question_number ASC");
                $key_stmt->execute([':template_id' => $id, ':pattern' => $pattern]);
            }
            $keys = $key_stmt->fetchAll();
            
            $template['answer_key'] = $keys;
            
            echo json_encode([
                'success' => true,
                'template' => $template
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Template design not found.']);
        }
    } 
    // If a specific parent template ID is requested, fetch all its qpcodes (designs)
    else if (isset($_GET['parent_id'])) {
        $parent_id = intval($_GET['parent_id']);
        $stmt = $pdo->prepare("SELECT id, template_id, name, qpcode, blank_image_path, width, height, created_at FROM `omr_templates` WHERE template_id = :parent_id ORDER BY created_at DESC");
        $stmt->execute([':parent_id' => $parent_id]);
        $qpcodes = $stmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'qpcodes' => $qpcodes
        ]);
    }
    // Fetch all parents and all templates
    else {
        // Fetch all parent template groups
        $stmtParents = $pdo->query("SELECT id, name, created_at FROM `templates` ORDER BY created_at DESC");
        $parents = $stmtParents->fetchAll();

        // Fetch all templates (designs)
        $stmt = $pdo->query("SELECT id, template_id, name, qpcode, blank_image_path, width, height, created_at FROM `omr_templates` ORDER BY created_at DESC");
        $templates = $stmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'parents' => $parents,
            'templates' => $templates
        ]);
    }
} catch (\PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
