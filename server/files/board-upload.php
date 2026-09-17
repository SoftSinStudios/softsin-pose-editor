<?php
declare(strict_types=1);

const SUPABASE_URL = 'https://pnpijueflzvlyzzmhdwa.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ts2QrwDwmmIrXbSzG14fBQ_REyHdGS5';
const PUBLIC_BOARD_IMAGE_BASE = 'https://files.softsinstudios.com/website-images/board';
const MAX_FILE_BYTES = 10485760;
const MAX_IMAGE_EDGE = 12000;
const MAX_UPLOADS_PER_HOUR = 20;

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
header('Access-Control-Max-Age: 600');
header('Cache-Control: no-store');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

function respond(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    if ($origin !== '' && !in_array($origin, $allowedOrigins, true)) {
        respond(403, ['error' => 'Origin is not allowed.']);
    }

    http_response_code(204);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST, OPTIONS');
    respond(405, ['error' => 'Method not allowed.']);
}

if ($origin === '' || !in_array($origin, $allowedOrigins, true)) {
    respond(403, ['error' => 'Origin is not allowed.']);
}

if (!function_exists('curl_init') || !class_exists('finfo')) {
    respond(500, ['error' => 'Required PHP extensions are unavailable.']);
}

$authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

if ($authorization === '' && function_exists('getallheaders')) {
    $requestHeaders = getallheaders();
    $authorization = is_array($requestHeaders)
        ? (string) ($requestHeaders['Authorization'] ?? $requestHeaders['authorization'] ?? '')
        : '';
}

if (!preg_match('/^Bearer\s+(.+)$/i', $authorization, $matches)) {
    respond(401, ['error' => 'A valid board session is required.']);
}

$accessToken = trim($matches[1]);
$curl = curl_init(SUPABASE_URL . '/auth/v1/user');

curl_setopt_array($curl, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $accessToken,
        'apikey: ' . SUPABASE_PUBLISHABLE_KEY,
    ],
]);

$authBody = curl_exec($curl);
$authStatus = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
curl_close($curl);

if ($authStatus !== 200 || !is_string($authBody)) {
    respond(401, ['error' => 'The board session could not be verified.']);
}

$authUser = json_decode($authBody, true);
$userId = is_array($authUser) ? ($authUser['id'] ?? '') : '';

if (!is_string($userId) || !preg_match('/^[0-9a-f-]{36}$/i', $userId)) {
    respond(401, ['error' => 'The board session returned an invalid user.']);
}

$profileCurl = curl_init(
    SUPABASE_URL . '/rest/v1/profiles?id=eq.' . rawurlencode($userId) . '&select=display_name,username,role&limit=1'
);

curl_setopt_array($profileCurl, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $accessToken,
        'apikey: ' . SUPABASE_PUBLISHABLE_KEY,
        'Accept: application/json',
    ],
]);

$profileBody = curl_exec($profileCurl);
$profileStatus = (int) curl_getinfo($profileCurl, CURLINFO_RESPONSE_CODE);
curl_close($profileCurl);

$profileRows = $profileStatus === 200 && is_string($profileBody)
    ? json_decode($profileBody, true)
    : [];
$profile = is_array($profileRows) && isset($profileRows[0]) && is_array($profileRows[0])
    ? $profileRows[0]
    : [];
$metadata = isset($authUser['user_metadata']) && is_array($authUser['user_metadata'])
    ? $authUser['user_metadata']
    : [];
$displayName = (string) (
    $profile['display_name']
    ?? $profile['username']
    ?? $metadata['global_name']
    ?? $metadata['full_name']
    ?? $metadata['name']
    ?? 'member'
);
$asciiName = function_exists('iconv')
    ? (iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $displayName) ?: $displayName)
    : $displayName;
$nameSlug = strtolower((string) preg_replace('/[^a-z0-9]+/i', '-', $asciiName));
$nameSlug = trim($nameSlug, '-');
$nameSlug = substr($nameSlug !== '' ? $nameSlug : 'member', 0, 40);
$isAdmin = ($profile['role'] ?? 'member') === 'admin';

if (!isset($_FILES['image']) || !is_array($_FILES['image'])) {
    respond(400, ['error' => 'No image was uploaded.']);
}

$upload = $_FILES['image'];

