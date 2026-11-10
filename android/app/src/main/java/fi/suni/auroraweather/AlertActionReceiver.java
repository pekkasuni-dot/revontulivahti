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
 * satunnainen tunniste avaimesta rv-alert-native) avaamatta sovellusta. Lähetetään vain tyyppi, ruutu,
 * lähetysaika, vastaus, kanava (button), tunniste, allekirjoitus ja laitteen tunniste. Ei sijaintia.
 * 7.11.2026: vastaus kirjataan avaimeen rv-alert-answered-native VASTA kun Worker hyväksyi sen (2xx) tai hylkäsi
 * pysyvästi (4xx paitsi 429, uusi yritys ei auttaisi). Verkkovirhe, 5xx, 429 tai puuttuva osoite -> avain
 * rv-alert-pending-native, josta sovellus lähettää vastauksen uudelleen avautuessaan (index.html fbSyncNative).
 */
public class AlertActionReceiver extends BroadcastReceiver {
    static final String KEY_ANSWERED = "rv-alert-answered-native";

    static synchronized void putJson(Context ctx, String key, String aid, Object value) {
        SharedPreferences sp = ctx.getSharedPreferences(AlertMessagingService.PREFS, Context.MODE_PRIVATE);
        try {
            JSONObject o = new JSONObject(sp.getString(key, "{}"));
            if (value == null) o.remove(aid); else o.put(aid, value);
            sp.edit().putString(key, o.toString()).apply();
        } catch (Exception ignored) {
        }
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        final String answer = intent.getStringExtra("answer");
        final String aid = intent.getStringExtra("aid");
        NotificationManagerCompat.from(ctx).cancel(intent.getIntExtra("notificationId", 0));
        if (answer == null || aid == null) return;
        final JSONObject cfg = AlertMessagingService.nativeConfig(ctx);
        final String url = cfg.optString("url", "");
        final JSONObject body = new JSONObject();
        try {
            body.put("type", intent.getStringExtra("kind"));
            body.put("cell", intent.getStringExtra("cell"));
            body.put("sentAt", intent.getStringExtra("sentAt"));
            body.put("answer", answer);
            body.put("channel", "button");
            body.put("aid", aid);
            body.put("sig", intent.getStringExtra("sig"));
            body.put("dev", cfg.optString("dev", ""));
        } catch (Exception e) {
            return;
        }
        // Ensin odottamaan; poistetaan vasta lopullisen vastauksen jälkeen (sovellus voi sulkeutua kesken).
        putJson(ctx, AlertMessagingService.KEY_PENDING, aid, body);
        if (url.isEmpty()) return;
        final Context app = ctx.getApplicationContext();
        final PendingResult pending = goAsync();
        new Thread(() -> {
            HttpURLConnection c = null;
            try {
                c = (HttpURLConnection) new URL(url).openConnection();
                c.setConnectTimeout(6000);
                c.setReadTimeout(6000);
                c.setRequestMethod("POST");
                c.setRequestProperty("content-type", "application/json");
                c.setDoOutput(true);
                try (OutputStream os = c.getOutputStream()) {
                    os.write(body.toString().getBytes(StandardCharsets.UTF_8));
                }
                int code = c.getResponseCode();
                boolean done = (code >= 200 && code < 300) || (code >= 400 && code < 500 && code != 429);
                if (done) {
                    putJson(app, KEY_ANSWERED, aid, answer);
                    putJson(app, AlertMessagingService.KEY_PENDING, aid, null);
                    if (code >= 400) android.util.Log.w("AlertAction", "palaute hylätty: HTTP " + code);
                }
            } catch (Exception e) {
                android.util.Log.w("AlertAction", "palaute epäonnistui, yritetään sovelluksessa uudelleen", e);
            } finally {
                if (c != null) c.disconnect();
                pending.finish();
            }
        }).start();
    }
}
