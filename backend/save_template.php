<?php
require_once 'db_connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed. Use POST.']);
    exit();
}

// Check parameters
$id = isset($_POST['id']) ? intval($_POST['id']) : 0;
$name = isset($_POST['name']) ? trim($_POST['name']) : '';
$width = isset($_POST['width']) ? intval($_POST['width']) : 0;
$height = isset($_POST['height']) ? intval($_POST['height']) : 0;
$anchors_json = isset($_POST['anchors_json']) ? $_POST['anchors_json'] : '';
$regno_config = isset($_POST['regno_config']) ? $_POST['regno_config'] : 'null';
$sheetno_config = isset($_POST['sheetno_config']) ? $_POST['sheetno_config'] : 'null';
$qpcode = isset($_POST['qpcode']) ? trim($_POST['qpcode']) : null;
$qpcode_config = isset($_POST['qpcode_config']) ? $_POST['qpcode_config'] : 'null';
$questions_config = isset($_POST['questions_config']) ? $_POST['questions_config'] : '';

if (empty($name) || $width <= 0 || $height <= 0 || empty($anchors_json) || empty($questions_config)) {
    echo json_encode(['success' => false, 'message' => 'Missing required fields (name, width, height, anchors_json, questions_config).']);
    exit();
}

// Verify JSON formats
if (!json_decode($anchors_json) || !json_decode($questions_config)) {
    echo json_encode(['success' => false, 'message' => 'Invalid JSON formatting for anchors or questions configuration.']);
    exit();
}

if ($regno_config !== 'null' && !json_decode($regno_config)) {
    echo json_encode(['success' => false, 'message' => 'Invalid JSON formatting for regno configuration.']);
    exit();
}

if ($sheetno_config !== 'null' && !json_decode($sheetno_config)) {
    echo json_encode(['success' => false, 'message' => 'Invalid JSON formatting for sheetno configuration.']);
    exit();
}

if ($qpcode_config !== 'null' && !json_decode($qpcode_config)) {
    echo json_encode(['success' => false, 'message' => 'Invalid JSON formatting for qpcode configuration.']);
    exit();
}

$dest_path = null;
$new_image_uploaded = false;

if ($id > 0) {
    // Check if the template design exists
    $check_stmt = $pdo->prepare("SELECT blank_image_path FROM `omr_templates` WHERE id = :id");
    $check_stmt->execute([':id' => $id]);
    $existing = $check_stmt->fetch();
    if (!$existing) {
        echo json_encode(['success' => false, 'message' => 'Template design to update not found.']);
        exit();
    }
    $dest_path = $existing['blank_image_path'];
}

// Handle File Upload
if (isset($_FILES['blank_image']) && $_FILES['blank_image']['error'] === UPLOAD_ERR_OK) {
    $file_tmp = $_FILES['blank_image']['tmp_name'];
    $file_name = $_FILES['blank_image']['name'];
    $file_ext = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));
    $allowed_exts = ['jpg', 'jpeg', 'png'];

    if (!in_array($file_ext, $allowed_exts)) {
        echo json_encode(['success' => false, 'message' => 'Only JPG, JPEG, and PNG images are allowed.']);
        exit();
    }

    // Ensure upload directory exists
    $upload_dir = 'uploads/templates/';
    if (!file_exists($upload_dir)) {
        mkdir($upload_dir, 0777, true);
    }

    $unique_filename = uniqid('template_', true) . '.' . $file_ext;
    $new_dest_path = $upload_dir . $unique_filename;

    if (!move_uploaded_file($file_tmp, $new_dest_path)) {
        echo json_encode(['success' => false, 'message' => 'Failed to save uploaded blank OMR template image.']);
        exit();
    }

    $new_image_uploaded = true;
    $old_dest_path = $dest_path;
    $dest_path = $new_dest_path;
} else {
    // If no new image was uploaded and it's a new template, fail
    if ($id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Blank OMR sheet image is required for new templates.']);
        exit();
    }
}

try {
    $pdo->beginTransaction();

    // Ensure Parent Template (Group) Exists
    $stmtParentCheck = $pdo->prepare("SELECT id FROM `templates` WHERE name = :name");
    $stmtParentCheck->execute([':name' => $name]);
    $parent = $stmtParentCheck->fetch();

    if ($parent) {
        $parent_id = $parent['id'];
    } else {
        $stmtInsertParent = $pdo->prepare("INSERT INTO `templates` (name) VALUES (:name)");
        $stmtInsertParent->execute([':name' => $name]);
        $parent_id = $pdo->lastInsertId();
    }

    if ($id > 0) {
        $stmt = $pdo->prepare("
            UPDATE `omr_templates` 
            SET template_id = :template_id, name = :name, blank_image_path = :blank_image_path, width = :width, height = :height, 
                anchors_json = :anchors_json, regno_config = :regno_config, sheetno_config = :sheetno_config, 
                qpcode = :qpcode, qpcode_config = :qpcode_config, questions_config = :questions_config 
            WHERE id = :id
        ");
        $stmt->execute([
            ':template_id' => $parent_id,
            ':name' => $name,
            ':blank_image_path' => $dest_path,
            ':width' => $width,
            ':height' => $height,
            ':anchors_json' => $anchors_json,
            ':regno_config' => $regno_config === 'null' ? null : $regno_config,
            ':sheetno_config' => $sheetno_config === 'null' ? null : $sheetno_config,
            ':qpcode' => $qpcode,
            ':qpcode_config' => $qpcode_config === 'null' ? null : $qpcode_config,
            ':questions_config' => $questions_config,
            ':id' => $id
        ]);

        // If update succeeded and a new image was uploaded, delete the old image
        if ($new_image_uploaded && $old_dest_path && file_exists($old_dest_path)) {
            unlink($old_dest_path);
        }

        $template_id = $id; // id of the omr_templates record
        $message = 'OMR template design updated successfully.';
    } else {
        $stmt = $pdo->prepare("
            INSERT INTO `omr_templates` (template_id, name, blank_image_path, width, height, anchors_json, regno_config, sheetno_config, qpcode, qpcode_config, questions_config) 
            VALUES (:template_id, :name, :blank_image_path, :width, :height, :anchors_json, :regno_config, :sheetno_config, :qpcode, :qpcode_config, :questions_config)
        ");
        $stmt->execute([
            ':template_id' => $parent_id,
            ':name' => $name,
            ':blank_image_path' => $dest_path,
            ':width' => $width,
            ':height' => $height,
            ':anchors_json' => $anchors_json,
            ':regno_config' => $regno_config === 'null' ? null : $regno_config,
            ':sheetno_config' => $sheetno_config === 'null' ? null : $sheetno_config,
            ':qpcode' => $qpcode,
            ':qpcode_config' => $qpcode_config === 'null' ? null : $qpcode_config,
            ':questions_config' => $questions_config
        ]);

        $template_id = (int)$pdo->lastInsertId();
        $message = 'OMR template design created successfully.';
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => $message,
        'parent_id' => $parent_id,
        'template_id' => $template_id, // Design ID
        'blank_image_path' => $dest_path
    ]);
} catch (\PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // Clean up new file if DB insert/update fails
    if ($new_image_uploaded && file_exists($dest_path)) {
        unlink($dest_path);
    }
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
