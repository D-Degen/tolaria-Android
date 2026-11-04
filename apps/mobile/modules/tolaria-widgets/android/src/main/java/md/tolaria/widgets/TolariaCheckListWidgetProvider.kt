package md.tolaria.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews

class TolariaCheckListWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    for (widgetId in appWidgetIds) {
      updateAppWidget(context, appWidgetManager, widgetId)
    }
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    when (intent.action) {
      ACTION_TOGGLE_ITEM -> {
        val itemId = intent.getStringExtra(EXTRA_ITEM_ID)
        if (itemId != null) {
          TolariaWidgetStore.toggleChecklistItem(context, itemId)
          notifyDataChanged(context)
        }
      }
      ACTION_ITEM_CLICK -> {
        val noteId = intent.getStringExtra(EXTRA_NOTE_ID) ?: "Inbox.md"
        val line = intent.getIntExtra(EXTRA_LINE, -1)
        val deepLinkUri = if (line >= 0) {
          "tolaria://open?noteId=${Uri.encode(noteId)}&line=$line&phoneState=editor"
        } else {
          "tolaria://open?noteId=${Uri.encode(noteId)}&phoneState=editor"
        }
        val appIntent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLinkUri)).apply {
          `package` = context.packageName
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        context.startActivity(appIntent)
      }
    }
  }

  companion object {
    const val ACTION_TOGGLE_ITEM = "md.tolaria.widgets.ACTION_TOGGLE_CHECKLIST_ITEM"
    const val ACTION_ITEM_CLICK = "md.tolaria.widgets.ACTION_ITEM_CLICK"
    const val EXTRA_ITEM_ID = "extra_item_id"
    const val EXTRA_NOTE_ID = "extra_note_id"
    const val EXTRA_LINE = "extra_line"

    fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
      val views = RemoteViews(context.packageName, R.layout.widget_check_list)

      val serviceIntent = Intent(context, TolariaCheckListWidgetService::class.java).apply {
        putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
        data = Uri.parse(toUri(Intent.URI_INTENT_SCHEME))
      }
      views.setRemoteAdapter(R.id.checklist_items, serviceIntent)
      views.setEmptyView(R.id.checklist_items, R.id.empty_view)

      views.setOnClickPendingIntent(
        R.id.btn_open_app,
        createDeepLinkPendingIntent(context, "tolaria://open", 201)
      )
      views.setOnClickPendingIntent(
        R.id.btn_add_task,
        createDeepLinkPendingIntent(context, "tolaria://open?action=new", 202)
      )

      val itemClickIntent = Intent(context, TolariaCheckListWidgetProvider::class.java)
      val itemClickPendingIntent = PendingIntent.getBroadcast(
        context,
        203,
        itemClickIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
      )
      views.setPendingIntentTemplate(R.id.checklist_items, itemClickPendingIntent)

      appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    fun notifyDataChanged(context: Context) {
      val appWidgetManager = AppWidgetManager.getInstance(context)
      val componentName = ComponentName(context, TolariaCheckListWidgetProvider::class.java)
      val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
      if (appWidgetIds != null && appWidgetIds.isNotEmpty()) {
        appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.checklist_items)
      }
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
