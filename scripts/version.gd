class_name Version
## Номер версии (sha коммита). Файл version.txt пишет сборка или check.sh.

const PATH := "res://version.txt"


static func sha() -> String:
	if not FileAccess.file_exists(PATH):
		return "dev"
	var text := FileAccess.get_file_as_string(PATH).strip_edges()
	return text if text != "" else "dev"
