package md.tolaria.workspaceaccess

import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.nio.file.Files
import java.nio.file.LinkOption
import java.nio.file.attribute.BasicFileAttributes

class WorkspaceFileIndex(
  private val root: File,
  private val publishedRoot: File = root
) {
  fun json(): String {
    val directories = JSONArray()
    val files = JSONArray()
    walkDirectory(root, "", directories, files)
    val index = JSONObject()
    index.put("directories", directories)
    index.put("files", files)
    return index.toString()
  }

  private fun walkDirectory(
    currentDir: File,
    relativePrefix: String,
    directories: JSONArray,
    files: JSONArray
  ) {
    val children = currentDir.listFiles()?.sortedBy { it.name } ?: return
    for (child in children) {
      val name = child.name
      if (name.startsWith(".")) {
        continue
      }
      val childPath = child.toPath()
      if (Files.isSymbolicLink(childPath)) {
        throw WorkspaceAccessException.SymbolicLink()
      }
      val relPath = if (relativePrefix.isEmpty()) name else "$relativePrefix/$name"
      val attrs = Files.readAttributes(childPath, BasicFileAttributes::class.java, LinkOption.NOFOLLOW_LINKS)
      if (attrs.isDirectory) {
        if (name == "node_modules") {
          continue
        }
        directories.put(relPath)
        walkDirectory(child, relPath, directories, files)
      } else if (attrs.isRegularFile) {
        files.put(buildFileRecord(child, relPath, attrs))
      }
    }
  }

  private fun buildFileRecord(
    file: File,
    relPath: String,
    attrs: BasicFileAttributes
  ): JSONObject {
    val content = readTextContentIfSupported(file)
    val contentBytes = content.toByteArray(Charsets.UTF_8)
    val publishedFile = File(publishedRoot, relPath)
    val record = JSONObject()
    record.put("absolutePath", publishedFile.toURI().toString())
    record.put("content", content)
    record.put("contentDigest", sha256Hex(contentBytes))
    val createdMs = attrs.creationTime()?.toMillis()?.toDouble()
    val modifiedMs = attrs.lastModifiedTime()?.toMillis()?.toDouble() ?: file.lastModified().toDouble()
    record.put("createdAt", createdMs ?: JSONObject.NULL)
    record.put("modifiedAt", modifiedMs)
    record.put("relativePath", relPath)
    record.put("size", attrs.size())
    return record
  }

  private fun readTextContentIfSupported(file: File): String {
    val nameLower = file.name.lowercase()
    val extLower = file.extension.lowercase()
    if (!workspaceTextExtensions.contains(extLower) && !workspaceTextFileNames.contains(nameLower)) {
      return ""
    }
    return try {
      file.readText(Charsets.UTF_8)
    } catch (_: Throwable) {
      ""
    }
  }

  companion object {
    private val workspaceTextExtensions = setOf(
      "bash", "bat", "c", "cfg", "clj", "cmd", "conf", "cpp", "css", "csv", "el", "erl",
      "ex", "exs", "fish", "go", "graphql", "h", "hcl", "hpp", "hs", "htm", "html", "ini",
      "java", "jl", "js", "json", "jsx", "kt", "less", "lisp", "lua", "md", "markdown", "mdx",
      "ml", "nix", "properties", "ps1", "py", "r", "rb", "rs", "scss", "sh", "sql", "svelte",
      "swift", "tf", "toml", "ts", "tsx", "txt", "vim", "vue", "xml", "yaml", "yml", "zig", "zsh"
    )

    private val workspaceTextFileNames = setOf(
      ".editorconfig", ".env", ".gitignore", "brewfile", "dockerfile", "makefile"
    )
  }
}
