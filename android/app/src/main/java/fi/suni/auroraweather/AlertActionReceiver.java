package fi.suni.auroraweather;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import androidx.core.app.NotificationManagerCompat;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

/**
 * Hälytyksen palautepainike Androidilla (päätös 36): lähettää vastauksen vastaanotto-Workerille (osoite ja laitteen
 * satunnainen tunniste avaimesta rv-alert-native) avaamatta sovellusta ja kirjaa sen avaimeen
 * rv-alert-answered-native, jotta sovellus ei kysy samaa hälytystä uudestaan. Lähetetään vain tyyppi, ruutu,
 * lähetysaika, vastaus, kanava (button), tunniste, allekirjoitus ja laitteen tunniste. Ei sijaintia.
 */
public class AlertActionReceiver extends BroadcastReceiver {
    static final String KEY_ANSWERED = "rv-alert-answered-native";

    @Override
    public void onReceive(Context ctx, Intent intent) {
        final String answer = intent.getStringExtra("answer");
        final String aid = intent.getStringExtra("aid");
        NotificationManagerCompat.from(ctx).cancel(intent.getIntExtra("notificationId", 0));
        if (answer == null || aid == null) return;
        SharedPreferences sp = ctx.getSharedPreferences(AlertMessagingService.PREFS, Context.MODE_PRIVATE);
        try {
            JSONObject ans = new JSONObject(sp.getString(KEY_ANSWERED, "{}"));
            ans.put(aid, answer);
            sp.edit().putString(KEY_ANSWERED, ans.toString()).apply();
        } catch (Exception ignored) {
        }
        final JSONObject cfg = AlertMessagingService.nativeConfig(ctx);
        final String url = cfg.optString("url", "");
        if (url.isEmpty()) return;
        final PendingResult pending = goAsync();
        new Thread(() -> {
            HttpURLConnection c = null;
            try {
                JSONObject body = new JSONObject();
                body.put("type", intent.getStringExtra("kind"));
                body.put("cell", intent.getStringExtra("cell"));
                body.put("sentAt", intent.getStringExtra("sentAt"));
                body.put("answer", answer);
                body.put("channel", "button");
                body.put("aid", aid);
                body.put("sig", intent.getStringExtra("sig"));
                body.put("dev", cfg.optString("dev", ""));
                c = (HttpURLConnection) new URL(url).openConnection();
                c.setConnectTimeout(10000);
                c.setReadTimeout(10000);
                c.setRequestMethod("POST");
                c.setRequestProperty("content-type", "application/json");
                c.setDoOutput(true);
                try (OutputStream os = c.getOutputStream()) {
                    os.write(body.toString().getBytes(StandardCharsets.UTF_8));
                }
                c.getResponseCode();
            } catch (Exception e) {
                android.util.Log.w("AlertAction", "palaute epäonnistui", e);
            } finally {
                if (c != null) c.disconnect();
                pending.finish();
            }
        }).start();
    }
}
