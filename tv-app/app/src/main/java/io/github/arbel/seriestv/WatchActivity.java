package io.github.arbel.seriestv;

import android.app.Activity;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/*
 * Watch screen: opens a series link full screen inside the app.
 * - No popups or new windows.
 * - Requests to hosts in ad-hosts.txt (from the site, cached) get an empty answer.
 * - A page can't jump to another site on its own; only a click can.
 * - Video can go full screen. Back leaves full screen, then goes back, then closes.
 */
public class WatchActivity extends Activity {

    public static final String EXTRA_URL = "url";
    private static final String HOSTS_URL = "https://arbel24margalit.github.io/series-tracker/ad-hosts.txt";
    private static final String HOSTS_FILE = "ad-hosts.txt";

    private static volatile Set<String> blocked = Collections.emptySet();

    private FrameLayout root;
    private WebView web;
    private TextView message;
    private View fullView;
    private WebChromeClient.CustomViewCallback fullCallback;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setSupportMultipleWindows(true); // so new windows come to onCreateWindow, where we refuse them
        web.setWebViewClient(new Client());
        web.setWebChromeClient(new Chrome());
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));

        message = new TextView(this);
        message.setTextColor(Color.WHITE);
        message.setTextSize(28);
        message.setGravity(Gravity.CENTER);
        message.setBackgroundColor(Color.parseColor("#e60d0e16"));
        message.setVisibility(View.GONE);
        root.addView(message, new FrameLayout.LayoutParams(-1, -1));

        setContentView(root);
        loadHosts();

        String url = getIntent().getStringExtra(EXTRA_URL);
        if (state != null) web.restoreState(state);
        else if (url != null) web.loadUrl(url);
        web.requestFocus();
    }

    /* ---------- Ad host list ---------- */

    private void loadHosts() {
        final File cache = new File(getFilesDir(), HOSTS_FILE);
        if (blocked.isEmpty() && cache.exists()) {
            try { blocked = parse(readAll(new FileInputStream(cache))); } catch (Exception ignored) { }
        }
        new Thread(() -> {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(HOSTS_URL).openConnection();
                c.setConnectTimeout(8000);
                c.setReadTimeout(8000);
                if (c.getResponseCode() != 200) return;
                String text = readAll(c.getInputStream());
                Set<String> set = parse(text);
                if (set.isEmpty()) return;
                blocked = set;
                try (FileOutputStream out = new FileOutputStream(cache)) { out.write(text.getBytes("UTF-8")); }
            } catch (Exception ignored) { /* keep the cached list */ }
        }).start();
    }

    private static String readAll(InputStream in) throws Exception {
        try (InputStream is = in; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = is.read(buf)) > 0) out.write(buf, 0, n);
            return out.toString("UTF-8");
        }
    }

    private static Set<String> parse(String text) {
        Set<String> set = new HashSet<>();
        for (String line : text.split("\n")) {
            String h = line.trim().toLowerCase();
            int hash = h.indexOf('#');
            if (hash >= 0) h = h.substring(0, hash).trim();
            if (!h.isEmpty()) set.add(h);
        }
        return set;
    }

    /** true if host or any parent of it is on the list (ads.x.com matches x.com). */
    private static boolean isBlocked(String host) {
        if (host == null) return false;
        Set<String> set = blocked;
        String h = host.toLowerCase();
        while (true) {
            if (set.contains(h)) return true;
            int dot = h.indexOf('.');
            if (dot < 0) return false;
            h = h.substring(dot + 1);
        }
    }

    /** "www.site.co.il" → "site.co.il", "a.b.example.com" → "example.com". */
    private static String baseDomain(String host) {
        if (host == null) return "";
        String[] p = host.toLowerCase().split("\\.");
        if (p.length <= 2) return host.toLowerCase();
        String sld = p[p.length - 2];
        boolean twoPart = p[p.length - 1].length() == 2
                && (sld.equals("co") || sld.equals("org") || sld.equals("net") || sld.equals("com") || sld.equals("ac") || sld.equals("gov"));
        int keep = twoPart ? 3 : 2;
        StringBuilder b = new StringBuilder();
        for (int i = p.length - keep; i < p.length; i++) {
            if (b.length() > 0) b.append('.');
            b.append(p[i]);
        }
        return b.toString();
    }

    private static WebResourceResponse empty() {
        return new WebResourceResponse("text/plain", "utf-8", new ByteArrayInputStream(new byte[0]));
    }

    /* ---------- Page handling ---------- */

    private class Client extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
            return isBlocked(req.getUrl().getHost()) ? empty() : null;
        }

        @SuppressWarnings("deprecation")
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
            return isBlocked(Uri.parse(url).getHost()) ? empty() : null;
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
            boolean gesture = Build.VERSION.SDK_INT >= 24 && req.hasGesture();
            return block(view, req.getUrl(), gesture);
        }

        @SuppressWarnings("deprecation")
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return block(view, Uri.parse(url), false);
        }

        /** true = don't load it. */
        private boolean block(WebView view, Uri uri, boolean gesture) {
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
            if (!scheme.equals("http") && !scheme.equals("https")) return true; // intent://, market:// etc.
            if (isBlocked(uri.getHost())) return true;
            String current = view.getUrl() == null ? null : Uri.parse(view.getUrl()).getHost();
            if (current == null || gesture) return false;
            return !baseDomain(current).equals(baseDomain(uri.getHost()));
        }

        @Override
        public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
            message.setVisibility(View.GONE);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError err) {
            if (req.isForMainFrame()) showBroken();
        }

        @SuppressWarnings("deprecation")
        @Override
        public void onReceivedError(WebView view, int code, String desc, String url) {
            showBroken();
        }
    }

    private void showBroken() {
        message.setText("הקישור לא עובד.\nעדכן אותו בטלפון.\n\n(חזור – לרשימה)");
        message.setVisibility(View.VISIBLE);
    }

    private class Chrome extends WebChromeClient {
        @Override
        public boolean onCreateWindow(WebView view, boolean dialog, boolean userGesture, Message resultMsg) {
            return false; // no popups, no new tabs
        }

        @Override
        public void onShowCustomView(View view, CustomViewCallback callback) {
            if (fullView != null) { callback.onCustomViewHidden(); return; }
            fullView = view;
            fullCallback = callback;
            root.addView(view, new FrameLayout.LayoutParams(-1, -1));
            web.setVisibility(View.GONE);
            view.requestFocus();
        }

        @Override
        public void onHideCustomView() {
            exitFull();
        }
    }

    private void exitFull() {
        if (fullView == null) return;
        root.removeView(fullView);
        fullView = null;
        web.setVisibility(View.VISIBLE);
        if (fullCallback != null) fullCallback.onCustomViewHidden();
        fullCallback = null;
        web.requestFocus();
    }

    /* ---------- Keys and lifecycle ---------- */

    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        if (e.getKeyCode() == KeyEvent.KEYCODE_BACK) {
            if (e.getAction() == KeyEvent.ACTION_UP) {
                if (fullView != null) exitFull();
                else if (message.getVisibility() != View.VISIBLE && web.canGoBack()) web.goBack();
                else finish();
            }
            return true;
        }
        return super.dispatchKeyEvent(e);
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
    }

    @Override
    protected void onPause() {
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        root.removeAllViews();
        web.destroy();
        super.onDestroy();
    }
}
