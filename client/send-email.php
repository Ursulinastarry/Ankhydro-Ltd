<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://ankhydro.com');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid data']);
    exit;
}

$type = isset($data['type']) ? $data['type'] : 'contact';
$to = 'info@ankhydro.com';
$name = htmlspecialchars($data['name'] ?? '');
$email = filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL);
$phone = htmlspecialchars($data['phone'] ?? '');
$service = htmlspecialchars($data['service'] ?? '');
$message = htmlspecialchars($data['message'] ?? '');

if (!$name || !$email) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Name and email are required']);
    exit;
}

if ($type === 'quote') {
    $location = htmlspecialchars($data['location'] ?? '');
    $package = htmlspecialchars($data['package'] ?? '');
    $description = htmlspecialchars($data['description'] ?? '');
    $contactMethod = htmlspecialchars($data['contact_method'] ?? 'Phone');

    $subject = "New Quote Request from $name - ANK Hydro";
    $body = "
    <html><body style='font-family:Arial,sans-serif;'>
    <h2 style='color:#0a2540;'>New Quote Request</h2>
    <table style='border-collapse:collapse;width:100%;'>
        <tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>Name</td><td style='padding:8px;border:1px solid #ddd;'>$name</td></tr>
        <tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>Email</td><td style='padding:8px;border:1px solid #ddd;'>$email</td></tr>
        <tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>Phone</td><td style='padding:8px;border:1px solid #ddd;'>$phone</td></tr>
        <tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>Location</td><td style='padding:8px;border:1px solid #ddd;'>$location</td></tr>
        <tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>Service</td><td style='padding:8px;border:1px solid #ddd;'>$service</td></tr>
        <tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>Package</td><td style='padding:8px;border:1px solid #ddd;'>$package</td></tr>
        <tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>Preferred Contact</td><td style='padding:8px;border:1px solid #ddd;'>$contactMethod</td></tr>
        <tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>Description</td><td style='padding:8px;border:1px solid #ddd;'>$description</td></tr>
    </table>
    </body></html>";
} else {
    $subject = "New Contact Message from $name - ANK Hydro";
    $body = "
    <html><body style='font-family:Arial,sans-serif;'>
    <h2 style='color:#0a2540;'>New Contact Message</h2>
    <table style='border-collapse:collapse;width:100%;'>
        <tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>Name</td><td style='padding:8px;border:1px solid #ddd;'>$name</td></tr>
        <tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>Email</td><td style='padding:8px;border:1px solid #ddd;'>$email</td></tr>
        <tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>Phone</td><td style='padding:8px;border:1px solid #ddd;'>$phone</td></tr>
        <tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>Service Interest</td><td style='padding:8px;border:1px solid #ddd;'>$service</td></tr>
        <tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>Message</td><td style='padding:8px;border:1px solid #ddd;'>$message</td></tr>
    </table>
    </body></html>";
}

$headers = "MIME-Version: 1.0\r\n";
$headers .= "Content-type: text/html; charset=UTF-8\r\n";
$headers .= "From: ANK Hydro Website <noreply@ankhydro.com>\r\n";
$headers .= "Reply-To: $name <$email>\r\n";

$sent = mail($to, $subject, $body, $headers);

if ($sent) {
    echo json_encode(['success' => true, 'message' => 'Email sent successfully']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to send email']);
}
?>
