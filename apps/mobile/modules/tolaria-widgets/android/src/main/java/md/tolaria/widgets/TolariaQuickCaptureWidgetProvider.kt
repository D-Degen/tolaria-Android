package md.tolaria.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews

class TolariaQuickCaptureWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    for (widgetId in appWidgetIds) {
      updateAppWidget(context, appWidgetManager, widgetId)
    }
  }

  companion object {
    fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
      val views = RemoteViews(context.packageName, R.layout.widget_quick_capture)

      views.setOnClickPendingIntent(R.id.btn_open_app, createDeepLinkPendingIntent(context, "tolaria://open", 101))
      views.setOnClickPendingIntent(R.id.btn_new_note, createDeepLinkPendingIntent(context, "tolaria://open?action=new", 102))
      views.setOnClickPendingIntent(R.id.btn_voice_note, createDeepLinkPendingIntent(context, "tolaria://open?action=voice", 103))
      views.setOnClickPendingIntent(R.id.btn_search, createDeepLinkPendingIntent(context, "tolaria://open?action=search", 104))
      views.setOnClickPendingIntent(R.id.btn_inbox, createDeepLinkPendingIntent(context, "tolaria://open?noteId=Inbox.md&phoneState=editor", 105))

      appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun createDeepLinkPendingIntent(context: Context, uriString: String, requestCode: Int): PendingIntent {
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uriString)).apply {
        `package` = context.packageName
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      }
      return PendingIntent.getActivity(
        context,
        requestCode,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }
  }
}
