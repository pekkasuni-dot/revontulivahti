package fi.suni.auroraweather;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.google.firebase.messaging.RemoteMessage;
import io.capawesome.capacitorjs.plugins.firebase.messaging.MessagingService;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Revontulihälytykset Androidilla (päätös 36, 7.11.2026). Laajentaa Firebase-lisäosan palvelua (lisäosan tapahtumat
 * säilyvät): hälytys tulee data-viestinä (alerts/fcm.js dataOnlyAndroid), ja tämä näyttää sen itse. Päätös 58
 * (16.11.2026): palautepainikkeet poistettu ilmoituksesta (ennen Näkyi / Ei näkynyt / En katsonut). Kanavan nimi sovelluksen
 * kielellä (JS tallentaa ne avaimeen rv-alert-native, Capacitor Preferences = SharedPreferences "CapacitorStorage").
 * Saapunut hälytys talteen avaimeen rv-alert-inbox-native, josta sovellus lukee sen varakyselyä varten - VAIN jos
 * ilmoitukset ovat sallittuja (7.11.: muuten varakysely kysyisi hälytyksestä, jota käyttäjä ei nähnyt).
 * Vanhan käännöksen painikkeet: AlertActionReceiver (vastaus avaamatta sovellusta). Manifestissa korvaa lisäosan oman palvelun.
 */
public class AlertMessagingService extends MessagingService {
    static final String PREFS = "CapacitorStorage";
    static final String KEY_NATIVE = "rv-alert-native";
    static final String KEY_INBOX = "rv-alert-inbox-native";
    static final String KEY_PENDING = "rv-alert-pending-native";
    static final String CHANNEL = "aurora";
    // Päätös 60 (17.11.2026): kaikki hälytykset yhteen ryhmään (sama kuin iOS:n thread-id rv-alerts, alerts/fcm.js) +
    // yhteenvetoilmoitus, joka niputtaa ne ilmoituslaatikossa. Yhteenvedon otsikko sovelluksen kielellä (labels.group).
    static final String GROUP = "rv-alerts";
    static final int SUMMARY_ID = 0x52560001;

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        super.onMessageReceived(message);
        Map<String, String> data = message.getData();
        if (message.getNotification() == null && data.containsKey("aid") && data.containsKey("title")) {
            try {
                show(this, data);
            } catch (Exception e) {
                android.util.Log.w("AlertMessaging", "ilmoitus epäonnistui", e);
            }
        }
    }

    static JSONObject nativeConfig(Context ctx) {
        try {
            String raw = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_NATIVE, null);
            return raw != null ? new JSONObject(raw) : new JSONObject();
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    static void show(Context ctx, Map<String, String> data) throws Exception {
        String aid = data.get("aid");
        int id = aid.hashCode();
        JSONObject cfg = nativeConfig(ctx);
        JSONObject labels = cfg.optJSONObject("labels");
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        // Ilmoitukset estetty (Android 13+ lupa tai sovelluksen ilmoitukset pois) -> ei näytetä eikä tallenneta.
        if (!NotificationManagerCompat.from(ctx).areNotificationsEnabled()) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm.getNotificationChannel(CHANNEL) == null) {
            String name = labels != null ? labels.optString("channel", "Aurora alerts") : "Aurora alerts";
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, name, NotificationManager.IMPORTANCE_HIGH));
        }
        // Kanava "aurora" suljettu asetuksista -> sama kuin estetty.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = nm.getNotificationChannel(CHANNEL);
            if (ch != null && ch.getImportance() == NotificationManager.IMPORTANCE_NONE) return;
        }
        // Napautus avaa sovelluksen; Firebase-lisäosa välittää datan JS:lle (google.message_id -> notificationActionPerformed).
        Intent open = new Intent(ctx, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        open.putExtra("google.message_id", aid);
        for (Map.Entry<String, String> e : data.entrySet()) open.putExtra(e.getKey(), e.getValue());
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_aurora)
            .setColor(0xFF3DF2A0)
            .setContentTitle(data.get("title"))
            .setContentText(data.get("body"))
            .setStyle(new NotificationCompat.BigTextStyle().bigText(data.get("body")))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setGroup(GROUP)
            .setContentIntent(PendingIntent.getActivity(ctx, id, open, flags));
        // Päätös 58 (16.11.2026): ei palautepainikkeita ilmoituksessa (vastaus vain sääraportissa 90 min – 15 h).
        // AlertActionReceiver jää vastaanottamaan vanhan käännöksen jo näyttämien ilmoitusten painikkeet.
        NotificationManagerCompat.from(ctx).notify(id, b.build());
        // Yhteenveto ryhmälle (päätös 60): napautus avaa sovelluksen ilman hälytyksen dataa (ei raporttia).
        String groupTitle = labels != null ? labels.optString("group", "Aurora alerts") : "Aurora alerts";
        Intent openApp = new Intent(ctx, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        NotificationCompat.Builder sum = new NotificationCompat.Builder(ctx, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_aurora)
            .setColor(0xFF3DF2A0)
            .setContentTitle(groupTitle)
            .setStyle(new NotificationCompat.InboxStyle().setSummaryText(groupTitle))
            .setGroup(GROUP)
            .setGroupSummary(true)
            .setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_CHILDREN)
            .setAutoCancel(true)
            .setContentIntent(PendingIntent.getActivity(ctx, SUMMARY_ID, openApp, flags));
        NotificationManagerCompat.from(ctx).notify(SUMMARY_ID, sum.build());
        // Postilaatikko sovellukselle (varakysely), enintään 20 viimeisintä.
        SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSONArray inbox;
        try {
            inbox = new JSONArray(sp.getString(KEY_INBOX, "[]"));
        } catch (Exception e) {
            inbox = new JSONArray();
        }
        JSONObject item = new JSONObject();
        for (String k : new String[] {"aid", "kind", "cell", "sentAt", "sig"}) item.put(k, data.get(k));
        JSONArray out = new JSONArray();
        out.put(item);
        for (int i = 0; i < inbox.length() && out.length() < 20; i++) {
            JSONObject o = inbox.optJSONObject(i);
            if (o != null && !aid.equals(o.optString("aid"))) out.put(o);
        }
        sp.edit().putString(KEY_INBOX, out.toString()).apply();
    }
}
