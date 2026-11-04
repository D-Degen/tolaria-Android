package md.tolaria.workspaceaccess

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.documentfile.provider.DocumentFile
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.nio.file.Files
import java.nio.file.LinkOption

interface ExternalWorkspaceTree {
  fun snapshot(): Map<String, String>
  fun fingerprint(path: String): String?
  fun readBytes(path: String): ByteArray
  fun createDirectory(path: String)
  fun writeBytes(path: String, data: ByteArray)
  fun remove(path: String, expected: String?)
}

fun applyWorkspaceTreeDiff(
  target: ExternalWorkspaceTree,
  desired: Map<String, String>,
  previous: Map<String, String>,
  source: ExternalWorkspaceTree
) {
  val removals = previous.keys
    .filter { needsRemoval(previous[it], desired[it]) }
    .sortedByDescending { it.length }

  for (path in removals) {
    if (target.fingerprint(path) != previous[path]) {
      throw WorkspaceAccessException.LinkedConflict()
    }
    target.remove(path, previous[path])
  }

  for (path in desired.keys.sorted()) {
    if (previous[path] == desired[path]) continue
    val value = desired[path] ?: continue
    val expected = if (removals.contains(path)) null else previous[path]
    if (target.fingerprint(path) != expected) {
      throw WorkspaceAccessException.LinkedConflict()
    }
    if (value == "directory") {
      target.createDirectory(path)
    } else {
      val data = source.readBytes(path)
      if (sha256Hex(data) != value) {
        throw WorkspaceAccessException.LinkedConflict()
      }
      target.writeBytes(path, data)
    }
  }
}

private fun needsRemoval(previous: String?, desired: String?): Boolean {
  return desired == null || (previous == "directory") != (desired == "directory")
}

class LocalWorkspaceTree(private val root: File) : ExternalWorkspaceTree {
  override fun snapshot(): Map<String, String> {
    requireWorkspaceMutationRoot(root)
    val result = mutableMapOf<String, String>()
    walkLocal(root, "", result)
    return result
  }

  private fun walkLocal(dir: File, prefix: String, result: MutableMap<String, String>) {
    val children = dir.listFiles()?.sortedBy { it.name } ?: return
    for (child in children) {
      val nameLower = child.name.lowercase()
      if (skippedNames.contains(nameLower)) continue
      val rel = if (prefix.isEmpty()) child.name else "$prefix/${child.name}"
      val fp = fingerprint(rel)
      if (fp != null) {
        result[rel] = fp
        if (fp == "directory") {
          walkLocal(child, rel, result)
        }
      }
    }
  }

  override fun fingerprint(path: String): String? {
    val file = resolveWorkspaceFile(root, path)
    val nioPath = file.toPath()
    if (!Files.exists(nioPath, LinkOption.NOFOLLOW_LINKS)) return null
    if (Files.isSymbolicLink(nioPath)) throw WorkspaceAccessException.SymbolicLink()
    if (Files.isDirectory(nioPath, LinkOption.NOFOLLOW_LINKS)) return "directory"
    if (!Files.isRegularFile(nioPath, LinkOption.NOFOLLOW_LINKS)) {
      throw WorkspaceAccessException.InvalidPath()
    }
    return sha256Hex(file.readBytes())
  }

  override fun readBytes(path: String): ByteArray {
    val file = resolveWorkspaceFile(root, path)
    if (!file.exists() || !file.isFile) {
      throw WorkspaceAccessException.LinkedConflict()
    }
    return file.readBytes()
  }

  override fun createDirectory(path: String) {
    val dir = resolveWorkspaceFile(root, path)
    if (!dir.exists() && !dir.mkdirs()) {
      throw WorkspaceAccessException.CoordinationFailed()
    }
  }

  override fun writeBytes(path: String, data: ByteArray) {
    val destination = resolveWorkspaceFile(root, path)
    writeAtomicFile(destination, data)
  }

  override fun remove(path: String, expected: String?) {
    val file = resolveWorkspaceFile(root, path)
    if (!file.exists()) return
    if (expected == "directory") {
      val remaining = file.listFiles()
      if (!remaining.isNullOrEmpty()) {
        throw WorkspaceAccessException.LinkedConflict()
      }
    }
    if (!file.delete()) {
      throw WorkspaceAccessException.CoordinationFailed()
    }
  }

  companion object {
    val skippedNames = setOf(".git", "node_modules", ".ds_store")
  }
}

