<?php
/**
 * Peak Hydration — Instagram feed proxy.
 *
 * Instagram gives no public access to a profile's posts: the profile page is
 * login-walled and the public JSON endpoints are blocked. A live feed
 * therefore REQUIRES an access token, and the token must stay server-side —
 * never in the page source. This script fetches, caches and serves the feed
 * as JSON for js/instagram.js to render.
 *
 * Setup: copy instagram-config.sample.php to instagram-config.php and fill in
 * the token. See that file for how to get one.
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=300');

$configFile = __DIR__ . '/instagram-config.php';
$config = is_readable($configFile) ? (array) require $configFile : [];

$token    = trim((string) ($config['access_token'] ?? ''));
$igUserId = trim((string) ($config['ig_user_id'] ?? ''));
$limit    = max(1, min(24, (int) ($config['limit'] ?? 8)));
$ttl      = max(60, (int) ($config['cache_minutes'] ?? 60) * 60);

$cacheDir  = __DIR__ . '/cache';
$cacheFile = $cacheDir . '/instagram.json';

function respond(array $payload, int $status = 200): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

/** Serve a cached copy even if stale — a stale feed beats an empty section. */
function serveCache(string $file, string $reason): void {
    if (is_readable($file)) {
        $cached = json_decode((string) file_get_contents($file), true);
        if (is_array($cached) && !empty($cached['items'])) {
            $cached['stale'] = true;
            $cached['note']  = $reason;
            respond($cached);
        }
    }
    respond(['items' => [], 'error' => $reason], 200);
}

if ($token === '') {
    respond([
        'items' => [],
        'error' => 'not_configured',
        'note'  => 'No access token set. Copy instagram-config.sample.php to instagram-config.php and add one.',
    ]);
}

// Fresh cache? Serve it and skip the API entirely.
if (is_readable($cacheFile) && (time() - (int) filemtime($cacheFile)) < $ttl) {
    $cached = json_decode((string) file_get_contents($cacheFile), true);
    if (is_array($cached) && isset($cached['items'])) {
        respond($cached);
    }
}

$fields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp';

// Two supported setups:
//   · Instagram API with Instagram Login  -> graph.instagram.com/me/media
//   · Instagram Graph API (business/creator, linked Facebook Page)
//     -> graph.facebook.com/v21.0/{ig-user-id}/media
$endpoint = $igUserId !== ''
    ? 'https://graph.facebook.com/v21.0/' . rawurlencode($igUserId) . '/media'
    : 'https://graph.instagram.com/me/media';

$url = $endpoint . '?fields=' . $fields . '&limit=' . $limit
     . '&access_token=' . urlencode($token);

$raw = false;
if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 12,
        CURLOPT_CONNECTTIMEOUT => 6,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_USERAGENT      => 'PeakHydrationSite/1.0',
    ]);
    $raw  = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($raw === false || $code >= 400) {
        serveCache($cacheFile, 'api_error_' . $code);
    }
} else {
    $ctx = stream_context_create(['http' => ['timeout' => 12]]);
    $raw = @file_get_contents($url, false, $ctx);
    if ($raw === false) {
        serveCache($cacheFile, 'api_unreachable');
    }
}

$data = json_decode((string) $raw, true);
if (!is_array($data) || !isset($data['data']) || !is_array($data['data'])) {
    serveCache($cacheFile, 'api_bad_response');
}

$items = [];
foreach ($data['data'] as $post) {
    $type = (string) ($post['media_type'] ?? '');
    // Videos expose the file in media_url; the still we want is thumbnail_url.
    $image = $type === 'VIDEO'
        ? (string) ($post['thumbnail_url'] ?? '')
        : (string) ($post['media_url'] ?? '');
    if ($image === '') {
        continue;
    }
    $caption = trim((string) ($post['caption'] ?? ''));
    if (function_exists('mb_substr') && mb_strlen($caption) > 140) {
        $caption = mb_substr($caption, 0, 140) . '…';
    }
    $items[] = [
        'id'        => (string) ($post['id'] ?? ''),
        'image'     => $image,
        'permalink' => (string) ($post['permalink'] ?? 'https://www.instagram.com/peakhydrationza/'),
        'caption'   => $caption,
        'type'      => $type,
        'timestamp' => (string) ($post['timestamp'] ?? ''),
    ];
    if (count($items) >= $limit) {
        break;
    }
}

$payload = ['items' => $items, 'fetched' => gmdate('c')];

if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0775, true);
}
if (is_dir($cacheDir) && is_writable($cacheDir)) {
    @file_put_contents($cacheFile, json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
}

respond($payload);
