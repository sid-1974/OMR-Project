<?php
require_once 'db_connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed. Use POST.']);
    exit();
}

$template_id = isset($_POST['template_id']) ? intval($_POST['template_id']) : 0;

if ($template_id <= 0) {
    echo json_encode(['success' => false, 'message' => 'Valid template_id is required.']);
    exit();
}

// Check template existence
try {
    $stmt = $pdo->prepare("SELECT id FROM `omr_templates` WHERE id = :id");
    $stmt->execute([':id' => $template_id]);
    if (!$stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Template does not exist.']);
        exit();
    }
} catch (\PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    exit();
}

if (!isset($_FILES['scan_image']) || $_FILES['scan_image']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'message' => 'Scan image file is required.']);
    exit();
}

$file_tmp = $_FILES['scan_image']['tmp_name'];
$file_name = $_FILES['scan_image']['name'];
$file_ext = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));
$allowed_exts = ['jpg', 'jpeg', 'png'];

if (!in_array($file_ext, $allowed_exts)) {
    echo json_encode(['success' => false, 'message' => 'Only JPG, JPEG, and PNG images are allowed.']);
    exit();
}

// Make sure folders exist
$upload_dir = 'uploads/scans/';
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

$unique_filename = uniqid('scan_', true) . '.' . $file_ext;
$dest_path = $upload_dir . $unique_filename;

if (!move_uploaded_file($file_tmp, $dest_path)) {
    echo json_encode(['success' => false, 'message' => 'Failed to save raw scanned image.']);
    exit();
}

try {
    // Insert initial record with pending_approval status
    $ins = $pdo->prepare("
        INSERT INTO `scanned_sheets` (template_id, raw_image_path, aligned_image_path, status) 
        VALUES (:template_id, :raw_image_path, '', 'pending_approval')
    ");
    $ins->execute([
        ':template_id' => $template_id,
        ':raw_image_path' => $dest_path
    ]);
    
    $scanned_sheet_id = $pdo->lastInsertId();
    
    echo json_encode([
        'success' => true,
        'scanned_sheet_id' => (int)$scanned_sheet_id,
        'raw_image_path' => $dest_path,
        'message' => 'Raw scan uploaded successfully.'
    ]);
} catch (\PDOException $e) {
    if (file_exists($dest_path)) {
        unlink($dest_path);
    }
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
