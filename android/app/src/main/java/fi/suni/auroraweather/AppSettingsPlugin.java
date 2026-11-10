package fi.suni.auroraweather;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
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
}
