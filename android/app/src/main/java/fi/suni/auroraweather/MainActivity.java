package fi.suni.auroraweather;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // Hälytyksen napautus suljetusta sovelluksesta (7.11.2026): Firebase-lisäosa käsittelee napautuksen vain
    // onNewIntentissa (sovellus jo käynnissä). Kylmäkäynnistyksessä sama aloitusintentti välitetään lisäosille
    // kerran (ei uudelleenluonnissa); lisäosa säilyttää tapahtuman, kunnes JS:n kuuntelija ottaa sen.
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Intent i = getIntent();
        if (savedInstanceState == null && bridge != null && i != null && i.getExtras() != null
            && i.getExtras().containsKey("google.message_id")) {
            bridge.onNewIntent(i);
        }
    }
}
