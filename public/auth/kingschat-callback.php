<?php
/**
 * KingsChat OAuth Callback Handler for Mobile App
 *
 * This page receives the POST data from KingsChat OAuth
 * and redirects to the mobile app's deep link with the token
 *
 * Mobile App: Rhapsody TV
 * Deep Link Scheme: rhapsodytv
 */

// Override the JSON content type - this page returns HTML
header('Content-Type: text/html; charset=UTF-8');

// Get token from various sources
$token = null;
$refreshToken = null;

// Check POST data
if (!empty($_POST['accessToken'])) {
    $token = $_POST['accessToken'];
}
if (!empty($_POST['refreshToken'])) {
    $refreshToken = $_POST['refreshToken'];
}

// Check GET data
if (!$token && !empty($_GET['accessToken'])) {
    $token = $_GET['accessToken'];
}
if (!$refreshToken && !empty($_GET['refreshToken'])) {
    $refreshToken = $_GET['refreshToken'];
}

// Check JSON input
$input_data = file_get_contents('php://input');
if (!$token && !empty($input_data)) {
    $json_data = json_decode($input_data, true);
    if ($json_data && isset($json_data['accessToken'])) {
        $token = $json_data['accessToken'];
    }
    if ($json_data && isset($json_data['refreshToken'])) {
        $refreshToken = $json_data['refreshToken'];
    }
}

// Build the deep link URL for the mobile app
$deepLinkScheme = 'rhapsodytv';
$deepLinkPath = '/auth/callback';

if ($token) {
    // Success - redirect to app with token
    $params = http_build_query([
        'accessToken' => $token,
        'refreshToken' => $refreshToken ?? '',
        'status' => 'success'
    ]);
    $redirectUrl = "{$deepLinkScheme}://{$deepLinkPath}?{$params}";
} else {
    // Error - redirect to app with error
    $error = $_GET['error'] ?? $_POST['error'] ?? 'No token received';
    $params = http_build_query([
        'status' => 'error',
        'error' => $error
    ]);
    $redirectUrl = "{$deepLinkScheme}://{$deepLinkPath}?{$params}";
}
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redirecting...</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #2563EB 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 40px 20px;
        }
        .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 30px;
            background: linear-gradient(135deg, #2563EB, #1d4ed8);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            font-weight: bold;
        }
        .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255,255,255,0.2);
            border-top-color: #2563EB;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        h2 {
            margin-bottom: 10px;
            font-size: 24px;
            font-weight: 600;
        }
        p {
            color: rgba(255,255,255,0.7);
            font-size: 16px;
        }
        .btn {
            display: inline-block;
            margin-top: 25px;
            padding: 14px 32px;
            background: #2563EB;
            color: white;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.2s ease;
        }
        .btn:hover {
            background: #1d4ed8;
            transform: translateY(-1px);
        }
        .footer {
            position: absolute;
            bottom: 20px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 12px;
            color: rgba(255,255,255,0.4);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">RTV</div>
        <div class="spinner"></div>
        <h2>Authentication Successful</h2>
        <p>Redirecting you back to the app...</p>
        <a href="<?php echo htmlspecialchars($redirectUrl); ?>" class="btn">
            Open App
        </a>
    </div>
    <div class="footer">
        Rhapsody TV &copy; <?php echo date('Y'); ?>
    </div>
    <script>
        // Auto-redirect to the app
        const redirectUrl = <?php echo json_encode($redirectUrl); ?>;
        window.location.href = redirectUrl;

        // Fallback: try again after a short delay
        setTimeout(function() {
            window.location.href = redirectUrl;
        }, 1000);
    </script>
</body>
</html>
