<?php
require_once 'db_connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed. Use GET.']);
    exit();
}

try {
    // If a specific template ID is requested, fetch details
    if (isset($_GET['id'])) {
        $id = intval($_GET['id']);
        $stmt = $pdo->prepare("SELECT * FROM `omr_templates` WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $template = $stmt->fetch();
        
        if ($template) {
            // Check if there is an associated answer key
            $key_stmt = $pdo->prepare("SELECT question_number, correct_option FROM `answer_keys` WHERE template_id = :template_id ORDER BY question_number ASC");
            $key_stmt->execute([':template_id' => $id]);
            $keys = $key_stmt->fetchAll();
            
            $template['answer_key'] = $keys;
            
            echo json_encode([
                'success' => true,
                'template' => $template
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Template not found.']);
        }
    } else {
        // Fetch all templates
        $stmt = $pdo->query("SELECT id, name, blank_image_path, width, height, created_at FROM `omr_templates` ORDER BY created_at DESC");
        $templates = $stmt->fetchAll();
        
        echo json_encode([
            'success' => true,
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
