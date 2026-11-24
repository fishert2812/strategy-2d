extends SceneTree
## Запускает все test_*.gd из папки (по умолчанию res://tests; другая — аргументом -- --dir=res://...).
## Каждый метод test_* возвращает "" (успех) или текст ошибки.
## Файл, который не разбирается, — провал, прогон идёт дальше.
## Печатает ТЕСТЫ: N прошло, M упало; код выхода 1, если упал хоть один или тестов ноль.


func _initialize() -> void:
	await process_frame
	var dir_path := "res://tests"
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--dir="):
			dir_path = arg.trim_prefix("--dir=")
	var passed := 0
	var failed := 0
	var dir := DirAccess.open(dir_path)
	if dir == null:
		print("ТЕСТЫ: нет папки %s" % dir_path)
		quit(1)
		return
	var files := Array(dir.get_files()).filter(func(f): return f.begins_with("test_") and f.ends_with(".gd"))
	files.sort()
	for file in files:
		var script := load(dir_path.path_join(file)) as GDScript
		if script == null or not script.can_instantiate():
			failed += 1
			print("  ПРОВАЛ %s: файл не разбирается" % file)
			continue
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
