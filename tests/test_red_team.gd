extends RefCounted
## Красная команда читается на телефоне: ткань ярко-красная, а не бордовая, и не похожа на синюю.


## Доля непрозрачных точек, где ясно горит красный: красный канал ярок и вдвое сильнее зелёного и синего.
static func _red_share(path: String) -> float:
	var img: Image = load(path).get_image()
	if img.is_compressed():
		img.decompress()
	var solid := 0
	var red := 0
	for y in range(0, img.get_height(), 2):
		for x in range(0, img.get_width(), 2):
			var c := img.get_pixel(x, y)
			if c.a < 0.8:
				continue
			solid += 1
			if c.r > 0.45 and c.r > c.g * 1.8 and c.r > c.b * 1.8:
				red += 1
	return float(red) / maxi(solid, 1)


## Игрок с первого взгляда отличает чужих: у каждой красной фигурки и постройки заметная часть ярко-красная,
## заметно больше, чем у её синей пары.
func test_red_team_reads_apart_from_blue() -> String:
	var look: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/look.json"))
	var pairs := []
	for kind in ["warrior", "carrier"]:
		for i in look[kind].frames[0].size():
			pairs.append([look[kind].frames[0][i], look[kind].frames[1][i]])
	for kind in ["home", "camp", "barracks"]:
		pairs.append(look[kind].files)
	for p in pairs:
		var blue := _red_share(look.dir + p[0] + ".png")
		var red := _red_share(look.dir + p[1] + ".png")
		if red < 0.12:
			return "%s: ярко-красного только %d%%, на телефоне не отличить" % [p[1], int(red * 100)]
		if red - blue < 0.08:
			return "%s: красного %d%%, у синей пары %d%%, почти одинаково" % [p[1], int(red * 100), int(blue * 100)]
	return ""
