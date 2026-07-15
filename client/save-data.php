<?php
// ===== ANK HYDRO — Save Site Data from Admin Panel =====
// Receives JSON data from admin dashboard and writes to site-data.json

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Simple auth check — must match admin credentials
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['auth_token'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Validate auth token (base64 of email:password stored in admin)
$validToken = $input['auth_token'];
$storedToken = '';
$dataFile = __DIR__ . '/site-data.json';
$authFile = __DIR__ . '/admin-auth.json';

// Load or create auth file
if (file_exists($authFile)) {
    $authData = json_decode(file_get_contents($authFile), true);
    $storedToken = $authData['token'] ?? '';
}

// If no auth file exists yet, accept the first token and store it
if (empty($storedToken)) {
    file_put_contents($authFile, json_encode(['token' => $validToken], JSON_PRETTY_PRINT));
    // Protect auth file with .htaccess
    $htaccess = __DIR__ . '/.htaccess';
    $htaccessContent = file_exists($htaccess) ? file_get_contents($htaccess) : '';
    if (strpos($htaccessContent, 'admin-auth.json') === false) {
        $rule = "\n# Protect admin auth file\n<Files \"admin-auth.json\">\n    Require all denied\n</Files>\n";
        file_put_contents($htaccess, $htaccessContent . $rule);
    }
    $storedToken = $validToken;
}

if ($validToken !== $storedToken) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid credentials']);
    exit;
}

// Extract site data (remove auth token before saving)
$siteData = $input;
unset($siteData['auth_token']);

// Write data to JSON file
$result = file_put_contents($dataFile, json_encode($siteData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

if ($result === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to write data file']);
    exit;
}

echo json_encode(['success' => true, 'message' => 'Site data published successfully', 'timestamp' => date('c')]);
