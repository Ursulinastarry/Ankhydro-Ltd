<?php
// ===== ANK HYDRO — Image Upload Handler =====

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS, DELETE');
header('Access-Control-Allow-Headers: Content-Type, X-Auth-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Auth check
$authToken = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? $_POST['auth_token'] ?? '';
$authFile = __DIR__ . '/admin-auth.json';

if (file_exists($authFile)) {
    $authData = json_decode(file_get_contents($authFile), true);
    $storedToken = $authData['token'] ?? '';
    if (empty($authToken) || $authToken !== $storedToken) {
        // If no auth file yet, accept first token
        if (!empty($storedToken)) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
    }
}

$uploadDir = __DIR__ . '/uploads/';
$webPath = 'uploads/';

// Create uploads directory if needed
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Handle DELETE request (remove image)
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    $filename = basename($input['filename'] ?? '');

    if (empty($filename)) {
        http_response_code(400);
        echo json_encode(['error' => 'No filename provided']);
        exit;
    }

    $filepath = $uploadDir . $filename;
    if (file_exists($filepath)) {
        unlink($filepath);
        echo json_encode(['success' => true, 'message' => 'Image deleted']);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'File not found']);
    }
    exit;
}

// Handle POST (upload)
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

if (!isset($_FILES['image'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No image file uploaded']);
    exit;
}

$file = $_FILES['image'];
$section = preg_replace('/[^a-z0-9_-]/', '', strtolower($_POST['section'] ?? 'general'));
$itemId = preg_replace('/[^a-z0-9_-]/', '', strtolower($_POST['item_id'] ?? 'item'));

// Validate file type
$allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file type. Allowed: JPG, PNG, WebP, GIF, SVG']);
    exit;
}

// Max 5MB
if ($file['size'] > 5 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode(['error' => 'File too large. Maximum 5MB']);
    exit;
}

// Create section subdirectory
$sectionDir = $uploadDir . $section . '/';
if (!is_dir($sectionDir)) {
    mkdir($sectionDir, 0755, true);
}

// Generate safe filename
$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
$ext = preg_replace('/[^a-z0-9]/', '', strtolower($ext));
if (!$ext) $ext = 'jpg';
$filename = $section . '-' . $itemId . '-' . time() . '.' . $ext;
$filepath = $sectionDir . $filename;

if (move_uploaded_file($file['tmp_name'], $filepath)) {
    echo json_encode([
        'success' => true,
        'url' => $webPath . $section . '/' . $filename,
        'filename' => $filename,
        'section' => $section
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save file']);
}
