package io.github.arbel.seriestv;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/*
 * "הסדרות שלי" for Android TV.
 * Shows the TV page of the series site. When a series link points to a
 * streaming service, it opens that service's TV app. Any other link opens
 * in the TV's browser; only if there is none, in our watch screen.
 * On start it checks version.json on the site and offers to update itself.
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
        if (state == null) checkForUpdate();
    }

    /* ---------- Self-update ---------- */

    private static final String VERSION_URL = "https://arbel24margalit.github.io/series-tracker/version.json";
    private static final String APK_URL = "https://arbel24margalit.github.io/series-tracker/tv.apk";

    private long installedVersion() {
        try {
            PackageInfo pi = getPackageManager().getPackageInfo(getPackageName(), 0);
            return Build.VERSION.SDK_INT >= 28 ? pi.getLongVersionCode() : pi.versionCode;
        } catch (PackageManager.NameNotFoundException e) {
            return Long.MAX_VALUE;
        }
    }

    private void checkForUpdate() {
        // A file left from an earlier update is no longer needed.
        new File(getCacheDir(), UpdateProvider.FILE).delete();
        new Thread(() -> {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(VERSION_URL + "?t=" + System.currentTimeMillis()).openConnection();
                c.setConnectTimeout(8000);
                c.setReadTimeout(8000);
                c.setUseCaches(false);
                if (c.getResponseCode() != 200) return;
                String text = new String(readAll(c.getInputStream()), "UTF-8");
                long latest = new JSONObject(text).optLong("versionCode", 0);
                if (latest > installedVersion()) runOnUiThread(this::offerUpdate);
            } catch (Exception ignored) { /* no internet or no file: try next time */ }
        }).start();
    }

    private void offerUpdate() {
        if (isFinishing()) return;
        new AlertDialog.Builder(this)
                .setTitle("יש גרסה חדשה")
                .setMessage("לעדכן את הסדרות שלי עכשיו?")
                .setPositiveButton("עדכון", (d, w) -> downloadUpdate())
                .setNegativeButton("לא עכשיו", null)
                .show();
    }

    private void downloadUpdate() {
        Toast.makeText(this, "מוריד עדכון…", Toast.LENGTH_SHORT).show();
        new Thread(() -> {
            File f = new File(getCacheDir(), UpdateProvider.FILE);
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(APK_URL + "?t=" + System.currentTimeMillis()).openConnection();
                c.setConnectTimeout(10000);
                c.setReadTimeout(30000);
                c.setUseCaches(false);
                if (c.getResponseCode() != 200) throw new Exception("http " + c.getResponseCode());
                try (FileOutputStream out = new FileOutputStream(f)) { out.write(readAll(c.getInputStream())); }
                runOnUiThread(this::installUpdate);
            } catch (Exception e) {
                f.delete();
                runOnUiThread(() -> Toast.makeText(this, "ההורדה נכשלה. ננסה בפעם הבאה.", Toast.LENGTH_LONG).show());
            }
        }).start();
    }

    private void installUpdate() {
        if (Build.VERSION.SDK_INT >= 26 && !getPackageManager().canRequestPackageInstalls()) {
            Toast.makeText(this, "צריך לאשר להסדרות שלי להתקין אפליקציות, ואז לחזור.", Toast.LENGTH_LONG).show();
            tryStart(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName())));
            return;
        }
        Intent i = new Intent(Intent.ACTION_VIEW);
        if (Build.VERSION.SDK_INT >= 24) {
            i.setDataAndType(UpdateProvider.uri(), "application/vnd.android.package-archive");
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } else {
            File f = new File(getCacheDir(), UpdateProvider.FILE);
            f.setReadable(true, false);
            i.setDataAndType(Uri.fromFile(f), "application/vnd.android.package-archive");
        }
        if (!tryStart(i)) Toast.makeText(this, "לא הצלחתי לפתוח את ההתקנה.", Toast.LENGTH_LONG).show();
    }

    private static byte[] readAll(InputStream in) throws Exception {
        try (InputStream is = in; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[16384];
            int n;
            while ((n = is.read(buf)) > 0) out.write(buf, 0, n);
            return out.toByteArray();
        }
    }

    /** true = we handled it outside the WebView. */
    private boolean handle(Uri uri) {
        if ("seriesapp".equals(uri.getScheme())) {
            openApp(uri.getQueryParameter("app"));
            return true;
        }
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
            openApp(keyFor(pkg));
            return;
        }
        // 3. Any other site: the TV's own browser (e.g. TV Bro).
        if (tryStart(new Intent(Intent.ACTION_VIEW, uri))) return;
        // 4. No browser on the TV: our own watch screen.
        Intent w = new Intent(this, WatchActivity.class);
        w.putExtra(WatchActivity.EXTRA_URL, uri.toString());
        startActivity(w);
    }

    private static String keyFor(String pkg) {
        switch (pkg) {
            case "com.netflix.ninja": return "netflix";
            case "com.google.android.youtube.tv": return "youtube";
            case "il.co.yes.yesplus": return "yes";
            case "com.apple.atve.androidtv.appletv": return "apple";
            case "com.disney.disneyplus": return "disney";
            case "com.amazon.amazonvideo.livingroom": return "prime";
            default: return "max";
        }
    }

    /** Known package names, then words to look for in an app's package or name. */
    private static String[][] appInfo(String key) {
        if (key == null) key = "";
        switch (key) {
            case "netflix": return new String[][]{{"com.netflix.ninja", "com.netflix.mediaclient"}, {"netflix", "נטפליקס"}, {"Netflix"}};
            case "yes": return new String[][]{{"il.co.yes.yesplus"}, {"il.co.yes", "yes", "יס"}, {"yes"}};
            case "youtube": return new String[][]{{"com.google.android.youtube.tv", "com.google.android.youtube"}, {"youtube", "יוטיוב"}, {"YouTube"}};
            case "apple": return new String[][]{{"com.apple.atve.androidtv.appletv"}, {"apple tv", "appletv"}, {"Apple TV"}};
            case "disney": return new String[][]{{"com.disney.disneyplus"}, {"disney"}, {"Disney+"}};
            case "prime": return new String[][]{{"com.amazon.amazonvideo.livingroom"}, {"prime video", "amazonvideo"}, {"Prime Video"}};
            case "max": return new String[][]{{"com.wbd.stream", "com.hbo.hbonow"}, {"hbo", "max"}, {"Max"}};
            default: return null;
        }
    }

    /** Opens the streaming app for this platform at its home screen. */
    private void openApp(String key) {
        String[][] info = appInfo(key);
        if (info == null) {
            Toast.makeText(this, "אין קישור לסדרה הזו.", Toast.LENGTH_LONG).show();
            return;
        }
        PackageManager pm = getPackageManager();
        for (String p : info[0]) {
            Intent i = pm.getLeanbackLaunchIntentForPackage(p);
            if (i == null) i = pm.getLaunchIntentForPackage(p);
            if (i != null && tryStart(i)) return;
        }
        Intent found = findApp(pm, Intent.CATEGORY_LEANBACK_LAUNCHER, info[1]);
        if (found == null) found = findApp(pm, Intent.CATEGORY_LAUNCHER, info[1]);
        if (found != null && tryStart(found)) return;
        Toast.makeText(this, "לא מצאתי את אפליקציית " + info[2][0] + " בסטרימר הזה.", Toast.LENGTH_LONG).show();
    }

    /** An installed app whose package or name matches one of the words. */
    private Intent findApp(PackageManager pm, String category, String[] words) {
        Intent q = new Intent(Intent.ACTION_MAIN);
        q.addCategory(category);
        for (ResolveInfo r : pm.queryIntentActivities(q, 0)) {
            String p = r.activityInfo.packageName;
            if (p.equals(getPackageName())) continue;
            String pl = p.toLowerCase();
            String label = String.valueOf(r.loadLabel(pm)).toLowerCase().trim();
            for (String w : words) {
                boolean hit = w.equals("yes") || w.equals("יס") || w.equals("max")
                        ? label.startsWith(w) || pl.contains("." + w)
                        : label.contains(w) || pl.contains(w.replace(" ", ""));
                if (hit) {
                    Intent i = new Intent(Intent.ACTION_MAIN);
                    i.addCategory(category);
                    i.setClassName(p, r.activityInfo.name);
                    return i;
                }
            }
        }
        return null;
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
