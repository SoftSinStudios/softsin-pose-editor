<?php
declare(strict_types=1);

const SUPABASE_URL = 'https://pnpijueflzvlyzzmhdwa.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ts2QrwDwmmIrXbSzG14fBQ_REyHdGS5';
const ORPHAN_GRACE_HOURS = 24;

$allowedOrigins = [
    'https://softsinstudios.com',
    'https://www.softsinstudios.com',
    'http://localhost:4321',
    'http://127.0.0.1:4321',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Cache-Control: no-store');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function apiRequest(string $method, string $path, string $token, ?string $payload = null): array
{
    $curl = curl_init(SUPABASE_URL . $path);
    $headers = [
        'Authorization: Bearer ' . $token,
        'apikey: ' . SUPABASE_PUBLISHABLE_KEY,
        'Accept: application/json',
    ];
    if ($payload !== null) {
        $headers[] = 'Content-Type: application/json';
        $headers[] = 'Prefer: return=minimal';
    }
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => $headers,
    ]);
    $body = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);
    return [$status, is_string($body) ? $body : ''];
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    if ($origin !== '' && !in_array($origin, $allowedOrigins, true)) respond(403, ['error' => 'Origin is not allowed.']);
    http_response_code(204);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') respond(405, ['error' => 'Method not allowed.']);
if ($origin === '' || !in_array($origin, $allowedOrigins, true)) respond(403, ['error' => 'Origin is not allowed.']);
if (!function_exists('curl_init')) respond(500, ['error' => 'The required PHP cURL extension is unavailable.']);

$authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
if ($authorization === '' && function_exists('getallheaders')) {
    $headers = getallheaders();
    $authorization = is_array($headers) ? (string) ($headers['Authorization'] ?? $headers['authorization'] ?? '') : '';
}
if (!preg_match('/^Bearer\s+(.+)$/i', $authorization, $matches)) respond(401, ['error' => 'A valid board session is required.']);
$token = trim($matches[1]);

[$authStatus, $authBody] = apiRequest('GET', '/auth/v1/user', $token);
$authUser = $authStatus === 200 ? json_decode($authBody, true) : null;
$userId = is_array($authUser) ? (string) ($authUser['id'] ?? '') : '';
if (!preg_match('/^[0-9a-f-]{36}$/i', $userId)) respond(401, ['error' => 'The board session could not be verified.']);

[$profileStatus, $profileBody] = apiRequest('GET', '/rest/v1/profiles?id=eq.' . rawurlencode($userId) . '&select=role&limit=1', $token);
$profiles = $profileStatus === 200 ? json_decode($profileBody, true) : [];
if (!is_array($profiles) || ($profiles[0]['role'] ?? '') !== 'admin') respond(403, ['error' => 'Administrator access is required.']);

$cutoff = gmdate('c', time() - ORPHAN_GRACE_HOURS * 3600);
$query = '/rest/v1/board_image_uploads?status=eq.pending&created_at=lt.' . rawurlencode($cutoff)
    . '&select=id,storage_path,byte_size&order=created_at.asc&limit=500';
[$listStatus, $listBody] = apiRequest('GET', $query, $token);
$uploads = $listStatus === 200 ? json_decode($listBody, true) : null;
if (!is_array($uploads)) respond(502, ['error' => 'The orphan registry could not be read.']);

$deleted = 0;
$bytesFreed = 0;
$failed = 0;

foreach ($uploads as $upload) {
    $id = (string) ($upload['id'] ?? '');
    $storagePath = (string) ($upload['storage_path'] ?? '');
    if (!preg_match('#^board/[0-9a-f-]{36}/[a-z0-9._-]+$#i', $storagePath) || !preg_match('/^[0-9a-f-]{36}$/i', $id)) {
        $failed++;
        continue;
    }

    $absolutePath = __DIR__ . '/' . $storagePath;
    if (is_file($absolutePath) && !unlink($absolutePath)) {
        $failed++;
        continue;
    }

    $payload = json_encode(['status' => 'deleted', 'deleted_at' => gmdate('c')], JSON_UNESCAPED_SLASHES);
    [$patchStatus] = apiRequest('PATCH', '/rest/v1/board_image_uploads?id=eq.' . rawurlencode($id) . '&status=eq.pending', $token, $payload);
    if ($patchStatus < 200 || $patchStatus >= 300) {
        $failed++;
        continue;
    }

    $deleted++;
    $bytesFreed += (int) ($upload['byte_size'] ?? 0);
}

respond(200, [
    'ok' => true,
    'deleted' => $deleted,
    'bytesFreed' => $bytesFreed,
    'failed' => $failed,
    'graceHours' => ORPHAN_GRACE_HOURS,
    'limitReached' => count($uploads) === 500,
]);
