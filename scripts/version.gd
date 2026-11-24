class_name Version
## Версия игры: номер для человека (data/version.json, растёт с каждым видимым изменением,
## список — CHANGELOG.md) и sha коммита (version.txt пишет сборка или check.sh).

const PATH := "res://version.txt"
const NUMBER_PATH := "res://data/version.json"


static func sha() -> String:
	if not FileAccess.file_exists(PATH):
		return "dev"
	var text := FileAccess.get_file_as_string(PATH).strip_edges()
	return text if text != "" else "dev"


static func number() -> String:
	var data = JSON.parse_string(FileAccess.get_file_as_string(NUMBER_PATH))
	return str(data.number) if data is Dictionary and data.has("number") else "?"


## Подпись в углу экрана: «Версия 0.21 · 3f2a9c1».
static func label() -> String:
	return "Версия %s · %s" % [number(), sha()]


## Короткая подпись для шапки боя, где мало места: «0.21 · 3f2a9c1».
static func short() -> String:
	return "%s · %s" % [number(), sha()]
