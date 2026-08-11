<?php
/**
 * PEAK HYDRATION — Contact & newsletter form handler
 * Works on Hostinger (shared PHP hosting). Uses PHP's built-in mail().
 *
 * To change where messages are delivered, edit $to below —
 * and ideally add a "return-path" / SPF record in Hostinger so mail() lands in the inbox.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// ---- CONFIG ---------------------------------------------------------------
// Change this to the email address that should receive submissions:
$to = "info@peakhydration.co.za";

// Where is the site hosted? Leave as true for the live domain.
$use_relative_redirect = true;
$site_url = $use_relative_redirect ? "" : "https://peakhydration.co.za";
// ---------------------------------------------------------------------------

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed.']);
    exit;
}

function clean($s) {
    return htmlspecialchars(strip_tags(trim($s ?? '')), ENT_QUOTES, 'UTF-8');
}

$form      = clean($_POST['form'] ?? 'contact');
$name      = clean($_POST['name'] ?? '');
$email     = filter_var($_POST['email'] ?? '', FILTER_SANITIZE_EMAIL);
$location  = clean($_POST['location'] ?? '');
$phone     = clean($_POST['phone'] ?? '');
$message   = clean($_POST['message'] ?? '');
$subject   = clean($_POST['subject'] ?? 'Website enquiry');

// Basic guard: honeypot field to block bots (a human never fills it).
if (!empty($_POST['website'])) {
    echo json_encode(['ok' => true]);
    exit;
}

// Validate
if ($form === 'newsletter') {
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['ok' => false, 'error' => 'Please enter a valid email address.']);
        exit;
    }
    $body  = "A new newsletter sign-up from the Peak Hydration website:\n\n";
    $body .= "Email: $email\n";
    $headers = "From: Peak Hydration Website <no-reply@" . ($_SERVER['HTTP_HOST'] ?? 'localhost') . ">\r\nReply-To: $email\r\n";
} else {
    if (empty($name) || !filter_var($email, FILTER_VALIDATE_EMAIL) || empty($message)) {
        echo json_encode(['ok' => false, 'error' => 'Please complete all required fields.']);
        exit;
    }
    $body  = "A new contact enquiry from the Peak Hydration website:\n\n";
    $body .= "Name:     $name\n";
    $body .= "Email:    $email\n";
    $body .= "Location: " . ($location ?: '-') . "\n";
    $body .= "Phone:    " . ($phone ?: '-') . "\n\n";
    $body .= "--- Message ---\n$message\n";
    $headers = "From: Peak Hydration Website <no-reply@" . ($_SERVER['HTTP_HOST'] ?? 'localhost') . ">\r\nReply-To: $email\r\n";
}

$sent = @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);

if ($sent) {
    echo json_encode(['ok' => true]);
} else {
    // mail() returned false — common on hosts that need a configured sender.
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'The server could not send the email. Please try again or contact us by phone.']);
}