class SafWorkspaceTree(
  private val context: Context,
  private val treeUri: Uri
) : ExternalWorkspaceTree {
  private fun rootDocument(): DocumentFile {
    val doc = DocumentFile.fromTreeUri(context, treeUri)
    if (doc == null || !doc.exists() || !doc.isDirectory || !doc.canRead()) {
      throw WorkspaceAccessException.MissingRoot()
    }
    return doc
  }

  override fun snapshot(): Map<String, String> {
    val rootDoc = rootDocument()
    val result = mutableMapOf<String, String>()
    walkSaf(rootDoc, "", result)
    return result
  }

  private fun walkSaf(dirDoc: DocumentFile, prefix: String, result: MutableMap<String, String>) {
    val children = dirDoc.listFiles().sortedBy { it.name ?: "" }
    for (child in children) {
      val name = child.name ?: continue
      if (LocalWorkspaceTree.skippedNames.contains(name.lowercase())) continue
      val rel = if (prefix.isEmpty()) name else "$prefix/$name"
      if (child.isDirectory) {
        result[rel] = "directory"
        walkSaf(child, rel, result)
      } else if (child.isFile) {
        val bytes = readDocumentBytes(child.uri)
        result[rel] = sha256Hex(bytes)
      }
    }
  }

  override fun fingerprint(path: String): String? {
    val parts = validateRelativeWorkspacePath(path)
    val doc = findDocument(rootDocument(), parts) ?: return null
    if (doc.isDirectory) return "directory"
    if (doc.isFile) return sha256Hex(readDocumentBytes(doc.uri))
    return null
  }

  override fun readBytes(path: String): ByteArray {
    val parts = validateRelativeWorkspacePath(path)
    val doc = findDocument(rootDocument(), parts)
      ?: throw WorkspaceAccessException.LinkedConflict()
    if (!doc.isFile) throw WorkspaceAccessException.LinkedConflict()
    return readDocumentBytes(doc.uri)
  }

  override fun createDirectory(path: String) {
    val parts = validateRelativeWorkspacePath(path)
    ensureDirectoryChain(rootDocument(), parts)
  }

  override fun writeBytes(path: String, data: ByteArray) {
    val parts = validateRelativeWorkspacePath(path)
    val parentParts = parts.dropLast(1)
    val fileName = parts.last()
    val parentDoc = ensureDirectoryChain(rootDocument(), parentParts)
    var targetDoc = parentDoc.findFile(fileName)
    if (targetDoc != null && targetDoc.isDirectory) {
      throw WorkspaceAccessException.LinkedConflict()
    }
    if (targetDoc == null) {
      targetDoc = parentDoc.createFile("application/octet-stream", fileName)
        ?: throw WorkspaceAccessException.CoordinationFailed()
    }
    val out = context.contentResolver.openOutputStream(targetDoc.uri, "wt")
      ?: context.contentResolver.openOutputStream(targetDoc.uri)
      ?: throw WorkspaceAccessException.CoordinationFailed()
    out.use { stream ->
      stream.write(data)
      stream.flush()
    }
  }

  override fun remove(path: String, expected: String?) {
    val parts = validateRelativeWorkspacePath(path)
    val doc = findDocument(rootDocument(), parts) ?: return
    if (expected == "directory" && doc.isDirectory) {
      if (doc.listFiles().isNotEmpty()) {
        throw WorkspaceAccessException.LinkedConflict()
      }
    }
    if (!doc.delete()) {
      throw WorkspaceAccessException.CoordinationFailed()
    }
  }

  private fun findDocument(rootDoc: DocumentFile, parts: List<String>): DocumentFile? {
    var current: DocumentFile = rootDoc
    for (part in parts) {
      current = current.findFile(part) ?: return null
    }
    return current
  }

  private fun ensureDirectoryChain(rootDoc: DocumentFile, parts: List<String>): DocumentFile {
    var current = rootDoc
    for (part in parts) {
      val existing = current.findFile(part)
      current = if (existing != null) {
        if (!existing.isDirectory) throw WorkspaceAccessException.LinkedConflict()
        existing
      } else {
        current.createDirectory(part) ?: throw WorkspaceAccessException.CoordinationFailed()
      }
    }
    return current
  }

  private fun readDocumentBytes(uri: Uri): ByteArray {
    val input = context.contentResolver.openInputStream(uri)
      ?: throw WorkspaceAccessException.CoordinationFailed()
    return input.use { it.readBytes() }
  }
}

