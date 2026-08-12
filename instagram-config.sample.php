<?php
/**
 * Instagram feed configuration — SAMPLE.
 *
 * Copy this file to `instagram-config.php` and fill in the token.
 * Do NOT commit the real instagram-config.php and do not paste the token
 * anywhere public — it grants read access to the account's media.
 *
 * ---------------------------------------------------------------------------
 * WHY A TOKEN IS NEEDED
 * ---------------------------------------------------------------------------
 * Instagram serves no post data to logged-out visitors. The profile page is
 * a login wall and the public JSON endpoints are blocked, so there is no way
 * to read the feed without authenticating. Anything claiming otherwise is
 * either scraping (breaks, and against their terms) or a paid third-party
 * widget doing this same call on your behalf.
 *
 * ---------------------------------------------------------------------------
 * HOW TO GET ONE (either route works — this script supports both)
 * ---------------------------------------------------------------------------
 * Route A — Instagram API with Instagram Login (simplest):
 *   1. Switch @peakhydrationza to a Business or Creator account (free, in
 *      the Instagram app: Settings > Account type and tools).
 *   2. Create an app at developers.facebook.com > My Apps > Create App.
 *   3. Add the Instagram product and generate a long-lived access token.
 *   4. Paste it as 'access_token' below and leave 'ig_user_id' empty.
 *
 * Route B — Instagram Graph API (if the account is linked to a Facebook Page):
 *   1. Link the Instagram account to the Facebook Page.
 *   2. Generate a long-lived Page access token with instagram_basic.
 *   3. Look up the connected Instagram user ID.
 *   4. Paste both below.
 *
 * NOTE ON EXPIRY: long-lived tokens last about 60 days and must be refreshed.
 * Diarise it, or the gallery will quietly fall back to the brand photography.
 */

return [
    // Long-lived access token. Required.
    'access_token'  => '',

    // Only for Route B. Leave empty for Route A.
    'ig_user_id'    => '',

    // How many posts to show.
    'limit'         => 8,

    // How long to cache before calling the API again. Keeps the site fast and
    // stays well inside Instagram's rate limits.
    'cache_minutes' => 60,
];
