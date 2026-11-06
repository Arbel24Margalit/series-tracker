package io.github.arbel.seriestv;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

/*
 * "הסדרות שלי" for Android TV.
 * Shows the TV page of the series site. When a series link points to a
 * streaming service, it opens that service's TV app instead of a browser.
 */
public class MainActivity extends Activity {

    private static final String HOME = "https://arbel24margalit.github.io/series-tracker/tv.html";
    private static final String SITE_HOST = "arbel24margalit.github.io";

    private WebView web;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0d0e16"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                return handle(req.getUrl());
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handle(Uri.parse(url));
            }
        });
        setContentView(web);
        web.setFocusable(true);
        web.requestFocus(View.FOCUS_DOWN);
        if (state != null) web.restoreState(state);
        else web.loadUrl(HOME);
    }

    /** true = we handled it outside the WebView. */
    private boolean handle(Uri uri) {
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
        if (host.equals(SITE_HOST)) return false;
        openOutside(uri, host);
        return true;
    }

    private static String appFor(String host) {
        if (host.endsWith("netflix.com")) return "com.netflix.ninja";
        if (host.endsWith("youtube.com") || host.equals("youtu.be")) return "com.google.android.youtube.tv";
        if (host.endsWith("yes.co.il") || host.contains("yesplus")) return "il.co.yes.yesplus";
        if (host.equals("tv.apple.com")) return "com.apple.atve.androidtv.appletv";
        if (host.endsWith("disneyplus.com")) return "com.disney.disneyplus";
        if (host.endsWith("primevideo.com")) return "com.amazon.amazonvideo.livingroom";
        if (host.endsWith("max.com") || host.endsWith("hbomax.com")) return "com.wbd.stream";
        return null;
    }

    private void openOutside(Uri uri, String host) {
        String pkg = appFor(host);
        if (pkg != null) {
            // 1. The service's app, straight to the series.
            Intent i = new Intent(Intent.ACTION_VIEW, uri);
            i.setPackage(pkg);
            if (pkg.equals("com.netflix.ninja")) i.putExtra("source", "30");
            if (tryStart(i)) return;
            // 2. The service's app, at its home screen.
            PackageManager pm = getPackageManager();
            Intent home = pm.getLeanbackLaunchIntentForPackage(pkg);
            if (home == null) home = pm.getLaunchIntentForPackage(pkg);
            if (home != null && tryStart(home)) {
                Toast.makeText(this, "פתחתי את האפליקציה. חפש בה את הסדרה.", Toast.LENGTH_LONG).show();
                return;
            }
        }
        // 3. Whatever the TV uses for this link (another app or a browser).
        if (tryStart(new Intent(Intent.ACTION_VIEW, uri))) return;
        // 4. Last resort: show it here.
        web.loadUrl(uri.toString());
    }

    private boolean tryStart(Intent i) {
        try {
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
            return true;
        } catch (ActivityNotFoundException | SecurityException e) {
            return false;
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && web.canGoBack()) {
            web.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        web.requestFocus();
    }

    @Override
    protected void onPause() {
        web.onPause();
        super.onPause();
    }
}
