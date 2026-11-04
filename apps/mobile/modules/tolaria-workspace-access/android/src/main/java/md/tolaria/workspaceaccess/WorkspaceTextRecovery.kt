package md.tolaria.workspaceaccess

import android.content.Context
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.nio.file.Files
import java.nio.file.LinkOption
import java.nio.file.StandardCopyOption
import java.util.UUID

data class WorkspaceTextChange(
  val path: String,
  val content: String
) {
  val contentBytes: ByteArray get() = content.toByteArray(Charsets.UTF_8)
  val digest: String get() = sha256Hex(contentBytes)
}

data class WorkspaceEntryChange(
  val path: String,
  val toPath: String?,
  val directory: Boolean,
  val identifier: String = UUID.randomUUID().toString()
)

class WorkspaceTextRecovery(
  val root: File,
  private val journalFile: File
) {
  private val receiptFile: File get() = File(journalFile.parentFile, "${journalFile.name}.completed")
  private val entryJournalFile: File get() = File(journalFile.parentFile, "${journalFile.name}.entry")
  private val entryReceiptFile: File get() = File(journalFile.parentFile, "${journalFile.name}.entry.completed")
  private val removedStagingDir: File get() = File(journalFile.parentFile, "${journalFile.name}.entry.removed")

  fun write(path: String, content: String, identifier: String = UUID.randomUUID().toString()) {
    writeBatch(listOf(WorkspaceTextChange(path, content)), identifier)
  }

  fun writeBatch(changes: List<WorkspaceTextChange>, identifier: String) {
    withWorkspaceMutationLock {
      recover()
      requireWorkspaceMutationRoot(root)
      validateTextBatchPaths(changes.map { it.path })
      if (isCompletedBatch(changes, identifier)) {
        return@withWorkspaceMutationLock
      }

      val entriesJson = JSONArray()
      for (change in changes) {
        val destination = resolveWorkspaceFile(root, change.path)
        val beforeDigest = existingFileDigest(destination)
        val entryObj = JSONObject()
        entryObj.put("path", change.path)
        entryObj.put("before", beforeDigest ?: JSONObject.NULL)
        entryObj.put("contentBase64", Base64.encodeToString(change.contentBytes, Base64.NO_WRAP))
        entryObj.put("afterDigest", change.digest)
        entriesJson.put(entryObj)
      }

      val pendingJson = JSONObject()
      pendingJson.put("version", 1)
      pendingJson.put("identifier", identifier)
      pendingJson.put("entries", entriesJson)

      writeAtomicFile(journalFile, pendingJson.toString().toByteArray(Charsets.UTF_8))
      completePendingBatch(pendingJson)
    }
  }

  fun recover(): Boolean {
    return withWorkspaceMutationLock {
      val recoveredEntry = recoverEntryIfNeeded()
      if (!journalFile.exists()) {
        return@withWorkspaceMutationLock recoveredEntry
      }
      val pendingJson = try {
        JSONObject(journalFile.readText(Charsets.UTF_8))
      } catch (_: Throwable) {
        throw WorkspaceAccessException.InvalidRecord()
      }
      if (pendingJson.optInt("version", 0) != 1) {
        throw WorkspaceAccessException.InvalidRecord()
      }
      requireWorkspaceMutationRoot(root)
      val entries = pendingJson.optJSONArray("entries") ?: throw WorkspaceAccessException.InvalidRecord()
      val paths = mutableListOf<String>()
      for (i in 0 until entries.length()) {
        paths.add(entries.getJSONObject(i).optString("path", ""))
      }
      validateTextBatchPaths(paths)
      completePendingBatch(pendingJson)
      true
    }
  }

  fun changeEntry(change: WorkspaceEntryChange) {
    withWorkspaceMutationLock {
      recover()
      requireWorkspaceMutationRoot(root)
      if (isCompletedEntryChange(change)) {
        return@withWorkspaceMutationLock
      }
      val source = resolveWorkspaceFile(root, change.path)
      val destination = destinationForEntryChange(change)
      val beforeFp = computeEntryFingerprint(source)
      if (beforeFp == null) {
        if (change.toPath != null) {
          throw WorkspaceAccessException.InvalidPath("fileReadNoSuchFile")
        }
        return@withWorkspaceMutationLock
      }
      if (beforeFp.optBoolean("directory") != change.directory) {
        throw WorkspaceAccessException.InvalidPath()
      }
      if (source.canonicalPath == destination.canonicalPath) {
        return@withWorkspaceMutationLock
      }
      if (computeEntryFingerprint(destination) != null) {
        throw WorkspaceAccessException.InvalidPath("fileWriteFileExists")
      }

      val pending = JSONObject().apply {
        put("version", 1)
        put("path", change.path)
        put("toPath", change.toPath ?: JSONObject.NULL)
        put("directory", change.directory)
        put("identifier", change.identifier)
        put("before", beforeFp)
      }
      writeAtomicFile(entryJournalFile, pending.toString().toByteArray(Charsets.UTF_8))
      completePendingEntryChange(pending)
    }
  }

  private fun recoverEntryIfNeeded(): Boolean {
    if (!entryJournalFile.exists()) {
      cleanRemovedStaging()
      return false
    }
    val pending = try {
      JSONObject(entryJournalFile.readText(Charsets.UTF_8))
    } catch (_: Throwable) {
      throw WorkspaceAccessException.InvalidRecord()
    }
    if (pending.optInt("version", 0) != 1) {
      throw WorkspaceAccessException.InvalidRecord()
    }
    requireWorkspaceMutationRoot(root)
    completePendingEntryChange(pending)
    return true
  }

  private fun completePendingEntryChange(pending: JSONObject) {
    val path = pending.getString("path")
    val toPath = if (pending.isNull("toPath")) null else pending.getString("toPath")
    val directory = pending.getBoolean("directory")
    val identifier = pending.getString("identifier")
    val before = pending.getJSONObject("before")

    val change = WorkspaceEntryChange(path = path, toPath = toPath, directory = directory, identifier = identifier)
    val source = resolveWorkspaceFile(root, change.path)
    val destination = destinationForEntryChange(change)

    val currentFp = computeEntryFingerprint(source)
    val targetFp = computeEntryFingerprint(destination)

    if (currentFp == null && targetFp != null && fingerprintsEqual(targetFp, before)) {
      // Already relocated in previous interrupted attempt
    } else if (currentFp != null && fingerprintsEqual(currentFp, before) && targetFp == null) {
      destination.parentFile?.mkdirs()
      try {
        Files.move(source.toPath(), destination.toPath(), StandardCopyOption.ATOMIC_MOVE)
      } catch (_: Throwable) {
        Files.move(source.toPath(), destination.toPath())
      }
    } else {
      throw WorkspaceAccessException.ExternalChange()
    }

    writeAtomicFile(entryReceiptFile, pending.toString().toByteArray(Charsets.UTF_8))
    entryJournalFile.delete()
    cleanRemovedStaging()
  }

  private fun isCompletedEntryChange(change: WorkspaceEntryChange): Boolean {
    if (!entryReceiptFile.exists()) return false
    val completed = try {
      JSONObject(entryReceiptFile.readText(Charsets.UTF_8))
    } catch (_: Throwable) {
      throw WorkspaceAccessException.InvalidRecord()
    }
    if (completed.optInt("version", 0) != 1) throw WorkspaceAccessException.InvalidRecord()
    if (completed.optString("identifier") != change.identifier) return false
    val samePath = completed.optString("path") == change.path
    val completedToPath = if (completed.isNull("toPath")) null else completed.optString("toPath")
    val sameToPath = completedToPath == change.toPath
    val sameDir = completed.optBoolean("directory") == change.directory
    if (!samePath || !sameToPath || !sameDir) {
      throw WorkspaceAccessException.InvalidRecord()
    }
    return true
  }

  private fun destinationForEntryChange(change: WorkspaceEntryChange): File {
    val toPath = change.toPath ?: return removedStagingDir
    if (toPath.startsWith(change.path + "/")) {
      throw WorkspaceAccessException.InvalidPath()
    }
    return resolveWorkspaceFile(root, toPath)
  }

  private fun cleanRemovedStaging() {
    if (removedStagingDir.exists()) {
      removedStagingDir.deleteRecursively()
    }
  }

  private fun computeEntryFingerprint(file: File): JSONObject? {
    val path = file.toPath()
    if (!Files.exists(path, LinkOption.NOFOLLOW_LINKS)) return null
    if (Files.isSymbolicLink(path)) throw WorkspaceAccessException.SymbolicLink()
    val isDir = Files.isDirectory(path, LinkOption.NOFOLLOW_LINKS)
    val items = JSONObject()
    if (isDir) {
      collectDirectoryFingerprints(file, "", items)
    } else if (Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS)) {
      items.put("", sha256Hex(file.readBytes()))
    } else {
      throw WorkspaceAccessException.InvalidPath()
    }
    return JSONObject().apply {
      put("directory", isDir)
      put("items", items)
    }
  }

  private fun collectDirectoryFingerprints(dir: File, prefix: String, items: JSONObject) {
    val children = dir.listFiles()?.sortedBy { it.name } ?: return
    for (child in children) {
      val cPath = child.toPath()
      if (Files.isSymbolicLink(cPath)) throw WorkspaceAccessException.SymbolicLink()
      val rel = if (prefix.isEmpty()) child.name else "$prefix/${child.name}"
      if (Files.isDirectory(cPath, LinkOption.NOFOLLOW_LINKS)) {
        items.put(rel, "directory")
        collectDirectoryFingerprints(child, rel, items)
      } else if (Files.isRegularFile(cPath, LinkOption.NOFOLLOW_LINKS)) {
        items.put(rel, sha256Hex(child.readBytes()))
      }
    }
  }

  private fun fingerprintsEqual(a: JSONObject, b: JSONObject): Boolean {
    if (a.optBoolean("directory") != b.optBoolean("directory")) return false
    val aItems = a.optJSONObject("items") ?: return false
    val bItems = b.optJSONObject("items") ?: return false
    if (aItems.length() != bItems.length()) return false
    val keys = aItems.keys()
    while (keys.hasNext()) {
      val k = keys.next()
      if (!bItems.has(k) || aItems.optString(k) != bItems.optString(k)) return false
    }
    return true
  }

  private fun completePendingBatch(pendingJson: JSONObject) {
    val entries = pendingJson.getJSONArray("entries")
    // Phase 1: Verify all targets match expected `before` or already-applied `afterDigest`
    for (i in 0 until entries.length()) {
      val entry = entries.getJSONObject(i)
      val path = entry.getString("path")
      val before = if (entry.isNull("before")) null else entry.getString("before")
      val afterDigest = entry.getString("afterDigest")
      val destination = resolveWorkspaceFile(root, path)
      val currentDigest = existingFileDigest(destination)
      if (currentDigest != before && currentDigest != afterDigest) {
        throw WorkspaceAccessException.ExternalChange()
      }
    }

    // Phase 2: Replace each target atomically
    for (i in 0 until entries.length()) {
      val entry = entries.getJSONObject(i)
      val path = entry.getString("path")
      val before = if (entry.isNull("before")) null else entry.getString("before")
      val afterDigest = entry.getString("afterDigest")
      val contentBytes = Base64.decode(entry.getString("contentBase64"), Base64.NO_WRAP)
      val destination = resolveWorkspaceFile(root, path)
      val currentDigest = existingFileDigest(destination)
      if (currentDigest == afterDigest) {
        continue
      }
      if (currentDigest != before) {
        throw WorkspaceAccessException.ExternalChange()
      }
      destination.parentFile?.mkdirs()
      resolveWorkspaceFile(root, path)
      writeAtomicFile(destination, contentBytes)
    }

    // Phase 3: Record completion receipt and remove active journal
    val identifier = pendingJson.optString("identifier", "")
    if (identifier.isNotEmpty()) {
      val completedEntries = JSONArray()
      for (i in 0 until entries.length()) {
        val e = entries.getJSONObject(i)
        completedEntries.put(JSONObject().apply {
          put("path", e.getString("path"))
          put("digest", e.getString("afterDigest"))
        })
      }
      val receiptJson = JSONObject().apply {
        put("version", 1)
        put("identifier", identifier)
        put("entries", completedEntries)
      }
      writeAtomicFile(receiptFile, receiptJson.toString().toByteArray(Charsets.UTF_8))
    }
    journalFile.delete()
  }

  private fun isCompletedBatch(changes: List<WorkspaceTextChange>, identifier: String): Boolean {
    if (!receiptFile.exists()) return false
    val completed = try {
      JSONObject(receiptFile.readText(Charsets.UTF_8))
    } catch (_: Throwable) {
      throw WorkspaceAccessException.InvalidRecord()
    }
    if (completed.optInt("version", 0) != 1) throw WorkspaceAccessException.InvalidRecord()
    if (completed.optString("identifier") != identifier) return false
    val entries = completed.optJSONArray("entries") ?: throw WorkspaceAccessException.InvalidRecord()
    if (entries.length() != changes.size) {
      throw WorkspaceAccessException.InvalidRecord()
    }
    for (i in changes.indices) {
      val entry = entries.getJSONObject(i)
      if (entry.optString("path") != changes[i].path || entry.optString("digest") != changes[i].digest) {
        throw WorkspaceAccessException.InvalidRecord()
      }
    }
    return true
  }

  private fun existingFileDigest(file: File): String? {
    val path = file.toPath()
    if (!Files.exists(path, LinkOption.NOFOLLOW_LINKS)) return null
    if (Files.isSymbolicLink(path)) throw WorkspaceAccessException.SymbolicLink()
    if (!Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS)) {
      throw WorkspaceAccessException.InvalidPath()
    }
    return sha256Hex(file.readBytes())
  }

  private fun validateTextBatchPaths(paths: List<String>) {
    if (paths.isEmpty()) throw WorkspaceAccessException.InvalidPath()
    val seen = mutableSetOf<String>()
    for (p in paths) {
      validateRelativeWorkspacePath(p)
      if (!seen.add(p)) throw WorkspaceAccessException.InvalidPath()
    }
    val sorted = paths.sorted()
    for (i in 0 until sorted.size - 1) {
      if (sorted[i + 1].startsWith(sorted[i] + "/")) {
        throw WorkspaceAccessException.InvalidPath()
      }
    }
  }
}

