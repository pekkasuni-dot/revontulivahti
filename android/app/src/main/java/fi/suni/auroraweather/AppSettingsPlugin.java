package fi.suni.auroraweather;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.view.HapticFeedbackConstants;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Sovelluksen oma järjestelmäasetussivu (päätös 39, 2026-11-10): hälytysnäkymän "Avaa asetukset" -nappi, kun
 * ilmoituslupa on evätty tai sijainti puuttuu. Paketin tunniste luetaan käynnissä olevasta sovelluksesta, joten
 * sama koodi avaa oikean sivun sekä tuotannossa (fi.suni.auroraweather) että Devissä (.dev). Rekisteröinti
 * MainActivityssä. iOS käyttää AppLauncher-lisäosaa (app-settings:), joten tätä ei ole iOS:llä.
 */
@CapacitorPlugin(name = "AppSettings")
public class AppSettingsPlugin extends Plugin {

    @PluginMethod
    public void open(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.fromParts("package", getContext().getPackageName(), null));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Asetussivua ei voitu avata: " + e.getMessage());
        }
    }

    /**
     * Alareunan turva-alue (11.11.2026, 2. korjaus): paljonko WebView jää navigointipalkin (kolme nappia tai eleviiva)
     * alle, dp-yksikköinä. Mitataan näkymien todellisista paikoista, ei Capacitorin SystemBarsin CSS-muuttujasta eikä
     * env():stä, jotka antoivat Dev-käännöksessä 0 vaikka palkki peitti napit. JS: sabFix() -> --sab-native.
     */
    @PluginMethod
    public void insets(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                View decor = getActivity().getWindow().getDecorView();
                View web = getBridge().getWebView();
                float d = getContext().getResources().getDisplayMetrics().density;
                WindowInsetsCompat wi = ViewCompat.getRootWindowInsets(decor);
                Insets nav = wi != null ? wi.getInsets(WindowInsetsCompat.Type.navigationBars()) : Insets.NONE;
                Insets sys = wi != null ? wi.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()) : Insets.NONE;
                boolean ime = wi != null && wi.isVisible(WindowInsetsCompat.Type.ime());
                int[] dl = new int[2], wl = new int[2];
                decor.getLocationOnScreen(dl);
                web.getLocationOnScreen(wl);
                int decorBottom = dl[1] + decor.getHeight();
                int webBottom = wl[1] + web.getHeight();
                // Palkin yläreuna näytöllä = ikkunan alareuna - palkin korkeus; WebView sen alapuolella = peitto.
                int overlap = ime ? 0 : Math.max(0, webBottom - (decorBottom - sys.bottom));
                JSObject r = new JSObject();
                r.put("overlap", Math.round(overlap / d));
                r.put("navBottom", Math.round(nav.bottom / d));
                r.put("sysBottom", Math.round(sys.bottom / d));
                r.put("webBottom", Math.round(webBottom / d));
                r.put("decorBottom", Math.round(decorBottom / d));
                r.put("ime", ime);
                call.resolve(r);
            } catch (Exception e) {
                call.reject("Turva-alueen mittaus epäonnistui: " + e.getMessage());
            }
        });
    }

    /**
     * Haptiikkatesti (11.11.2026, Kehittäjä-näkymä): järjestelmän oma kosketuspalaute (View.performHapticFeedback),
     * vertailuksi Capacitor Hapticsin värinään. Noudattaa puhelimen "kosketuspalaute"-asetusta. type: tick | tap | confirm.
     * Palauttaa, hyväksyikö järjestelmä palautteen (false = asetus pois tai laite ei tue).
     */
    @PluginMethod
    public void feedback(PluginCall call) {
        String type = call.getString("type", "tick");
        getActivity().runOnUiThread(() -> {
            int c = HapticFeedbackConstants.CLOCK_TICK;
            if ("tap".equals(type)) c = HapticFeedbackConstants.VIRTUAL_KEY;
            else if ("confirm".equals(type)) c = Build.VERSION.SDK_INT >= 30 ? HapticFeedbackConstants.CONFIRM : HapticFeedbackConstants.LONG_PRESS;
            boolean ok = getBridge().getWebView().performHapticFeedback(c);
            JSObject r = new JSObject();
            r.put("ok", ok);
            call.resolve(r);
        });
    }
}
