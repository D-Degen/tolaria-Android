package md.tolaria.widgets

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.UUID

class TolariaWidgetsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("TolariaWidgets")

    Function("updateChecklist") { items: List<Map<String, Any?>> ->
      val context = appContext.reactContext ?: return@Function false
      val checklistItems = items.map { map ->
        TolariaChecklistItem(
          id = map["id"] as? String ?: UUID.randomUUID().toString(),
          title = map["title"] as? String ?: "",
          done = map["done"] as? Boolean ?: false,
          due = map["due"] as? String,
          noteId = map["noteId"] as? String,
          line = (map["line"] as? Number)?.toInt()
        )
      }
      TolariaWidgetStore.saveChecklistItems(context, checklistItems)
      TolariaCheckListWidgetProvider.notifyDataChanged(context)
      true
    }

    Function("getChecklist") {
      val context = appContext.reactContext ?: return@Function emptyList<Map<String, Any?>>()
      TolariaWidgetStore.getChecklistItems(context).map { item ->
        mapOf(
          "id" to item.id,
          "title" to item.title,
          "done" to item.done,
          "due" to item.due,
          "noteId" to item.noteId,
          "line" to item.line
        )
      }
    }

    Function("reloadWidgets") {
      val context = appContext.reactContext ?: return@Function false
      TolariaCheckListWidgetProvider.notifyDataChanged(context)
      true
    }
  }
}