if (($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    respond(400, ['error' => 'The image upload did not complete.']);
}

$temporaryPath = (string) ($upload['tmp_name'] ?? '');
$fileSize = (int) ($upload['size'] ?? 0);

if (!is_uploaded_file($temporaryPath) || $fileSize < 1 || $fileSize > MAX_FILE_BYTES) {
    respond(413, ['error' => 'Images must be between 1 byte and 10 MB.']);
}

$imageInfo = @getimagesize($temporaryPath);

if ($imageInfo === false || $imageInfo[0] > MAX_IMAGE_EDGE || $imageInfo[1] > MAX_IMAGE_EDGE) {
    respond(415, ['error' => 'The file is not a supported image or its dimensions are too large.']);
}

$mimeType = (new finfo(FILEINFO_MIME_TYPE))->file($temporaryPath);
$extensions = [
    'image/png' => 'png',
    'image/jpeg' => 'jpg',
    'image/webp' => 'webp',
    'image/gif' => 'gif',
];

if (!is_string($mimeType) || !isset($extensions[$mimeType])) {
    respond(415, ['error' => 'Only PNG, JPEG, WebP, and GIF images are allowed.']);
}

$now = time();
$recentUploads = [];
$rateHandle = null;

if (!$isAdmin) {
    $stateDirectory = __DIR__ . '/.board-upload-state';

    if (!is_dir($stateDirectory) && !mkdir($stateDirectory, 0700, true) && !is_dir($stateDirectory)) {
        respond(500, ['error' => 'The upload limiter could not be initialized.']);
    }

    $rateFile = $stateDirectory . '/' . $userId . '.json';
    $rateHandle = fopen($rateFile, 'c+');

    if ($rateHandle === false || !flock($rateHandle, LOCK_EX)) {
        respond(500, ['error' => 'The upload limiter is unavailable.']);
    }

    $rawRateData = stream_get_contents($rateHandle);
    $rateData = json_decode($rawRateData ?: '[]', true);
    $recentUploads = array_values(array_filter(
        is_array($rateData) ? $rateData : [],
        static fn ($timestamp): bool => is_int($timestamp) && $timestamp > $now - 3600
    ));

    if (count($recentUploads) >= MAX_UPLOADS_PER_HOUR) {
        flock($rateHandle, LOCK_UN);
        fclose($rateHandle);
        respond(429, ['error' => 'Image upload limit reached. Try again later.']);
    }
}

$userDirectory = __DIR__ . '/board/' . $userId;

if (!is_dir($userDirectory) && !mkdir($userDirectory, 0755, true) && !is_dir($userDirectory)) {
    if (is_resource($rateHandle)) {
        flock($rateHandle, LOCK_UN);
        fclose($rateHandle);
    }
    respond(500, ['error' => 'The image directory could not be created.']);
}

$fileName = sprintf(
    '%s_%s_%s.%s',
    $nameSlug,
    gmdate('Ymd-His'),
    bin2hex(random_bytes(4)),
    $extensions[$mimeType]
);
$destination = $userDirectory . '/' . $fileName;
$storagePath = 'board/' . $userId . '/' . $fileName;
$publicUrl = PUBLIC_BOARD_IMAGE_BASE . '/' . rawurlencode($userId) . '/' . rawurlencode($fileName);

if (!move_uploaded_file($temporaryPath, $destination)) {
    if (is_resource($rateHandle)) {
        flock($rateHandle, LOCK_UN);
        fclose($rateHandle);
    }
    respond(500, ['error' => 'The image could not be stored.']);
}

chmod($destination, 0644);

$originalName = basename((string) ($upload['name'] ?? ''));
$originalName = (string) preg_replace('/[^\x20-\x7E]/', '_', $originalName);
$registryPayload = json_encode([[
    'uploader_id' => $userId,
    'public_url' => $publicUrl,
    'storage_path' => $storagePath,
    'original_name' => substr($originalName, 0, 255),
    'mime_type' => $mimeType,
    'byte_size' => $fileSize,
]], JSON_UNESCAPED_SLASHES);
$registryCurl = curl_init(SUPABASE_URL . '/rest/v1/board_image_uploads?select=id');
curl_setopt_array($registryCurl, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $registryPayload,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $accessToken,
        'apikey: ' . SUPABASE_PUBLISHABLE_KEY,
        'Content-Type: application/json',
        'Prefer: return=representation',
    ],
]);
$registryBody = curl_exec($registryCurl);
$registryStatus = (int) curl_getinfo($registryCurl, CURLINFO_RESPONSE_CODE);
curl_close($registryCurl);
$registryRows = is_string($registryBody) ? json_decode($registryBody, true) : [];
$uploadId = is_array($registryRows) && isset($registryRows[0]['id']) ? $registryRows[0]['id'] : '';

if ($registryStatus !== 201 || !is_string($uploadId) || $uploadId === '') {
    @unlink($destination);
    if (is_resource($rateHandle)) {
        flock($rateHandle, LOCK_UN);
        fclose($rateHandle);
    }
    respond(500, ['error' => 'The image could not be registered. No file was retained.']);
}

if (is_resource($rateHandle)) {
    $recentUploads[] = $now;
    rewind($rateHandle);
    ftruncate($rateHandle, 0);
    fwrite($rateHandle, json_encode($recentUploads));
    fflush($rateHandle);
    flock($rateHandle, LOCK_UN);
    fclose($rateHandle);
}

respond(201, [
    'id' => $uploadId,
    'url' => $publicUrl,
    'uploadedBy' => $displayName,
    'userId' => $userId,
    'rateLimitExempt' => $isAdmin,
    'mimeType' => $mimeType,
    'size' => $fileSize,
]);
