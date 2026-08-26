<?php
declare(strict_types=1);

// Cambia este valor por el mismo token largo que guardaras en Supabase.
$webhookToken = 'PaX7xWoeLeM68XkNbxoCKCB5qLGnc664H0foJ9okXoVnQ5hq';
$recipient = 'info@kora3d.co';
$sender = 'Kora <info@kora3d.co>';

function respond(int $status, array $body): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body);
    exit;
}

$token = (string) ($_GET['token'] ?? '');
if (!hash_equals($webhookToken, $token)) {
    respond(401, ['ok' => false, 'error' => 'No autorizado']);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (($_GET['test'] ?? '') === '1') {
        $sent = mail(
            $recipient,
            'Prueba de notificaciones Kora',
            '<p>El correo de cPanel para Kora está funcionando.</p>',
            implode("\r\n", [
                'MIME-Version: 1.0',
                'Content-Type: text/html; charset=UTF-8',
                'From: ' . $sender,
            ])
        );
        if (!$sent) {
            respond(502, ['ok' => false, 'error' => 'cPanel no pudo aceptar el correo de prueba']);
        }
        respond(200, ['ok' => true, 'message' => 'Correo de prueba aceptado por cPanel']);
    }
    respond(200, ['ok' => true]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'Metodo no permitido']);
}

$rawBody = file_get_contents('php://input');
if ($rawBody === false || strlen($rawBody) > 300000) {
    respond(400, ['ok' => false, 'error' => 'Solicitud invalida']);
}

$payload = json_decode($rawBody, true);
if (!is_array($payload) || empty($payload['subject']) || empty($payload['text'])) {
    respond(400, ['ok' => false, 'error' => 'Solicitud incompleta']);
}

$subject = str_replace(["\r", "\n"], '', (string) $payload['subject']);
$html = (string) ($payload['html'] ?? nl2br(htmlspecialchars((string) $payload['text'], ENT_QUOTES, 'UTF-8')));
$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'From: ' . $sender,
];

if (!empty($payload['replyTo']) && filter_var($payload['replyTo'], FILTER_VALIDATE_EMAIL)) {
    $headers[] = 'Reply-To: ' . $payload['replyTo'];
}

$sent = mail($recipient, $subject, $html, implode("\r\n", $headers));
if (!$sent) {
    respond(502, ['ok' => false, 'error' => 'El servidor no pudo enviar el correo']);
}

respond(200, ['ok' => true]);