class LinkedWorkspacePlan(
  base: Map<String, String>,
  local: Map<String, String>,
  external: Map<String, String>
) {
  val merged: Map<String, String>

  init {
    val allPaths = (base.keys + local.keys + external.keys).toSet()
    val result = mutableMapOf<String, String>()
    for (path in allPaths) {
      if (path.isEmpty()) throw WorkspaceAccessException.InvalidState()
      val entry = mergedEntry(base[path], local[path], external[path])
      if (entry != null) {
        result[path] = entry
      }
    }
    requireMergedParents(result)
    merged = result
  }

  private fun mergedEntry(base: String?, local: String?, external: String?): String? {
    if (local == external) return local
    if (local == base) return external
    if (external == base) return local
    throw WorkspaceAccessException.LinkedConflict()
  }

  private fun requireMergedParents(entries: Map<String, String>) {
    for (path in entries.keys) {
      val parts = path.split("/")
      for (count in 1 until parts.size) {
        val parent = parts.take(count).joinToString("/")
        if (entries[parent] != "directory") {
          throw WorkspaceAccessException.LinkedConflict()
        }
      }
    }
  }
}

data class LinkedConflictOrigin(val remote: Boolean, val path: String)

class LinkedConflictPlan(
  val base: Map<String, String>,
  val local: Map<String, String>,
  val remote: Map<String, String>,
  val choices: Map<String, String> = emptyMap()
) {
  val merged = mutableMapOf<String, String>()
  val origins = mutableMapOf<String, LinkedConflictOrigin>()
  val conflicts = mutableListOf<String>()

  init {
    visitChildren("")
  }

  private fun visitChildren(prefix: String) {
    val allPaths = (base.keys + local.keys + remote.keys).toSet()
    val names = allPaths
      .filter { it.startsWith(prefix) }
      .mapNotNull { it.removePrefix(prefix).split("/").firstOrNull()?.takeIf { s -> s.isNotEmpty() } }
      .toSet()
    val occupied = names.toMutableSet()
    for (name in names.sorted()) {
      visit(prefix + name, occupied)
    }
  }

  private fun visit(path: String, occupied: MutableSet<String>) {
    if (path.split("/").size >= 128) throw WorkspaceAccessException.InvalidState()
    val left = subtree(local, path)
    val right = subtree(remote, path)
    val ancestor = subtree(base, path)
    if (left == right || right == ancestor) {
      copySubtree(left, path, path, remote = false)
      return
    }
    if (left == ancestor) {
      copySubtree(right, path, path, remote = true)
      return
    }
    if (local[path] == "directory" && remote[path] == "directory" &&
        (base[path] == null || base[path] == "directory")
    ) {
      merged[path] = "directory"
      origins[path] = LinkedConflictOrigin(remote = false, path = path)
      visitChildren("$path/")
      return
    }
    conflicts.add(path)
    choose(path, left, right, occupied)
  }

  private fun choose(
    path: String,
    left: Map<String, String>,
    right: Map<String, String>,
    occupied: MutableSet<String>
  ) {
    when (choices[path]) {
      "remote" -> copySubtree(right, path, path, remote = true)
      "both" -> {
        copySubtree(left, path, path, remote = false)
        val destination = if (left.isEmpty()) path else conflictName(path, occupied)
        copySubtree(right, path, destination, remote = true)
      }
      null, "local" -> copySubtree(left, path, path, remote = false)
      else -> throw WorkspaceAccessException.InvalidState()
    }
  }

  private fun copySubtree(
    entries: Map<String, String>,
    from: String,
    to: String,
    remote: Boolean
  ) {
    for ((p, value) in entries) {
      val dest = to + p.removePrefix(from)
      merged[dest] = value
      origins[dest] = LinkedConflictOrigin(remote = remote, path = p)
    }
  }

  private fun subtree(entries: Map<String, String>, path: String): Map<String, String> {
    return entries.filter { (k, _) -> k == path || k.startsWith("$path/") }
  }

  private fun conflictName(path: String, occupied: MutableSet<String>): String {
    val f = File(path)
    val name = f.name
    val ext = f.extension
    val suffix = if (ext.isEmpty()) "" else ".$ext"
    val stem = name.removeSuffix(suffix)
    var index = 1
    var candidate = "$stem (conflict $index)$suffix"
    while (occupied.contains(candidate)) {
      index += 1
      candidate = "$stem (conflict $index)$suffix"
    }
    occupied.add(candidate)
    return path.dropLast(name.length) + candidate
  }
}

class LinkedWorkspaceStore(private val context: Context) {
  fun session(uriString: String): LinkedWorkspaceSession {
    val (cacheDir, relativeKey) = resolveManagedWorkspaceRoot(context, uriString)
    val key = sha256Hex(relativeKey.toByteArray(Charsets.UTF_8))
    val stateDir = File(context.filesDir, "TolariaLinkedFolders")
    val stateFile = File(stateDir, "$key.json")
    return LinkedWorkspaceSession(context = context, cacheDir = cacheDir, stateFile = stateFile)
  }

