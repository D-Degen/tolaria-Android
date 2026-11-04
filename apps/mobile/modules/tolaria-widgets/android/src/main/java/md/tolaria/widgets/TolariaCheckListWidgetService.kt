package md.tolaria.widgets

import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import android.widget.RemoteViewsService

class TolariaCheckListWidgetService : RemoteViewsService() {
  override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
    return TolariaCheckListRemoteViewsFactory(applicationContext, intent)
  }
}

class TolariaCheckListRemoteViewsFactory(
  private val context: Context,
  private val intent: Intent
) : RemoteViewsService.RemoteViewsFactory {

  private var items = listOf<TolariaChecklistItem>()

  override fun onCreate() {
    items = TolariaWidgetStore.getChecklistItems(context)
  }

  override fun onDataSetChanged() {
    items = TolariaWidgetStore.getChecklistItems(context)
  }

  override fun onDestroy() {}

  override fun getCount(): Int = items.size

  override fun getViewAt(position: Int): RemoteViews? {
    if (position !in items.indices) return null
    val item = items[position]

    val rv = RemoteViews(context.packageName, R.layout.widget_check_list_item)
    rv.setTextViewText(R.id.item_title, item.title)

    if (item.done) {
      rv.setImageViewResource(R.id.item_checkbox, R.drawable.ic_widget_check_box)
      rv.setTextColor(R.id.item_title, 0xFF8C959F.toInt())
    } else {
      rv.setImageViewResource(R.id.item_checkbox, R.drawable.ic_widget_check_box_outline)
      rv.setTextColor(R.id.item_title, 0xFF1F2328.toInt())
    }

    if (!item.due.isNullOrBlank()) {
      rv.setViewVisibility(R.id.item_due, View.VISIBLE)
      rv.setTextViewText(R.id.item_due, item.due)
    } else {
      rv.setViewVisibility(R.id.item_due, View.GONE)
    }

    // Checkbox toggle intent
    val toggleIntent = Intent().apply {
      action = TolariaCheckListWidgetProvider.ACTION_TOGGLE_ITEM
      putExtra(TolariaCheckListWidgetProvider.EXTRA_ITEM_ID, item.id)
    }
    rv.setOnClickFillInIntent(R.id.item_checkbox, toggleIntent)

    // Row / text click intent (opens note in Tolaria)
    val openIntent = Intent().apply {
      action = TolariaCheckListWidgetProvider.ACTION_ITEM_CLICK
      putExtra(TolariaCheckListWidgetProvider.EXTRA_ITEM_ID, item.id)
      putExtra(TolariaCheckListWidgetProvider.EXTRA_NOTE_ID, item.noteId ?: "Inbox.md")
      putExtra(TolariaCheckListWidgetProvider.EXTRA_LINE, item.line ?: -1)
    }
    rv.setOnClickFillInIntent(R.id.item_row, openIntent)

    return rv
  }

  override fun getLoadingView(): RemoteViews? = null
  override fun getViewTypeCount(): Int = 1
  override fun getItemId(position: Int): Long = items.getOrNull(position)?.id?.hashCode()?.toLong() ?: position.toLong()
  override fun hasStableIds(): Boolean = true
}