fun writeAtomicFile(destination: File, bytes: ByteArray) {
  val parent = destination.parentFile ?: throw WorkspaceAccessException.InvalidPath()
  if (!parent.exists()) {
    parent.mkdirs()
  }
  val tempFile = File(parent, ".tolaria-tmp-${UUID.randomUUID()}")
  try {
    tempFile.writeBytes(bytes)
    try {
      Files.move(
        tempFile.toPath(),
        destination.toPath(),
        StandardCopyOption.ATOMIC_MOVE,
        StandardCopyOption.REPLACE_EXISTING
      )
    } catch (_: Throwable) {
      Files.move(
        tempFile.toPath(),
        destination.toPath(),
        StandardCopyOption.REPLACE_EXISTING
      )
    }
  } finally {
    if (tempFile.exists()) {
      tempFile.delete()
    }
  }
}

fun managedWorkspaceText(context: Context, uriString: String): WorkspaceTextRecovery {
  val (validatedRoot, relativeKeySource) = resolveManagedWorkspaceRoot(context, uriString)
  val key = sha256Hex(relativeKeySource.toByteArray(Charsets.UTF_8))
  val journalDir = File(context.filesDir, "TolariaWorkspaceWrites")
  val journal = File(journalDir, "$key.json")
  return WorkspaceTextRecovery(root = validatedRoot, journalFile = journal)
}