  fun connect(sourceUri: Uri, cacheDir: File): String {
    val session = session(cacheDir.toURI().toString())
    session.connect(sourceUri)
    return WorkspaceFileIndex(root = cacheDir).json()
  }

  fun sync(uriString: String): Map<String, Boolean> {
    val session = session(uriString)
    if (!session.isLinked) {
      return mapOf("linked" to false, "changed" to false, "conflict" to false)
    }
    managedWorkspaceText(context, uriString).recover()
    return try {
      val changed = session.sync()
      mapOf("linked" to true, "changed" to changed, "conflict" to false)
    } catch (_: WorkspaceAccessException.LinkedConflict) {
      mapOf("linked" to true, "changed" to true, "conflict" to true)
    }
  }
}

class LinkedWorkspaceSession(
  private val context: Context,
  val cacheDir: File,
  private val stateFile: File
) {
  val isLinked: Boolean get() = stateFile.exists()

  fun connect(sourceUri: Uri) {
    withWorkspaceMutationLock {
      if (isLinked || cacheDir.exists()) {
        throw WorkspaceAccessException.InvalidState()
      }
      if (sourceUri.scheme == "content") {
        try {
          val flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
          context.contentResolver.takePersistableUriPermission(sourceUri, flags)
        } catch (_: Throwable) {
          // Non-persistable URI in tests or synthetic providers continues if readable
        }
      }
      val external = createExternalTree(sourceUri)
      val entries = external.snapshot()
      cacheDir.mkdirs()
      val local = LocalWorkspaceTree(cacheDir)
      applyWorkspaceTreeDiff(local, entries, emptyMap(), external)
      saveState(sourceUri.toString(), entries)
    }
  }

  fun sync(): Boolean {
    return withWorkspaceMutationLock {
      val (sourceUriStr, baseline) = loadState()
      val external = createExternalTree(Uri.parse(sourceUriStr))
      val local = LocalWorkspaceTree(cacheDir)
      val before = local.snapshot()
      val remote = external.snapshot()
      val plan = LinkedWorkspacePlan(base = baseline, local = before, external = remote)
      applyWorkspaceTreeDiff(external, plan.merged, remote, local)
      applyWorkspaceTreeDiff(local, plan.merged, before, external)
      saveState(sourceUriStr, plan.merged)
      before != plan.merged
    }
  }

  fun reviewConflicts(): String {
    return withWorkspaceMutationLock {
      val (sourceUriStr, baseline) = loadState()
      val external = createExternalTree(Uri.parse(sourceUriStr))
      val local = LocalWorkspaceTree(cacheDir)
      val before = local.snapshot()
      val remote = external.snapshot()
      val plan = LinkedConflictPlan(base = baseline, local = before, remote = remote)
      val filesArray = JSONArray()
      for (path in plan.conflicts) {
        val fileObj = JSONObject().apply {
          put("path", path)
          put("local", buildConflictPreview(local, path))
          put("remote", buildConflictPreview(external, path))
        }
        filesArray.put(fileObj)
      }
      JSONObject().apply {
        put("base", mapToJson(baseline))
        put("local", mapToJson(before))
        put("remote", mapToJson(remote))
        put("files", filesArray)
      }.toString()
    }
  }

  fun resolveConflicts(reviewJson: String, choices: Map<String, String>): Boolean {
    return withWorkspaceMutationLock {
      val (sourceUriStr, baseline) = loadState()
      val external = createExternalTree(Uri.parse(sourceUriStr))
      val local = LocalWorkspaceTree(cacheDir)
      val currentLocal = local.snapshot()
      val currentRemote = external.snapshot()

      val review = try {
        JSONObject(reviewJson)
      } catch (_: Throwable) {
        throw WorkspaceAccessException.InvalidState()
      }
      val reviewBase = jsonToMap(review.getJSONObject("base"))
      val reviewLocal = jsonToMap(review.getJSONObject("local"))
      val reviewRemote = jsonToMap(review.getJSONObject("remote"))

      if (baseline != reviewBase || currentLocal != reviewLocal || currentRemote != reviewRemote) {
        return@withWorkspaceMutationLock false
      }

      val plan = LinkedConflictPlan(
        base = reviewBase,
        local = reviewLocal,
        remote = reviewRemote,
        choices = choices
      )
      if (!plan.conflicts.all { choices.containsKey(it) }) {
        throw WorkspaceAccessException.InvalidState()
      }

      try {
        applyResolvedPlan(local, currentLocal, external, currentRemote, plan)
        saveState(sourceUriStr, plan.merged)
        true
      } catch (_: WorkspaceAccessException.LinkedConflict) {
        false
      }
    }
  }

  private fun applyResolvedPlan(
    local: LocalWorkspaceTree,
    previousLocal: Map<String, String>,
    remote: ExternalWorkspaceTree,
    previousRemote: Map<String, String>,
    plan: LinkedConflictPlan
  ) {
    // Stage required bytes in memory before mutating either side
    val stagedBytes = mutableMapOf<String, ByteArray>()
    for ((destPath, value) in plan.merged) {
      if (value == "directory") continue
      val origin = plan.origins[destPath] ?: throw WorkspaceAccessException.InvalidState()
      val sourceTree = if (origin.remote) remote else local
      val bytes = sourceTree.readBytes(origin.path)
      if (sha256Hex(bytes) != value) {
        throw WorkspaceAccessException.LinkedConflict()
      }
      stagedBytes[destPath] = bytes
    }

    val memorySource = object : ExternalWorkspaceTree {
      override fun snapshot(): Map<String, String> = plan.merged
      override fun fingerprint(path: String): String? = plan.merged[path]
      override fun readBytes(path: String): ByteArray =
        stagedBytes[path] ?: throw WorkspaceAccessException.LinkedConflict()
      override fun createDirectory(path: String) {}
      override fun writeBytes(path: String, data: ByteArray) {}
      override fun remove(path: String, expected: String?) {}
    }

    applyWorkspaceTreeDiff(remote, plan.merged, previousRemote, memorySource)
    applyWorkspaceTreeDiff(local, plan.merged, previousLocal, memorySource)
  }

  private fun buildConflictPreview(tree: ExternalWorkspaceTree, path: String): JSONObject {
    val fp = tree.fingerprint(path)
    if (fp == null) {
      return JSONObject().apply {
        put("kind", "deleted")
        put("text", "")
        put("truncated", false)
      }
    }
    if (fp == "directory") {
      return JSONObject().apply {
        put("kind", "binary")
        put("text", "")
        put("truncated", false)
      }
    }
    val bytes = tree.readBytes(path)
    if (bytes.contains(0.toByte())) {
      return JSONObject().apply {
        put("kind", "binary")
        put("text", "")
        put("truncated", false)
      }
    }
    val text = try {
      String(bytes, Charsets.UTF_8)
    } catch (_: Throwable) {
      return JSONObject().apply {
        put("kind", "binary")
        put("text", "")
        put("truncated", false)
      }
    }
    val truncated = text.length > 32000
    return JSONObject().apply {
      put("kind", "text")
      put("text", if (truncated) text.substring(0, 32000) else text)
      put("truncated", truncated)
    }
  }

  private fun createExternalTree(uri: Uri): ExternalWorkspaceTree {
    return when (uri.scheme) {
      "file" -> {
        val path = uri.path ?: throw WorkspaceAccessException.InvalidPath()
        LocalWorkspaceTree(File(path))
      }
      "content" -> SafWorkspaceTree(context, uri)
      else -> throw WorkspaceAccessException.InvalidPath()
    }
  }

  private fun loadState(): Pair<String, Map<String, String>> {
    if (!stateFile.exists()) throw WorkspaceAccessException.InvalidState()
    val obj = try {
      JSONObject(stateFile.readText(Charsets.UTF_8))
    } catch (_: Throwable) {
      throw WorkspaceAccessException.InvalidState()
    }
    if (obj.optInt("version", 0) != 1) throw WorkspaceAccessException.InvalidState()
    val sourceUri = obj.optString("sourceUri", "")
    if (sourceUri.isEmpty()) throw WorkspaceAccessException.InvalidState()
    val baselineObj = obj.optJSONObject("baseline") ?: JSONObject()
    return Pair(sourceUri, jsonToMap(baselineObj))
  }

  private fun saveState(sourceUri: String, baseline: Map<String, String>) {
    val obj = JSONObject().apply {
      put("version", 1)
      put("sourceUri", sourceUri)
      put("baseline", mapToJson(baseline))
    }
    writeAtomicFile(stateFile, obj.toString().toByteArray(Charsets.UTF_8))
  }

  private fun mapToJson(map: Map<String, String>): JSONObject {
    val obj = JSONObject()
    for ((k, v) in map) {
      obj.put(k, v)
    }
    return obj
  }

  private fun jsonToMap(obj: JSONObject): Map<String, String> {
    val map = mutableMapOf<String, String>()
    val keys = obj.keys()
    while (keys.hasNext()) {
      val k = keys.next()
      map[k] = obj.optString(k, "")
    }
    return map
  }
}
