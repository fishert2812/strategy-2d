extends Node
## Зонд веб-сборки для tools/web/check_site.sh. Вставляется только при веб-экспорте (tools/web/build.sh).
## Раз в 0,25 с пишет в окно браузера: имя текущей сцены, счётчик кадров и середины кнопок
## (доля от размера экрана), чтобы проверка нажимала кнопку по имени узла, а не по координатам.

var _wait := 0.0


func _process(delta: float) -> void:
	_wait -= delta
	if _wait > 0.0 or not OS.has_feature("web"):
		return
	_wait = 0.25
	var scene := get_tree().current_scene
	var size := get_viewport().get_visible_rect().size
	var nodes := {}
	if scene != null:
		for b in scene.find_children("*", "BaseButton", true, false):
			var c: Vector2 = (b as Control).get_global_rect().get_center()
			nodes[String(b.name)] = [c.x / size.x, c.y / size.y]
	var info := {"scene": String(scene.name) if scene != null else "", "frames": Engine.get_process_frames(), "nodes": nodes}
	JavaScriptBridge.eval("window.godotProbe = %s;" % JSON.stringify(info))
