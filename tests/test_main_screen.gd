extends RefCounted
## Стартовый экран: есть кнопка не меньше 44 пунктов и версия (номер и sha) в углу.

const MAIN := preload("res://scenes/main.tscn")


func _make() -> Control:
	var main: Control = MAIN.instantiate()
	(Engine.get_main_loop() as SceneTree).root.add_child(main)
	return main


func test_button_is_finger_size() -> String:
	var main := _make()
	var button: Button = main.get_node("Safe/Center/Box/Play")
	var need: float = main.MIN_BUTTON
	var got := button.get_combined_minimum_size().y
	main.free()
	if got < need:
		return "кнопка %.0f px, нужно не меньше %.0f" % [got, need]
	return ""


func test_sha_is_shown() -> String:
	var main := _make()
	var text: String = main.get_node("Safe/Sha").text
	main.free()
	if text != Version.label():
		return "в углу «%s», а версия «%s»" % [text, Version.label()]
	if Version.number() == "?" or not text.begins_with("Версия " + Version.number()):
		return "в углу нет номера версии из data/version.json: «%s»" % text
	if not text.ends_with(Version.sha()):
		return "в углу нет sha: «%s»" % text
	return ""
