extends SceneTree
## Запускает все tests/test_*.gd: каждый метод test_* возвращает "" (успех) или текст ошибки.
## Печатает ТЕСТЫ: N прошло, M упало; код выхода 1, если упал хоть один или тестов ноль.


func _initialize() -> void:
	await process_frame
	var passed := 0
	var failed := 0
	var dir := DirAccess.open("res://tests")
	var files := Array(dir.get_files()).filter(func(f): return f.begins_with("test_") and f.ends_with(".gd"))
	files.sort()
	for file in files:
		var script: GDScript = load("res://tests/" + file)
		var suite: Object = script.new()
		for m in suite.get_method_list():
			var name: String = m["name"]
			if not name.begins_with("test_"):
				continue
			var result = await suite.call(name)
			if result is String and result == "":
				passed += 1
				print("  ок    %s.%s" % [file, name])
			else:
				failed += 1
				print("  ПРОВАЛ %s.%s: %s" % [file, name, str(result)])
	print("ТЕСТЫ: %d прошло, %d упало" % [passed, failed])
	quit(1 if failed > 0 or passed == 0 else 0)
