package md.tolaria.workspaceaccess

import android.content.Context
import java.io.File
import java.net.URI
import java.nio.file.Files
import java.nio.file.LinkOption
import java.security.MessageDigest
import java.util.concurrent.locks.ReentrantLock

sealed class WorkspaceAccessException(message: String) : Exception(message) {
  class InvalidPath(detail: String = "invalidPath") : WorkspaceAccessException(detail)
  class ReservedPath : WorkspaceAccessException("reservedPath")
  class SymbolicLink : WorkspaceAccessException("symbolicLink")
  class ExternalChange : WorkspaceAccessException("externalChange")
  class CoordinationFailed : WorkspaceAccessException("coordinationFailed")
  class InvalidRecord : WorkspaceAccessException("invalidRecord")
  class CheckoutPending : WorkspaceAccessException("checkoutPending")
  class MissingRoot : WorkspaceAccessException("missingRoot")
  class LinkedConflict : WorkspaceAccessException("conflict")
  class InvalidState : WorkspaceAccessException("invalidState")
}

val workspaceMutationLock = ReentrantLock()

fun <T> withWorkspaceMutationLock(block: () -> T): T {
  workspaceMutationLock.lock()
  return try {
    block()
  } finally {
    workspaceMutationLock.unlock()
  }
}

fun sha256Hex(bytes: ByteArray): String {
  val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
  val sb = StringBuilder(digest.size * 2)
  for (b in digest) {
    sb.append(String.format("%02x", b.toInt() and 0xff))
  }
  return sb.toString()
}

fun validateRelativeWorkspacePath(path: String, allowGit: Boolean = false): List<String> {
  if (path.isEmpty() || path.startsWith("/") || path.contains("\\") || path.contains("\u0000")) {
    throw WorkspaceAccessException.InvalidPath()
  }
  val parts = path.split("/")
  for (part in parts) {
    if (part.isEmpty() || part == "." || part == "..") {
      throw WorkspaceAccessException.InvalidPath()
    }
    if (!allowGit && part.lowercase() == ".git") {
      throw WorkspaceAccessException.ReservedPath()
    }
  }
  return parts
}

fun rejectWorkspaceSymlink(file: File) {
  try {
    if (Files.isSymbolicLink(file.toPath())) {
      throw WorkspaceAccessException.SymbolicLink()
    }
  } catch (e: WorkspaceAccessException) {
    throw e
  } catch (_: Throwable) {
    // Non-existent path is allowed
  }
}

fun resolveWorkspaceFile(root: File, path: String, allowGit: Boolean = false): File {
  val parts = validateRelativeWorkspacePath(path, allowGit = allowGit)
  var current = root
  rejectWorkspaceSymlink(current)
  for (part in parts) {
    current = File(current, part)
    rejectWorkspaceSymlink(current)
  }
  return current
}

fun requireWorkspaceMutationRoot(root: File) {
  val path = root.toPath()
  if (!Files.exists(path, LinkOption.NOFOLLOW_LINKS) ||
      !Files.isDirectory(path, LinkOption.NOFOLLOW_LINKS) ||
      Files.isSymbolicLink(path)
  ) {
    throw WorkspaceAccessException.MissingRoot()
  }
  val checkoutMarker = File(File(root, ".git"), "tolaria-checkout.json")
  if (checkoutMarker.exists()) {
    throw WorkspaceAccessException.CheckoutPending()
  }
}

fun parseLocalFileUri(uriString: String): File {
  if (uriString.contains("\u0000") || uriString.contains("\\")) {
    throw WorkspaceAccessException.InvalidPath()
  }
  val uri = try {
    URI(uriString)
  } catch (_: Throwable) {
    throw WorkspaceAccessException.InvalidPath()
  }
  if (uri.scheme != "file") {
    throw WorkspaceAccessException.InvalidPath()
  }
  val authority = uri.authority
  if (!authority.isNullOrEmpty() && authority != "localhost") {
    throw WorkspaceAccessException.InvalidPath()
  }
  if (uri.rawQuery != null || uri.rawFragment != null || uri.rawUserInfo != null) {
    throw WorkspaceAccessException.InvalidPath()
  }
  val rawPath = uri.path ?: throw WorkspaceAccessException.InvalidPath()
  val segments = rawPath.trim('/').split('/')
  if (segments.any { it.isEmpty() || it == "." || it == ".." }) {
    throw WorkspaceAccessException.InvalidPath()
  }
  return File(rawPath)
}

fun resolveManagedWorkspaceRoot(context: Context, uriString: String): Pair<File, String> {
  val target = parseLocalFileUri(uriString)
  val allowedBases = listOfNotNull(
    context.filesDir,
    context.cacheDir,
    context.filesDir?.parentFile
  )
  val matchedBase = allowedBases.firstOrNull { base ->
    val prefix = base.absolutePath.trimEnd('/') + "/"
    target.absolutePath.startsWith(prefix) || target.CanonicalOrAbsoluteStartsWith(base)
  } ?: throw WorkspaceAccessException.InvalidPath()

  val basePrefix = (context.filesDir?.parentFile ?: matchedBase).absolutePath.trimEnd('/') + "/"
  val relative = if (target.absolutePath.startsWith(basePrefix)) {
    target.absolutePath.removePrefix(basePrefix)
  } else {
    val canonicalBase = matchedBase.canonicalFile.absolutePath.trimEnd('/') + "/"
    val canonicalTarget = target.canonicalFile.absolutePath
    if (!canonicalTarget.startsWith(canonicalBase)) {
      throw WorkspaceAccessException.InvalidPath()
    }
    canonicalTarget.removePrefix(canonicalBase)
  }

  val parts = relative.split('/').filter { it.isNotEmpty() }
  if (parts.isEmpty() || parts.any { it == "." || it == ".." }) {
    throw WorkspaceAccessException.InvalidPath()
  }
  var cursor = if (target.absolutePath.startsWith(basePrefix)) {
    context.filesDir?.parentFile ?: matchedBase
  } else {
    matchedBase.canonicalFile
  }
  for (part in parts) {
    cursor = File(cursor, part)
    rejectWorkspaceSymlink(cursor)
  }
  return Pair(cursor, parts.joinToString("/"))
}

private fun File.CanonicalOrAbsoluteStartsWith(base: File): Boolean {
  return try {
    val cBase = base.canonicalFile.absolutePath.trimEnd('/') + "/"
    val cThis = this.canonicalFile.absolutePath
    cThis.startsWith(cBase)
  } catch (_: Throwable) {
    false
  }
}
