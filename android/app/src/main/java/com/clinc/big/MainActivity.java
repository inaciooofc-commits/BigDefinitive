package com.clinc.big;

import android.app.Activity;
import android.os.Bundle;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.view.Gravity;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final String PREFS = "big_prefs";
    private static final String KEY_SERVER = "server_url";

    private WebView webView;
    private EditText serverInput;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        String savedServer = getSharedPreferences(PREFS, MODE_PRIVATE).getString(KEY_SERVER, "");
        if (savedServer == null || savedServer.trim().isEmpty()) {
            showSetup();
        } else {
            showWeb(savedServer);
        }
    }

    private void showSetup() {
        LinearLayout setup = new LinearLayout(this);
        setup.setOrientation(LinearLayout.VERTICAL);
        setup.setGravity(Gravity.CENTER);
        setup.setPadding(42, 42, 42, 42);
        setup.setBackgroundColor(Color.rgb(7, 8, 18));

        TextView title = new TextView(this);
        title.setText("Big");
        title.setTextSize(46);
        title.setTextColor(Color.WHITE);
        title.setGravity(Gravity.CENTER);

        TextView subtitle = new TextView(this);
        subtitle.setText("Configure o servidor do Big");
        subtitle.setTextSize(16);
        subtitle.setTextColor(Color.rgb(190, 200, 255));
        subtitle.setGravity(Gravity.CENTER);
        subtitle.setPadding(0, 10, 0, 24);

        serverInput = new EditText(this);
        serverInput.setHint("http://192.168.0.6:8088");
        serverInput.setText("http://192.168.0.6:8088");
        serverInput.setSingleLine(true);
        serverInput.setTextColor(Color.WHITE);
        serverInput.setHintTextColor(Color.rgb(130, 140, 170));
        serverInput.setBackgroundColor(Color.rgb(20, 24, 40));
        serverInput.setPadding(18, 12, 18, 12);

        Button connect = new Button(this);
        connect.setText("Entrar no Big");
        connect.setTextColor(Color.WHITE);
        connect.setBackgroundColor(Color.rgb(124, 60, 255));

        TextView help = new TextView(this);
        help.setText("Use o IP do antiX ou o link Cloudflare. Exemplo: http://192.168.0.6:8088");
        help.setTextColor(Color.rgb(160, 170, 210));
        help.setTextSize(13);
        help.setPadding(0, 22, 0, 0);
        help.setGravity(Gravity.CENTER);

        connect.setOnClickListener(v -> {
            String server = serverInput.getText().toString().trim();
            if (!server.startsWith("http://") && !server.startsWith("https://")) {
                server = "http://" + server;
            }
            getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(KEY_SERVER, server).apply();
            showWeb(server);
        });

        setup.addView(title, new LinearLayout.LayoutParams(-1, -2));
        setup.addView(subtitle, new LinearLayout.LayoutParams(-1, -2));
        setup.addView(serverInput, new LinearLayout.LayoutParams(-1, -2));
        setup.addView(connect, new LinearLayout.LayoutParams(-1, -2));
        setup.addView(help, new LinearLayout.LayoutParams(-1, -2));

        setContentView(setup);
    }

    private void showWeb(String server) {
        webView = new WebView(this);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());

        String url = server;
        if (!url.endsWith("/")) url += "/";
        url += "member-app/";

        webView.loadUrl(url);
        setContentView(webView);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else if (webView != null) {
            showSetup();
        } else {
            super.onBackPressed();
        }
    }
}
