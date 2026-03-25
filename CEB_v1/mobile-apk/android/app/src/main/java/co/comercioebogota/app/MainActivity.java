package co.comercioebogota.app;

import android.os.Bundle;
import android.graphics.Color;
import android.os.Build;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  private void applySystemBarsTheme() {
    Window window = getWindow();
    window.clearFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);
    window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
    window.setStatusBarColor(Color.parseColor("#0E0E0E"));
    window.setNavigationBarColor(Color.parseColor("#0E0E0E"));
    // Keep system bars outside WebView so header/footer never overlap system UI.
    WindowCompat.setDecorFitsSystemWindows(window, true);

    // OEM-safe hard reset: remove "light status bar" flags (which make dark icons).
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      WindowInsetsController insetsController = window.getInsetsController();
      if (insetsController != null) {
        insetsController.setSystemBarsAppearance(
          0,
          WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
            | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
        );
      }
    } else {
      View decorView = window.getDecorView();
      int flags = decorView.getSystemUiVisibility();
      flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
      }
      decorView.setSystemUiVisibility(flags);
    }

    WindowInsetsControllerCompat controller =
      WindowCompat.getInsetsController(window, window.getDecorView());
    if (controller != null) {
      // false = light icons/text over dark system bar background.
      controller.setAppearanceLightStatusBars(false);
      controller.setAppearanceLightNavigationBars(false);
    }
  }

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    applySystemBarsTheme();
  }

  @Override
  public void onResume() {
    super.onResume();
    applySystemBarsTheme();
  }

  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    if (hasFocus) {
      applySystemBarsTheme();
    }
  }
}
