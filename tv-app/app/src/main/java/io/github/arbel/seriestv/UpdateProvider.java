package io.github.arbel.seriestv;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;

import java.io.File;
import java.io.FileNotFoundException;

/*
 * Hands the downloaded update (cache/update.apk) to Android's installer.
 * A tiny stand-in for FileProvider so the app needs no extra libraries.
 */
public class UpdateProvider extends ContentProvider {

    public static final String AUTHORITY = "io.github.arbel.seriestv.update";
    public static final String FILE = "update.apk";

    public static Uri uri() {
        return Uri.parse("content://" + AUTHORITY + "/" + FILE);
    }

    @Override
    public boolean onCreate() { return true; }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        if (!FILE.equals(uri.getLastPathSegment())) throw new FileNotFoundException();
        File f = new File(getContext().getCacheDir(), FILE);
        return ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override
    public String getType(Uri uri) { return "application/vnd.android.package-archive"; }

    @Override
    public Cursor query(Uri u, String[] p, String s, String[] a, String o) { return null; }

    @Override
    public Uri insert(Uri u, ContentValues v) { return null; }

    @Override
    public int delete(Uri u, String s, String[] a) { return 0; }

    @Override
    public int update(Uri u, ContentValues v, String s, String[] a) { return 0; }
}
