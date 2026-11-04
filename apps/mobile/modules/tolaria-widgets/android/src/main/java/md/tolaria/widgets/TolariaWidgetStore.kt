package md.tolaria.widgets

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

data class TolariaChecklistItem(
  val id: String,
  val title: String,
  var done: Boolean = false,
  val due: String? = null,
  val noteId: String? = null,
  val line: Int? = null
)

object TolariaWidgetStore {
  private const val PREFS_NAME = "tolaria_widget_prefs"
  private const val KEY_CHECKLIST = "widget_checklist_json"

  fun getChecklistItems(context: Context): List<TolariaChecklistItem> {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val jsonString = prefs.getString(KEY_CHECKLIST, null)
    if (jsonString.isNullOrBlank()) {
      return getDefaultItems()
    }
    return try {
      val array = JSONArray(jsonString)
      val list = ArrayList<TolariaChecklistItem>(array.length())
      for (i in 0 until array.length()) {
        val obj = array.getJSONObject(i)
        list.add(
          TolariaChecklistItem(
            id = obj.optString("id", i.toString()),
            title = obj.optString("title", ""),
            done = obj.optBoolean("done", false),
            due = if (obj.has("due") && !obj.isNull("due")) obj.getString("due") else null,
            noteId = if (obj.has("noteId") && !obj.isNull("noteId")) obj.getString("noteId") else null,
            line = if (obj.has("line") && !obj.isNull("line")) obj.getInt("line") else null
          )
        )
      }
      list
    } catch (e: Exception) {
      getDefaultItems()
    }
  }

  fun saveChecklistItems(context: Context, items: List<TolariaChecklistItem>) {
    val array = JSONArray()
    for (item in items) {
      val obj = JSONObject().apply {
        put("id", item.id)
        put("title", item.title)
        put("done", item.done)
        put("due", item.due)
        put("noteId", item.noteId)
        put("line", item.line)
      }
      array.put(obj)
    }
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY_CHECKLIST, array.toString())
      .apply()
  }

  fun toggleChecklistItem(context: Context, id: String): Boolean {
    val items = getChecklistItems(context).toMutableList()
    val index = items.indexOfFirst { it.id == id }
    if (index >= 0) {
      val current = items[index]
      items[index] = current.copy(done = !current.done)
      saveChecklistItems(context, items)
      return true
    }
    return false
  }

  private fun getDefaultItems(): List<TolariaChecklistItem> {
    return listOf(
      TolariaChecklistItem(
        id = "sample_1",
        title = "Inbox sichten",
        done = false,
        due = "Heute",
        noteId = "Inbox.md"
      ),
      TolariaChecklistItem(
        id = "sample_2",
        title = "Wochenrückblick schreiben",
        done = false,
        due = "Morgen",
        noteId = "Weekly Review.md"
      ),
      TolariaChecklistItem(
        id = "sample_3",
        title = "Tolaria auf Android einrichten",
        done = true,
        noteId = "Tolaria Setup.md"
      )
    )
  }
}
